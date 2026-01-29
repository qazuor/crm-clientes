/**
 * Favicon Service
 * Fetches favicons from websites
 * Completely FREE - no API key required
 *
 * We use multiple methods to get favicons:
 * 1. Direct /favicon.ico request
 * 2. Google's favicon service (reliable fallback)
 * 3. DuckDuckGo's favicon service (another fallback)
 */

import { logger } from '@/lib/logger';

export interface FaviconResult {
  success: boolean;
  url?: string;
  source?: 'direct' | 'google' | 'duckduckgo';
  error?: string;
}

export interface FaviconOptions {
  size?: number; // For Google service: 16, 32, 64, etc.
  preferHighRes?: boolean;
}

/**
 * Favicon Service - no API key required
 */
export class FaviconService {
  /**
   * Get favicon URL for a domain
   * Returns the most reliable source
   */
  static async getFavicon(
    domain: string,
    options: FaviconOptions = {}
  ): Promise<FaviconResult> {
    try {
      const cleanDomain = this.extractDomain(domain);
      const size = options.size || 32;

      logger.debug('[Favicon] Getting favicon', { domain: cleanDomain, size });

      // Try direct favicon first (fastest if available)
      const directUrl = `https://${cleanDomain}/favicon.ico`;
      const directResult = await this.checkUrl(directUrl);

      if (directResult.exists) {
        logger.debug('[Favicon] Found direct favicon', { domain: cleanDomain });
        return {
          success: true,
          url: directUrl,
          source: 'direct',
        };
      }

      // Fallback to Google's service (very reliable)
      const googleUrl = this.getGoogleFaviconUrl(cleanDomain, size);
      // Google always returns something, so we use it as fallback
      logger.debug('[Favicon] Using Google favicon service', { domain: cleanDomain });
      return {
        success: true,
        url: googleUrl,
        source: 'google',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[Favicon] Error getting favicon', error instanceof Error ? error : new Error(message));
      return { success: false, error: message };
    }
  }

  /**
   * Get all possible favicon URLs for a domain
   * Useful when you want to try multiple sources
   */
  static getFaviconUrls(domain: string, size: number = 32): {
    direct: string;
    google: string;
    duckduckgo: string;
  } {
    const cleanDomain = this.extractDomain(domain);

    return {
      direct: `https://${cleanDomain}/favicon.ico`,
      google: this.getGoogleFaviconUrl(cleanDomain, size),
      duckduckgo: this.getDuckDuckGoFaviconUrl(cleanDomain),
    };
  }

  /**
   * Get favicon using Google's favicon service
   * This is very reliable and works for most domains
   */
  static getGoogleFaviconUrl(domain: string, size: number = 32): string {
    const cleanDomain = this.extractDomain(domain);
    // Google's favicon service
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleanDomain)}&sz=${size}`;
  }

  /**
   * Get favicon using DuckDuckGo's service
   * Alternative fallback
   */
  static getDuckDuckGoFaviconUrl(domain: string): string {
    const cleanDomain = this.extractDomain(domain);
    return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(cleanDomain)}.ico`;
  }

  /**
   * Check multiple sizes and return the best one
   */
  static async getBestFavicon(domain: string): Promise<FaviconResult> {
    const cleanDomain = this.extractDomain(domain);

    // Try to find the best quality favicon
    const sizes = [64, 32, 16];

    for (const size of sizes) {
      const googleUrl = this.getGoogleFaviconUrl(cleanDomain, size);
      const exists = await this.checkUrl(googleUrl);

      if (exists.exists && exists.contentLength && exists.contentLength > 100) {
        return {
          success: true,
          url: googleUrl,
          source: 'google',
        };
      }
    }

    // Default to 32px Google favicon
    return {
      success: true,
      url: this.getGoogleFaviconUrl(cleanDomain, 32),
      source: 'google',
    };
  }

  /**
   * Get favicon as base64 data URL
   * Useful for embedding directly in HTML/React
   */
  static async getFaviconAsDataUrl(domain: string): Promise<{
    success: boolean;
    dataUrl?: string;
    error?: string;
  }> {
    try {
      const result = await this.getFavicon(domain);

      if (!result.success || !result.url) {
        return { success: false, error: result.error };
      }

      const response = await fetch(result.url);
      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const contentType = response.headers.get('content-type') || 'image/x-icon';

      return {
        success: true,
        dataUrl: `data:${contentType};base64,${base64}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Check if a URL exists and returns an image
   */
  private static async checkUrl(url: string): Promise<{
    exists: boolean;
    contentLength?: number;
    contentType?: string;
  }> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        return { exists: false };
      }

      const contentType = response.headers.get('content-type') || '';
      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);

      // Check if it's actually an image
      const isImage = contentType.includes('image') ||
        contentType.includes('icon') ||
        url.endsWith('.ico') ||
        url.endsWith('.png');

      return {
        exists: isImage && contentLength > 0,
        contentLength,
        contentType,
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Extract domain from URL
   */
  private static extractDomain(input: string): string {
    try {
      // If it looks like a URL, extract the hostname
      if (input.includes('://') || input.includes('/')) {
        const url = input.startsWith('http') ? input : `https://${input}`;
        return new URL(url).hostname;
      }
      // Remove any path or query string
      return input.split('/')[0].split('?')[0];
    } catch {
      return input;
    }
  }
}
