import fs from 'fs';
import path from 'path';
import { quotaManager } from './quota-manager';
import { validateUrl, extractDomain } from './url-validator';
import { logger } from './logger';

export interface ScreenshotOptions {
  url: string;
  device: 'desktop' | 'mobile';
  fullPage?: boolean;
  quality?: number;
  delay?: number;
}

export interface ScreenshotResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  error?: string;
  quotaReached?: boolean;
}

const SHOT_API_BASE = 'https://shot.screenshotapi.net/screenshot';
const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR || path.join(process.cwd(), 'public', 'screenshots');

/**
 * Servicio para capturar screenshots usando shot.screenshotapi.net (API gratuita)
 * Límite gratuito: 1000 requests/mes (≈33/día)
 */
export class ScreenshotService {

  /**
   * Captura screenshot de una URL
   */
  static async takeScreenshot(options: ScreenshotOptions): Promise<ScreenshotResult> {
    try {
      // Verificar quota antes de hacer la request
      const quotaCheck = await quotaManager.canMakeRequest('screenshots');
      if (!quotaCheck.allowed) {
        return {
          success: false,
          error: `Quota exceeded: ${quotaCheck.used}/${quotaCheck.limit}. Next reset: ${quotaCheck.resetIn}`,
          quotaReached: true
        };
      }

      // SSRF-protected URL validation
      const urlValidation = validateUrl(options.url);
      if (!urlValidation.valid) {
        logger.warn('Invalid URL rejected', { url: options.url, error: urlValidation.error });
        return {
          success: false,
          error: urlValidation.error || 'URL inválida'
        };
      }

      const safeUrl = urlValidation.normalizedUrl!;

      // Preparar parámetros para la API
      const params = this.buildApiParams({ ...options, url: safeUrl });
      const apiUrl = `${SHOT_API_BASE}?${params.toString()}`;

      logger.info('Capturing screenshot', { url: safeUrl, device: options.device });

      // Crear AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

      // Hacer request a la API
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'image/png,image/jpeg,image/*',
          'User-Agent': 'CRM-Cliente-Enrichment/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Incrementar contador de quota incluso en error (para tracking)
        await quotaManager.incrementUsage('screenshots');

        return {
          success: false,
          error: `API Error: ${response.status} ${response.statusText}`
        };
      }

      // Verificar que la respuesta es una imagen
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        await quotaManager.incrementUsage('screenshots');

        return {
          success: false,
          error: `Unexpected response type: ${contentType}`
        };
      }

      // Obtener la imagen como buffer
      const imageBuffer = await response.arrayBuffer();

      if (imageBuffer.byteLength === 0) {
        await quotaManager.incrementUsage('screenshots');

        return {
          success: false,
          error: 'Respuesta vacía de la API'
        };
      }

      // Guardar la imagen localmente
      const saveResult = await this.saveScreenshot(
        new Uint8Array(imageBuffer),
        safeUrl,
        options.device
      );

      if (!saveResult.success) {
        await quotaManager.incrementUsage('screenshots');
        return saveResult;
      }

      // Incrementar contador de quota (solo en éxito)
      await quotaManager.incrementUsage('screenshots');

      logger.info('Screenshot saved', { fileName: saveResult.fileName, device: options.device });

      return {
        success: true,
        filePath: saveResult.filePath,
        fileName: saveResult.fileName
      };

    } catch (error) {
      logger.error('Screenshot service error', error instanceof Error ? error : new Error(String(error)));

      // En caso de error de red, también incrementamos para tracking
      await quotaManager.incrementUsage('screenshots').catch(() => {});

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Captura screenshot para desktop y mobile de una URL
   */
  static async takeResponsiveScreenshots(url: string): Promise<{
    desktop: ScreenshotResult;
    mobile: ScreenshotResult;
    bothSucceeded: boolean;
  }> {
    logger.info('Capturing responsive screenshots', { url });

    const [desktop, mobile] = await Promise.all([
      this.takeScreenshot({ url, device: 'desktop', fullPage: true }),
      this.takeScreenshot({ url, device: 'mobile', fullPage: true })
    ]);

    return {
      desktop,
      mobile,
      bothSucceeded: desktop.success && mobile.success
    };
  }

  /**
   * Construye parámetros para la API de shot.screenshotapi.net
   */
  private static buildApiParams(options: ScreenshotOptions): URLSearchParams {
    const params = new URLSearchParams();

    // URL obligatoria
    params.append('url', options.url);

    // Configuración por device
    if (options.device === 'desktop') {
      params.append('width', '1920');
      params.append('height', '1080');
      params.append('full_page', options.fullPage ? 'true' : 'false');
    } else {
      // Mobile
      params.append('width', '375');
      params.append('height', '667');
      params.append('full_page', options.fullPage ? 'true' : 'false');
    }

    // Configuraciones opcionales
    params.append('format', 'png');
    params.append('quality', String(options.quality || 80));
    params.append('delay', String(options.delay || 2000)); // 2 segundos delay
    params.append('timeout', '25000'); // 25 segundos timeout

    return params;
  }

  /**
   * Guarda screenshot localmente
   */
  private static async saveScreenshot(
    imageData: Uint8Array,
    url: string,
    device: string
  ): Promise<ScreenshotResult> {
    try {
      // Crear directorio si no existe
      await fs.promises.mkdir(SCREENSHOTS_DIR, { recursive: true });

      // Generar nombre de archivo único
      const domain = extractDomain(url) || `unknown_${Date.now()}`;
      const safeDomain = domain.replace(/[^a-zA-Z0-9.-]/g, '').toLowerCase();
      const timestamp = Date.now();
      const fileName = `${safeDomain}_${device}_${timestamp}.png`;
      const filePath = path.join(SCREENSHOTS_DIR, fileName);

      // Guardar archivo
      await fs.promises.writeFile(filePath, imageData);

      // Verificar que se guardó correctamente
      const stats = await fs.promises.stat(filePath);
      if (stats.size === 0) {
        throw new Error('Archivo guardado está vacío');
      }

      return {
        success: true,
        filePath,
        fileName
      };

    } catch (error) {
      logger.error('Error saving screenshot', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error guardando archivo'
      };
    }
  }

  /**
   * Obtiene información del estado del servicio
   */
  static async getServiceStatus() {
    const quotaInfo = await quotaManager.getServiceStatus('screenshots');

    return {
      serviceName: 'Screenshots',
      provider: 'shot.screenshotapi.net',
      isHealthy: true, // API sin auth key no hay healthcheck
      quota: quotaInfo,
      features: [
        'Desktop screenshots (1920x1080)',
        'Mobile screenshots (375x667)',
        'Full page capture',
        'PNG format',
        'Delay configurable'
      ],
      limitations: [
        'Máximo 33 screenshots por día',
        'No autenticación requerida',
        'Timeout: 25 segundos',
        'Solo sitios públicos'
      ]
    };
  }

  /**
   * Limpia screenshots antiguos (opcional, para mantenimiento)
   */
  static async cleanOldScreenshots(daysOld: number = 30): Promise<{
    deleted: number;
    errors: string[];
  }> {
    const results = { deleted: 0, errors: [] as string[] };

    try {
      const files = await fs.promises.readdir(SCREENSHOTS_DIR);
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

      for (const file of files) {
        if (!file.endsWith('.png')) continue;

        try {
          const filePath = path.join(SCREENSHOTS_DIR, file);
          const stats = await fs.promises.stat(filePath);

          if (stats.mtime.getTime() < cutoffTime) {
            await fs.promises.unlink(filePath);
            results.deleted++;
          }
        } catch (error) {
          results.errors.push(`Error procesando ${file}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      logger.info('Screenshot cleanup completed', { deleted: results.deleted });

    } catch (error) {
      results.errors.push(`Error en directorio: ${error instanceof Error ? error.message : String(error)}`);
    }

    return results;
  }
}

export default ScreenshotService;
