/**
 * Website Analysis Service
 * Orchestrates multiple analysis services to provide comprehensive website analysis
 */

import { ScreenshotService } from '@/lib/screenshot-service';
import { PageSpeedService } from '@/lib/pagespeed-service';
import { UrlVerificationService } from './url-verification-service';
import { SettingsService } from './settings-service';
import { SeoAnalysisService } from './seo-analysis-service';
import { SecurityHeadersService } from './security-headers-service';
import { TechStackService } from './tech-stack-service';
import { CrawlabilityService } from './crawlability-service';
import { AccessibilityService } from './accessibility-service';
import { ResponsiveChecker } from './responsive-checker';
import { BuiltWithService } from './external-apis/builtwith-service';
import { IpApiService } from './external-apis/ipapi-service';
import { WhoisXmlService } from './external-apis/whoisxml-service';
import { FaviconService } from './external-apis/favicon-service';
import { saveWebsiteAnalysis, getWebsiteAnalysis } from './website-analysis-persistence';
export type {
  WebsiteAnalysisOptions,
  WebsiteAnalysisResult,
  SslAnalysis,
  SeoAnalysis,
  ServerLocationInfo,
  WhoisInfo,
} from './website-analysis-types';
import type { WebsiteAnalysisOptions, WebsiteAnalysisResult } from './website-analysis-types';

/**
 * Website Analysis Service
 */
export class WebsiteAnalysisService {
  /**
   * Run full website analysis
   */
  static async analyzeWebsite(options: WebsiteAnalysisOptions): Promise<WebsiteAnalysisResult> {
    const { clienteId, url } = options;
    const errors: string[] = [];
    const analysisPerformed: string[] = [];

    // Get settings to determine what to analyze
    const settings = await SettingsService.getEnrichmentSettings();

    const includeScreenshots = options.includeScreenshots ?? settings.enableScreenshots;
    const includePageSpeed = options.includePageSpeed ?? settings.enablePageSpeed;
    const includeSsl = options.includeSsl ?? settings.enableSsl;
    const includeSeo = options.includeSeo ?? settings.enableSeo;
    const includeTechStack = options.includeTechStack ?? settings.enableTechStack;
    const includeSecurity = options.includeSecurity ?? settings.enableSecurity;
    const includeAccessibility = options.includeAccessibility ?? settings.enableAccessibility;
    const includeCrawlability = options.includeCrawlability ?? settings.enableCrawlability;
    const includeResponsive = options.includeResponsive ?? true; // Default true

    // Verify URL is accessible first
    const urlVerification = await UrlVerificationService.verifyAccessibility(url);
    if (!urlVerification.isAccessible) {
      return {
        success: false,
        url,
        errors: [`URL not accessible: ${urlVerification.error || 'Unknown error'}`],
        analysisPerformed: [],
      };
    }

    const result: WebsiteAnalysisResult = {
      success: true,
      url: urlVerification.url,
      errors: [],
      analysisPerformed: [],
    };

    // Run analyses in parallel where possible
    const analyses: Promise<void>[] = [];

    // Screenshots
    if (includeScreenshots) {
      analyses.push(
        (async () => {
          try {
            const screenshots = await this.captureScreenshots(urlVerification.url, clienteId);
            if (screenshots.desktop) {
              result.screenshotDesktop = screenshots.desktop;
              analysisPerformed.push('screenshot-desktop');
            }
            if (screenshots.mobile) {
              result.screenshotMobile = screenshots.mobile;
              analysisPerformed.push('screenshot-mobile');
            }
            if (screenshots.error) {
              errors.push(`Screenshots: ${screenshots.error}`);
            }
          } catch (err) {
            errors.push(`Screenshots error: ${(err as Error).message}`);
          }
        })()
      );
    }

    // PageSpeed
    if (includePageSpeed) {
      analyses.push(
        (async () => {
          try {
            const pageSpeed = await this.analyzePageSpeed(urlVerification.url);
            if (pageSpeed.success) {
              result.performanceScore = pageSpeed.averageScore;
              result.mobileScore = pageSpeed.mobile?.score;
              result.desktopScore = pageSpeed.desktop?.score;
              result.fcpMs = pageSpeed.mobile?.metrics?.fcp;
              result.lcpMs = pageSpeed.mobile?.metrics?.lcp;
              result.ttiMs = pageSpeed.mobile?.metrics?.ttiMillis;
              result.cls = pageSpeed.mobile?.metrics?.cls;
              analysisPerformed.push('pagespeed');
            } else if (pageSpeed.error) {
              errors.push(`PageSpeed: ${pageSpeed.error}`);
            }
          } catch (err) {
            errors.push(`PageSpeed error: ${(err as Error).message}`);
          }
        })()
      );
    }

    // SSL Analysis (from URL verification)
    if (includeSsl) {
      result.ssl = {
        valid: urlVerification.sslValid ?? false,
        protocol: urlVerification.hasSSL ? 'TLS' : undefined,
      };
      analysisPerformed.push('ssl');
    }

    // SEO Analysis
    if (includeSeo) {
      analyses.push(
        (async () => {
          try {
            const seoResult = await SeoAnalysisService.analyzeUrl(urlVerification.url);
            if (seoResult.success) {
              result.seo = {
                title: seoResult.title,
                description: seoResult.description,
                h1Count: seoResult.h1Count,
                hasCanonical: seoResult.hasCanonical,
                indexable: seoResult.indexable,
                hasOpenGraph: seoResult.hasOpenGraph,
                hasTwitterCards: seoResult.hasTwitterCards,
                hasJsonLd: seoResult.hasJsonLd,
                jsonLdTypes: seoResult.jsonLdTypes,
              };
              analysisPerformed.push('seo');
            } else if (seoResult.error) {
              errors.push(`SEO: ${seoResult.error}`);
            }
          } catch (err) {
            errors.push(`SEO error: ${(err as Error).message}`);
          }
        })()
      );
    }

    // Tech Stack Detection
    if (includeTechStack) {
      analyses.push(
        (async () => {
          try {
            const techResult = await TechStackService.detectTechnologies(urlVerification.url);
            if (techResult.success) {
              result.techStack = techResult;
              analysisPerformed.push('techstack');
            } else if (techResult.error) {
              errors.push(`Tech Stack: ${techResult.error}`);
            }
          } catch (err) {
            errors.push(`Tech Stack error: ${(err as Error).message}`);
          }
        })()
      );
    }

    // Security Headers Analysis
    if (includeSecurity) {
      analyses.push(
        (async () => {
          try {
            const securityResult = await SecurityHeadersService.analyzeUrl(urlVerification.url);
            if (securityResult.success) {
              result.security = securityResult;
              analysisPerformed.push('security');
            } else if (securityResult.error) {
              errors.push(`Security: ${securityResult.error}`);
            }
          } catch (err) {
            errors.push(`Security error: ${(err as Error).message}`);
          }
        })()
      );
    }

    // Accessibility Analysis
    if (includeAccessibility) {
      analyses.push(
        (async () => {
          try {
            const a11yResult = await AccessibilityService.analyzeUrl(urlVerification.url);
            if (a11yResult.success) {
              result.accessibility = a11yResult;
              analysisPerformed.push('accessibility');
            } else if (a11yResult.error) {
              errors.push(`Accessibility: ${a11yResult.error}`);
            }
          } catch (err) {
            errors.push(`Accessibility error: ${(err as Error).message}`);
          }
        })()
      );
    }

    // Crawlability Analysis
    if (includeCrawlability) {
      analyses.push(
        (async () => {
          try {
            const crawlResult = await CrawlabilityService.analyzeUrl(urlVerification.url);
            if (crawlResult.success) {
              result.crawlability = crawlResult;
              analysisPerformed.push('crawlability');
            } else if (crawlResult.error) {
              errors.push(`Crawlability: ${crawlResult.error}`);
            }
          } catch (err) {
            errors.push(`Crawlability error: ${(err as Error).message}`);
          }
        })()
      );
    }

    // Responsive Check
    if (includeResponsive) {
      analyses.push(
        (async () => {
          try {
            const responsiveResult = await ResponsiveChecker.checkUrl(urlVerification.url);
            if (responsiveResult.success) {
              result.responsive = responsiveResult;
              analysisPerformed.push('responsive');
            } else if (responsiveResult.error) {
              errors.push(`Responsive: ${responsiveResult.error}`);
            }
          } catch (err) {
            errors.push(`Responsive error: ${(err as Error).message}`);
          }
        })()
      );
    }

    // BuiltWith Tech Stack (External API)
    const includeBuiltWith = options.includeBuiltWith ?? false; // Opt-in
    if (includeBuiltWith) {
      analyses.push(
        (async () => {
          try {
            const builtWithResult = await BuiltWithService.detectTechnologies(urlVerification.url);
            if (builtWithResult.success) {
              result.builtWithTech = builtWithResult;
              analysisPerformed.push('builtwith');
            } else if (builtWithResult.error) {
              errors.push(`BuiltWith: ${builtWithResult.error}`);
            }
          } catch (err) {
            errors.push(`BuiltWith error: ${(err as Error).message}`);
          }
        })()
      );
    }

    // Server Location (IP-API - FREE, no API key required)
    const includeServerLocation = options.includeServerLocation ?? true; // Default enabled (free)
    if (includeServerLocation) {
      analyses.push(
        (async () => {
          try {
            const serverResult = await IpApiService.getServerLocation(urlVerification.url);
            if (serverResult.success) {
              result.serverLocation = {
                serverIp: serverResult.serverIp,
                location: serverResult.location,
                country: serverResult.country,
                city: serverResult.city,
                isp: serverResult.isp,
                isHosting: serverResult.isHosting,
                isProxy: serverResult.isProxy,
              };
              analysisPerformed.push('server-location');
            } else if (serverResult.error) {
              errors.push(`Server Location: ${serverResult.error}`);
            }
          } catch (err) {
            errors.push(`Server Location error: ${(err as Error).message}`);
          }
        })()
      );
    }

    // Domain WHOIS Info (WhoisXML - needs API key, 500/month free)
    const includeWhois = options.includeWhois ?? false; // Opt-in (needs API key)
    if (includeWhois) {
      analyses.push(
        (async () => {
          try {
            const whoisResult = await WhoisXmlService.lookup(urlVerification.url);
            if (whoisResult.success) {
              result.whois = {
                registrar: whoisResult.registrarName,
                createdAt: whoisResult.createdDate ? new Date(whoisResult.createdDate) : undefined,
                expiresAt: whoisResult.expiresDate ? new Date(whoisResult.expiresDate) : undefined,
                ageYears: whoisResult.domainAgeYears,
                daysUntilExpiry: whoisResult.daysUntilExpiry,
                owner: whoisResult.registrant?.organization || whoisResult.registrant?.name,
                country: whoisResult.registrant?.country,
              };
              analysisPerformed.push('whois');
            } else if (whoisResult.error) {
              errors.push(`WHOIS: ${whoisResult.error}`);
            }
          } catch (err) {
            errors.push(`WHOIS error: ${(err as Error).message}`);
          }
        })()
      );
    }

    // Favicon (FREE, no API key required)
    const includeFavicon = options.includeFavicon ?? true; // Default enabled (free)
    if (includeFavicon) {
      analyses.push(
        (async () => {
          try {
            const faviconResult = await FaviconService.getFavicon(urlVerification.url);
            if (faviconResult.success && faviconResult.url) {
              result.faviconUrl = faviconResult.url;
              analysisPerformed.push('favicon');
            } else if (faviconResult.error) {
              errors.push(`Favicon: ${faviconResult.error}`);
            }
          } catch (err) {
            errors.push(`Favicon error: ${(err as Error).message}`);
          }
        })()
      );
    }

    // Wait for all analyses
    await Promise.all(analyses);

    result.errors = errors;
    result.analysisPerformed = analysisPerformed;
    result.success = errors.length === 0 || analysisPerformed.length > 0;

    // Save to database
    await this.saveAnalysis(clienteId, result);

    return result;
  }

  /**
   * Capture screenshots for a URL
   */
  private static async captureScreenshots(
    url: string,
    clienteId: string
  ): Promise<{ desktop?: string; mobile?: string; error?: string }> {
    try {
      const screenshots = await ScreenshotService.takeResponsiveScreenshots(url, clienteId);

      return {
        desktop: screenshots.desktop.success ? screenshots.desktop.url : undefined,
        mobile: screenshots.mobile.success ? screenshots.mobile.url : undefined,
        error:
          !screenshots.bothSucceeded
            ? `Desktop: ${screenshots.desktop.error || 'OK'}, Mobile: ${screenshots.mobile.error || 'OK'}`
            : undefined,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Analyze PageSpeed for a URL
   */
  private static async analyzePageSpeed(url: string): Promise<{
    success: boolean;
    averageScore?: number;
    mobile?: { score?: number; metrics?: { fcp: number; lcp: number; ttiMillis: number; cls: number } };
    desktop?: { score?: number };
    error?: string;
  }> {
    try {
      const result = await PageSpeedService.analyzeUrlBoth(url);

      if (!result.bothSucceeded) {
        return {
          success: false,
          error: `Mobile: ${result.mobile.error || 'OK'}, Desktop: ${result.desktop.error || 'OK'}`,
        };
      }

      return {
        success: true,
        averageScore: result.averageScore,
        mobile: {
          score: result.mobile.score,
          metrics: result.mobile.metrics,
        },
        desktop: {
          score: result.desktop.score,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /** Save analysis results to database. Delegates to website-analysis-persistence. */
  private static async saveAnalysis(clienteId: string, result: WebsiteAnalysisResult): Promise<void> {
    return saveWebsiteAnalysis(clienteId, result);
  }

  /** Get existing analysis for a client. Delegates to website-analysis-persistence. */
  static async getAnalysis(clienteId: string) {
    return getWebsiteAnalysis(clienteId);
  }

  /**
   * Quick analysis (screenshots only)
   */
  static async quickAnalysis(clienteId: string, url: string): Promise<WebsiteAnalysisResult> {
    return this.analyzeWebsite({
      clienteId,
      url,
      includeScreenshots: true,
      includePageSpeed: false,
      includeSsl: true,
    });
  }
}
