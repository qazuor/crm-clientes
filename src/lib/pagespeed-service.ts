import { quotaManager } from './quota-manager';
import { validateUrl } from './url-validator';
import { logger } from './logger';
import { CircuitBreaker } from './circuit-breaker';
import { withRetry } from './retry';

// Circuit breaker for PageSpeed API
const pageSpeedCircuitBreaker = new CircuitBreaker({
  name: 'pagespeed',
  failureThreshold: 5,
  resetTimeout: 60000,
  successThreshold: 2,
});

export interface PageSpeedMetrics {
  score: number;
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  speedIndex: number;
  ttiMillis: number; // Time to Interactive
}

export interface PageSpeedResult {
  success: boolean;
  url: string;
  strategy: 'mobile' | 'desktop';
  score?: number;
  metrics?: PageSpeedMetrics;
  opportunities?: Array<{
    id: string;
    title: string;
    description: string;
    score: number;
    displayValue: string;
  }>;
  diagnostics?: Array<{
    id: string;
    title: string;
    description: string;
    score: number;
    displayValue: string;
  }>;
  error?: string;
  quotaReached?: boolean;
}

const PAGESPEED_API_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

/**
 * Servicio para analizar performance con Google PageSpeed Insights
 * Límite gratuito: 25,000 requests/día (≈800/día para nuestro uso)
 */
export class PageSpeedService {

  /**
   * Analiza una URL con PageSpeed Insights
   */
  static async analyzeUrl(url: string, strategy: 'mobile' | 'desktop' = 'mobile'): Promise<PageSpeedResult> {
    try {
      // Verificar quota
      const quotaCheck = await quotaManager.canMakeRequest('pagespeed');
      if (!quotaCheck.allowed) {
        return {
          success: false,
          url,
          strategy,
          error: `Quota exceeded: ${quotaCheck.used}/${quotaCheck.limit}. Next reset: ${quotaCheck.resetIn}`,
          quotaReached: true
        };
      }

      // SSRF-protected URL validation
      const urlValidation = validateUrl(url);
      if (!urlValidation.valid) {
        logger.warn('Invalid URL rejected for PageSpeed', { url, error: urlValidation.error });
        return {
          success: false,
          url,
          strategy,
          error: urlValidation.error || 'URL inválida'
        };
      }

      const safeUrl = urlValidation.normalizedUrl!;

      // Construir URL de la API
      const apiUrl = this.buildApiUrl(safeUrl, strategy);

      logger.info('Analyzing PageSpeed', { url: safeUrl, strategy });

      // Use circuit breaker + retry for the external API call
      const data = await pageSpeedCircuitBreaker.execute(() =>
        withRetry(async () => {
          // Crear AbortController para timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos

          // Hacer request a la API
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'CRM-Cliente-Enrichment/1.0'
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
          }

          return response.json();
        }, {
          maxRetries: 2,
          baseDelay: 500,
        })
      );

      // Procesar resultados
      const result = this.processPageSpeedData(data, safeUrl, strategy);

      // Incrementar quota solo en éxito
      await quotaManager.incrementUsage('pagespeed');

      logger.info('PageSpeed analyzed', { url: safeUrl, strategy, score: result.score });

      return result;

    } catch (error) {
      logger.error('PageSpeed service error', error instanceof Error ? error : new Error(String(error)));

      // En caso de error también incrementamos para tracking
      await quotaManager.incrementUsage('pagespeed').catch(() => {});

      return {
        success: false,
        url,
        strategy,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Analiza una URL tanto en mobile como desktop
   */
  static async analyzeUrlBoth(url: string): Promise<{
    mobile: PageSpeedResult;
    desktop: PageSpeedResult;
    bothSucceeded: boolean;
    averageScore?: number;
  }> {
    logger.info('Analyzing PageSpeed responsive', { url });

    const [mobile, desktop] = await Promise.all([
      this.analyzeUrl(url, 'mobile'),
      this.analyzeUrl(url, 'desktop')
    ]);

    const bothSucceeded = mobile.success && desktop.success;
    let averageScore: number | undefined;

    if (bothSucceeded && mobile.score !== undefined && desktop.score !== undefined) {
      averageScore = Math.round((mobile.score + desktop.score) / 2);
    }

    return {
      mobile,
      desktop,
      bothSucceeded,
      averageScore
    };
  }

  /**
   * Construye URL para la API de PageSpeed
   */
  private static buildApiUrl(url: string, strategy: 'mobile' | 'desktop'): string {
    const params = new URLSearchParams({
      url: url,
      strategy: strategy,
      category: 'PERFORMANCE',
      locale: 'es'
    });

    return `${PAGESPEED_API_BASE}?${params.toString()}`;
  }

  /**
   * Procesa la respuesta de PageSpeed Insights
   */
  private static processPageSpeedData(data: Record<string, unknown>, url: string, strategy: 'mobile' | 'desktop'): PageSpeedResult {
    try {
      const lighthouse = data.lighthouseResult as Record<string, unknown> | undefined;
      const categories = lighthouse?.categories as Record<string, { score?: number }> | undefined;
      const performanceScore = categories?.performance?.score;
      const audits = (lighthouse?.audits || {}) as Record<string, {
        numericValue?: number;
        rawValue?: number;
        score?: number;
        title?: string;
        description?: string;
        displayValue?: string;
      }>;

      // Score (0-1 convertir a 0-100)
      const score = performanceScore ? Math.round(performanceScore * 100) : 0;

      // Core Web Vitals
      const metrics: PageSpeedMetrics = {
        score,
        fcp: this.extractMetricValue(audits['first-contentful-paint']) || 0,
        lcp: this.extractMetricValue(audits['largest-contentful-paint']) || 0,
        fid: this.extractMetricValue(audits['first-input-delay']) || 0,
        cls: this.extractMetricValue(audits['cumulative-layout-shift']) || 0,
        speedIndex: this.extractMetricValue(audits['speed-index']) || 0,
        ttiMillis: this.extractMetricValue(audits['interactive']) || 0
      };

      // Opportunities (sugerencias para mejorar)
      const opportunities: Array<{
        id: string;
        title: string;
        description: string;
        score: number;
        displayValue: string;
      }> = [];

      const loadingExperience = data.loadingExperience as { opportunities?: Array<{
        id?: string;
        title?: string;
        description?: string;
        score?: number;
        displayValue?: string;
      }> } | undefined;

      if (loadingExperience?.opportunities) {
        loadingExperience.opportunities.forEach((opp) => {
          opportunities.push({
            id: opp.id || 'unknown',
            title: opp.title || '',
            description: opp.description || '',
            score: opp.score || 0,
            displayValue: opp.displayValue || ''
          });
        });
      }

      // Diagnostics
      const diagnostics: Array<{
        id: string;
        title: string;
        description: string;
        score: number;
        displayValue: string;
      }> = [];

      // Extraer algunos audits importantes como diagnostics
      const importantAudits = [
        'largest-contentful-paint',
        'cumulative-layout-shift',
        'first-contentful-paint',
        'speed-index',
        'interactive'
      ];

      importantAudits.forEach(auditId => {
        const audit = audits[auditId];
        if (audit) {
          diagnostics.push({
            id: auditId,
            title: audit.title || auditId,
            description: audit.description || '',
            score: audit.score || 0,
            displayValue: audit.displayValue || ''
          });
        }
      });

      return {
        success: true,
        url,
        strategy,
        score,
        metrics,
        opportunities: opportunities.slice(0, 5), // Top 5
        diagnostics: diagnostics.slice(0, 5) // Top 5
      };

    } catch (error) {
      logger.error('Error processing PageSpeed data', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        url,
        strategy,
        error: 'Error procesando respuesta de la API'
      };
    }
  }

  /**
   * Extrae valor numérico de una métrica de Lighthouse
   */
  private static extractMetricValue(audit: { numericValue?: number; rawValue?: number; score?: number } | undefined): number | undefined {
    if (!audit) return undefined;

    if (audit.numericValue !== undefined) {
      return audit.numericValue;
    }

    if (audit.rawValue !== undefined) {
      return audit.rawValue;
    }

    if (audit.score !== undefined) {
      return audit.score;
    }

    return undefined;
  }

  /**
   * Obtiene información del estado del servicio
   */
  static async getServiceStatus() {
    const quotaInfo = await quotaManager.getServiceStatus('pagespeed');

    return {
      serviceName: 'PageSpeed Insights',
      provider: 'Google',
      isHealthy: true,
      quota: quotaInfo,
      features: [
        'Performance score (0-100)',
        'Core Web Vitals (FCP, LCP, FID, CLS)',
        'Speed Index analysis',
        'Time to Interactive',
        'Mobile y Desktop analysis',
        'Optimización sugerencias'
      ],
      limitations: [
        'Máximo 800 análisis por día',
        'No API key requerida',
        'Timeout: 60 segundos',
        'Solo sitios públicos',
        'Rate limiting por Google'
      ]
    };
  }

  /**
   * Interpreta el score de PageSpeed
   */
  static interpretScore(score: number): {
    category: 'poor' | 'needs-improvement' | 'good';
    label: string;
    color: string;
    emoji: string;
    description: string;
  } {
    if (score >= 90) {
      return {
        category: 'good',
        label: 'Excelente',
        color: 'green',
        emoji: '🟢',
        description: 'El sitio tiene una excelente performance'
      };
    } else if (score >= 70) {
      return {
        category: 'needs-improvement',
        label: 'Bueno',
        color: 'orange',
        emoji: '🟡',
        description: 'El sitio tiene buena performance pero puede mejorar'
      };
    } else if (score >= 50) {
      return {
        category: 'needs-improvement',
        label: 'Necesita mejorar',
        color: 'orange',
        emoji: '🟠',
        description: 'El sitio necesita optimizaciones de performance'
      };
    } else {
      return {
        category: 'poor',
        label: 'Pobre',
        color: 'red',
        emoji: '🔴',
        description: 'El sitio tiene problemas serios de performance'
      };
    }
  }

  /**
   * Formatear métricas para display
   */
  static formatMetrics(metrics: PageSpeedMetrics): {
    [key: string]: { value: string; label: string; unit: string; };
  } {
    return {
      fcp: {
        value: (metrics.fcp / 1000).toFixed(1),
        label: 'First Contentful Paint',
        unit: 's'
      },
      lcp: {
        value: (metrics.lcp / 1000).toFixed(1),
        label: 'Largest Contentful Paint',
        unit: 's'
      },
      fid: {
        value: metrics.fid.toFixed(1),
        label: 'First Input Delay',
        unit: 'ms'
      },
      cls: {
        value: metrics.cls.toFixed(3),
        label: 'Cumulative Layout Shift',
        unit: ''
      },
      speedIndex: {
        value: (metrics.speedIndex / 1000).toFixed(1),
        label: 'Speed Index',
        unit: 's'
      },
      tti: {
        value: (metrics.ttiMillis / 1000).toFixed(1),
        label: 'Time to Interactive',
        unit: 's'
      }
    };
  }
}

export default PageSpeedService;
