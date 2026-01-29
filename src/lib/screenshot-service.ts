import { getBlobUrl } from './blob-storage';
import { logger } from './logger';
import { ThumioService } from './services/external-apis/thumio-service';

export interface ScreenshotOptions {
  url: string;
  device: 'desktop' | 'mobile';
  fullPage?: boolean;
  quality?: number;
  delay?: number;
  clienteId?: string;
}

export interface ScreenshotResult {
  success: boolean;
  url?: string;
  fileName?: string;
  error?: string;
  quotaReached?: boolean;
  provider?: string;
}

/**
 * Screenshot Service
 * Uses Thum.io as primary provider (1,000 free/month, no API key)
 */
export class ScreenshotService {

  /**
   * Captura screenshot de una URL usando Thum.io
   */
  static async takeScreenshot(options: ScreenshotOptions): Promise<ScreenshotResult> {
    logger.info('Capturing screenshot with Thum.io', { url: options.url, device: options.device });

    const result = await ThumioService.takeScreenshot({
      url: options.url,
      device: options.device,
      clienteId: options.clienteId,
    });

    return {
      success: result.success,
      url: result.url,
      fileName: result.fileName,
      error: result.error,
      quotaReached: result.quotaReached,
      provider: result.provider,
    };
  }

  /**
   * Captura screenshot para desktop y mobile de una URL
   */
  static async takeResponsiveScreenshots(url: string, clienteId?: string): Promise<{
    desktop: ScreenshotResult;
    mobile: ScreenshotResult;
    bothSucceeded: boolean;
  }> {
    logger.info('Capturing responsive screenshots with Thum.io', { url });

    const result = await ThumioService.takeResponsiveScreenshots(url, clienteId);

    return {
      desktop: {
        success: result.desktop.success,
        url: result.desktop.url,
        fileName: result.desktop.fileName,
        error: result.desktop.error,
        quotaReached: result.desktop.quotaReached,
        provider: result.desktop.provider,
      },
      mobile: {
        success: result.mobile.success,
        url: result.mobile.url,
        fileName: result.mobile.fileName,
        error: result.mobile.error,
        quotaReached: result.mobile.quotaReached,
        provider: result.mobile.provider,
      },
      bothSucceeded: result.bothSucceeded,
    };
  }

  /**
   * Get direct screenshot URL (for embedding without saving)
   * This uses Thum.io's streaming URL - no quota used
   */
  static getDirectUrl(url: string, device: 'desktop' | 'mobile' = 'desktop'): string {
    return ThumioService.getDirectUrl(url, device);
  }

  /**
   * Obtiene informacion del estado del servicio
   */
  static async getServiceStatus() {
    return ThumioService.getServiceStatus();
  }

  /**
   * Get screenshot URL for display
   */
  static getScreenshotUrl(pathname: string): string {
    return getBlobUrl(pathname);
  }
}

export default ScreenshotService;
