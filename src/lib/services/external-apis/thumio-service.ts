/**
 * Thum.io Screenshot Service
 * Fast, free website screenshot API
 * Free tier: 1,000 impressions/month (no signup required)
 *
 * Documentation: https://www.thum.io/documentation/api
 */

import { logger } from '@/lib/logger';
import { validateUrl, extractDomain } from '@/lib/url-validator';
import { uploadBlob } from '@/lib/blob-storage';
import { quotaManager } from '@/lib/quota-manager';
import { withRetry } from '@/lib/retry';

export interface ThumioOptions {
  url: string;
  device: 'desktop' | 'mobile';
  width?: number;
  height?: number;
  crop?: number;
  maxAge?: number;
  clienteId?: string;
}

export interface ThumioResult {
  success: boolean;
  url?: string;
  fileName?: string;
  error?: string;
  quotaReached?: boolean;
  provider: 'thumio';
}

// Thum.io API base URL
const THUMIO_BASE = 'https://image.thum.io/get';

/**
 * Thum.io Screenshot Service
 * No API key required - completely free
 */
export class ThumioService {
  /**
   * Build Thum.io URL with options
   */
  static buildUrl(options: ThumioOptions): string {
    const parts: string[] = [];

    // Width
    if (options.width) {
      parts.push(`width/${options.width}`);
    } else {
      parts.push(`width/${options.device === 'mobile' ? 375 : 1280}`);
    }

    // Crop height (optional)
    if (options.crop) {
      parts.push(`crop/${options.crop}`);
    }

    // Max age for caching (optional)
    if (options.maxAge) {
      parts.push(`maxAge/${options.maxAge}`);
    }

    // Build the URL
    const optionsPath = parts.length > 0 ? `/${parts.join('/')}/` : '/';
    return `${THUMIO_BASE}${optionsPath}${options.url}`;
  }

  /**
   * Take a screenshot using Thum.io
   */
  static async takeScreenshot(options: ThumioOptions): Promise<ThumioResult> {
    try {
      // Check quota
      const quotaCheck = await quotaManager.canMakeRequest('screenshots');
      if (!quotaCheck.allowed) {
        return {
          success: false,
          error: `Quota exceeded: ${quotaCheck.used}/${quotaCheck.limit}`,
          quotaReached: true,
          provider: 'thumio',
        };
      }

      // Validate URL
      const urlValidation = validateUrl(options.url);
      if (!urlValidation.valid) {
        logger.warn('[Thum.io] Invalid URL rejected', { url: options.url, error: urlValidation.error });
        return {
          success: false,
          error: urlValidation.error || 'URL invalida',
          provider: 'thumio',
        };
      }

      const safeUrl = urlValidation.normalizedUrl!;

      // Build Thum.io URL
      const screenshotUrl = this.buildUrl({ ...options, url: safeUrl });

      logger.debug('[Thum.io] Fetching screenshot', {
        url: safeUrl,
        device: options.device,
        screenshotUrl
      });

      // Fetch the screenshot with retry for transient failures
      const { imageBuffer } = await withRetry(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(screenshotUrl, {
          method: 'GET',
          headers: {
            'Accept': 'image/*',
            'User-Agent': 'CRM-Clientes/1.0',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Thum.io Error: ${response.status} ${response.statusText}`);
        }

        // Verify it's an image
        const ct = response.headers.get('content-type');
        if (!ct || !ct.includes('image')) {
          throw new Error(`Unexpected content type: ${ct}`);
        }

        const buffer = await response.arrayBuffer();
        return { imageBuffer: buffer, contentType: ct };
      }, {
        maxRetries: 2,
        baseDelay: 300,
      });

      // contentType is checked within retry; proceed with imageBuffer

      if (imageBuffer.byteLength === 0) {
        await quotaManager.incrementUsage('screenshots');
        return {
          success: false,
          error: 'Empty response from Thum.io',
          provider: 'thumio',
        };
      }

      // Save to blob storage
      const saveResult = await this.saveScreenshot(
        new Uint8Array(imageBuffer),
        safeUrl,
        options.device,
        options.clienteId
      );

      await quotaManager.incrementUsage('screenshots');

      if (!saveResult.success) {
        return { ...saveResult, provider: 'thumio' };
      }

      logger.info('[Thum.io] Screenshot saved', {
        fileName: saveResult.fileName,
        device: options.device
      });

      return {
        success: true,
        url: saveResult.url,
        fileName: saveResult.fileName,
        provider: 'thumio',
      };

    } catch (error) {
      logger.error('[Thum.io] Screenshot error', error instanceof Error ? error : new Error(String(error)));

      await quotaManager.incrementUsage('screenshots').catch(() => {});

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'thumio',
      };
    }
  }

  /**
   * Take responsive screenshots (desktop + mobile)
   */
  static async takeResponsiveScreenshots(url: string, clienteId?: string): Promise<{
    desktop: ThumioResult;
    mobile: ThumioResult;
    bothSucceeded: boolean;
  }> {
    logger.info('[Thum.io] Capturing responsive screenshots', { url });

    const [desktop, mobile] = await Promise.all([
      this.takeScreenshot({
        url,
        device: 'desktop',
        width: 1280,
        crop: 800, // Crop to reasonable height
        clienteId
      }),
      this.takeScreenshot({
        url,
        device: 'mobile',
        width: 375,
        crop: 667, // Mobile viewport height
        clienteId
      }),
    ]);

    return {
      desktop,
      mobile,
      bothSucceeded: desktop.success && mobile.success,
    };
  }

  /**
   * Get direct screenshot URL (for embedding without saving)
   * This doesn't use quota - Thum.io serves directly
   */
  static getDirectUrl(url: string, device: 'desktop' | 'mobile' = 'desktop'): string {
    const width = device === 'mobile' ? 375 : 1280;
    return `${THUMIO_BASE}/width/${width}/${url}`;
  }

  /**
   * Save screenshot to blob storage
   */
  private static async saveScreenshot(
    imageData: Uint8Array,
    url: string,
    device: string,
    clienteId?: string
  ): Promise<{ success: boolean; url?: string; fileName?: string; error?: string }> {
    try {
      const domain = extractDomain(url) || `unknown_${Date.now()}`;
      const safeDomain = domain.replace(/[^a-zA-Z0-9.-]/g, '').toLowerCase();
      const timestamp = Date.now();
      const fileName = `${safeDomain}_${device}_${timestamp}.png`;

      const uploadResult = await uploadBlob(imageData, fileName, {
        contentType: 'image/png',
        clienteId,
        type: `${device}_screenshot`,
      });

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error || 'Error saving file',
        };
      }

      return {
        success: true,
        url: uploadResult.url,
        fileName,
      };
    } catch (error) {
      logger.error('[Thum.io] Error saving screenshot', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error saving file',
      };
    }
  }

  /**
   * Get service status
   */
  static async getServiceStatus() {
    const quotaInfo = await quotaManager.getServiceStatus('screenshots');

    return {
      serviceName: 'Screenshots (Thum.io)',
      provider: 'thum.io',
      isHealthy: true,
      quota: quotaInfo,
      features: [
        'Desktop screenshots (1280px)',
        'Mobile screenshots (375px)',
        'No API key required',
        'Fast streaming delivery',
        'Automatic caching',
      ],
      limitations: [
        '1,000 screenshots/month free',
        'No full page capture',
        'PNG format only',
        'Public URLs only',
      ],
    };
  }
}
