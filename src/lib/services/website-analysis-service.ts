/**
 * Website Analysis Service
 * Orchestrates multiple analysis services to provide comprehensive website analysis
 */

import { prisma } from '@/lib/prisma';
import { ScreenshotService } from '@/lib/screenshot-service';
import { PageSpeedService } from '@/lib/pagespeed-service';
import { UrlVerificationService } from './url-verification-service';
import { SettingsService } from './settings-service';
import { SeoAnalysisService } from './seo-analysis-service';
import { SecurityHeadersService, SecurityHeadersResult } from './security-headers-service';
import { TechStackService, TechStackResult } from './tech-stack-service';
import { CrawlabilityService, CrawlabilityResult } from './crawlability-service';
import { AccessibilityService, AccessibilityResult } from './accessibility-service';
import { ResponsiveChecker, ResponsiveCheckResult } from './responsive-checker';
import { BuiltWithService, BuiltWithResult } from './external-apis/builtwith-service';
// Free API services (no API key required)
import { IpApiService } from './external-apis/ipapi-service';
import { WhoisXmlService } from './external-apis/whoisxml-service';
import { FaviconService } from './external-apis/favicon-service';
import { logger } from '@/lib/logger';

export interface WebsiteAnalysisOptions {
  clienteId: string;
  url: string;
  includeScreenshots?: boolean;
  includePageSpeed?: boolean;
  includeSsl?: boolean;
  includeSeo?: boolean;
  includeTechStack?: boolean;
  includeSecurity?: boolean;
  includeAccessibility?: boolean;
  includeCrawlability?: boolean;
  includeResponsive?: boolean;
  // External API options
  includeBuiltWith?: boolean;
  // Free API services (no API key required)
  includeServerLocation?: boolean;  // IP-API
  includeWhois?: boolean;           // WhoisXML (needs API key)
  includeFavicon?: boolean;         // Favicon grabber
}

export interface SslAnalysis {
  valid: boolean;
  protocol?: string;
  issuer?: string;
  expiresAt?: Date;
}

export interface SeoAnalysis {
  title?: string;
  description?: string;
  h1Count?: number;
  hasCanonical?: boolean;
  indexable?: boolean;
  hasOpenGraph?: boolean;
  hasTwitterCards?: boolean;
  hasJsonLd?: boolean;
  jsonLdTypes?: string[];
}

export interface ServerLocationInfo {
  serverIp?: string;
  location?: string;
  country?: string;
  city?: string;
  isp?: string;
  isHosting?: boolean;
  isProxy?: boolean;
}

export interface WhoisInfo {
  registrar?: string;
  createdAt?: Date;
  expiresAt?: Date;
  ageYears?: number;
  daysUntilExpiry?: number;
  owner?: string;
  country?: string;
}

export interface WebsiteAnalysisResult {
  success: boolean;
  url: string;
  // Screenshots
  screenshotDesktop?: string;
  screenshotMobile?: string;
  // Performance
  performanceScore?: number;
  mobileScore?: number;
  desktopScore?: number;
  fcpMs?: number;
  lcpMs?: number;
  ttiMs?: number;
  cls?: number;
  // SSL
  ssl?: SslAnalysis;
  // SEO
  seo?: SeoAnalysis;
  // Tech Stack (basic detection)
  techStack?: TechStackResult;
  // Tech Stack (BuiltWith API - more detailed)
  builtWithTech?: BuiltWithResult;
  // Security
  security?: SecurityHeadersResult;
  // Accessibility
  accessibility?: AccessibilityResult;
  // Crawlability
  crawlability?: CrawlabilityResult;
  // Responsive
  responsive?: ResponsiveCheckResult;
  // Server Location (IP-API - free)
  serverLocation?: ServerLocationInfo;
  // Domain Info (WhoisXML - needs API key)
  whois?: WhoisInfo;
  // Favicon (free)
  faviconUrl?: string;
  // Errors
  errors: string[];
  // What was analyzed
  analysisPerformed: string[];
}

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
        this.captureScreenshots(urlVerification.url, clienteId)
          .then((screenshots) => {
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
          })
          .catch((err) => {
            errors.push(`Screenshots error: ${err.message}`);
          })
      );
    }

    // PageSpeed
    if (includePageSpeed) {
      analyses.push(
        this.analyzePageSpeed(urlVerification.url)
          .then((pageSpeed) => {
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
          })
          .catch((err) => {
            errors.push(`PageSpeed error: ${err.message}`);
          })
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
        SeoAnalysisService.analyzeUrl(urlVerification.url)
          .then((seoResult) => {
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
          })
          .catch((err) => {
            errors.push(`SEO error: ${err.message}`);
          })
      );
    }

    // Tech Stack Detection
    if (includeTechStack) {
      analyses.push(
        TechStackService.detectTechnologies(urlVerification.url)
          .then((techResult) => {
            if (techResult.success) {
              result.techStack = techResult;
              analysisPerformed.push('techstack');
            } else if (techResult.error) {
              errors.push(`Tech Stack: ${techResult.error}`);
            }
          })
          .catch((err) => {
            errors.push(`Tech Stack error: ${err.message}`);
          })
      );
    }

    // Security Headers Analysis
    if (includeSecurity) {
      analyses.push(
        SecurityHeadersService.analyzeUrl(urlVerification.url)
          .then((securityResult) => {
            if (securityResult.success) {
              result.security = securityResult;
              analysisPerformed.push('security');
            } else if (securityResult.error) {
              errors.push(`Security: ${securityResult.error}`);
            }
          })
          .catch((err) => {
            errors.push(`Security error: ${err.message}`);
          })
      );
    }

    // Accessibility Analysis
    if (includeAccessibility) {
      analyses.push(
        AccessibilityService.analyzeUrl(urlVerification.url)
          .then((a11yResult) => {
            if (a11yResult.success) {
              result.accessibility = a11yResult;
              analysisPerformed.push('accessibility');
            } else if (a11yResult.error) {
              errors.push(`Accessibility: ${a11yResult.error}`);
            }
          })
          .catch((err) => {
            errors.push(`Accessibility error: ${err.message}`);
          })
      );
    }

    // Crawlability Analysis
    if (includeCrawlability) {
      analyses.push(
        CrawlabilityService.analyzeUrl(urlVerification.url)
          .then((crawlResult) => {
            if (crawlResult.success) {
              result.crawlability = crawlResult;
              analysisPerformed.push('crawlability');
            } else if (crawlResult.error) {
              errors.push(`Crawlability: ${crawlResult.error}`);
            }
          })
          .catch((err) => {
            errors.push(`Crawlability error: ${err.message}`);
          })
      );
    }

    // Responsive Check
    if (includeResponsive) {
      analyses.push(
        ResponsiveChecker.checkUrl(urlVerification.url)
          .then((responsiveResult) => {
            if (responsiveResult.success) {
              result.responsive = responsiveResult;
              analysisPerformed.push('responsive');
            } else if (responsiveResult.error) {
              errors.push(`Responsive: ${responsiveResult.error}`);
            }
          })
          .catch((err) => {
            errors.push(`Responsive error: ${err.message}`);
          })
      );
    }

    // BuiltWith Tech Stack (External API)
    const includeBuiltWith = options.includeBuiltWith ?? false; // Opt-in
    if (includeBuiltWith) {
      analyses.push(
        BuiltWithService.detectTechnologies(urlVerification.url)
          .then((builtWithResult) => {
            if (builtWithResult.success) {
              result.builtWithTech = builtWithResult;
              analysisPerformed.push('builtwith');
            } else if (builtWithResult.error) {
              errors.push(`BuiltWith: ${builtWithResult.error}`);
            }
          })
          .catch((err) => {
            errors.push(`BuiltWith error: ${err.message}`);
          })
      );
    }

    // Server Location (IP-API - FREE, no API key required)
    const includeServerLocation = options.includeServerLocation ?? true; // Default enabled (free)
    if (includeServerLocation) {
      analyses.push(
        IpApiService.getServerLocation(urlVerification.url)
          .then((serverResult) => {
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
          })
          .catch((err) => {
            errors.push(`Server Location error: ${err.message}`);
          })
      );
    }

    // Domain WHOIS Info (WhoisXML - needs API key, 500/month free)
    const includeWhois = options.includeWhois ?? false; // Opt-in (needs API key)
    if (includeWhois) {
      analyses.push(
        WhoisXmlService.lookup(urlVerification.url)
          .then((whoisResult) => {
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
          })
          .catch((err) => {
            errors.push(`WHOIS error: ${err.message}`);
          })
      );
    }

    // Favicon (FREE, no API key required)
    const includeFavicon = options.includeFavicon ?? true; // Default enabled (free)
    if (includeFavicon) {
      analyses.push(
        FaviconService.getFavicon(urlVerification.url)
          .then((faviconResult) => {
            if (faviconResult.success && faviconResult.url) {
              result.faviconUrl = faviconResult.url;
              analysisPerformed.push('favicon');
            } else if (faviconResult.error) {
              errors.push(`Favicon: ${faviconResult.error}`);
            }
          })
          .catch((err) => {
            errors.push(`Favicon error: ${err.message}`);
          })
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

  /**
   * Save analysis results to database
   */
  private static async saveAnalysis(clienteId: string, result: WebsiteAnalysisResult): Promise<void> {
    try {
      const analysisData = {
        url: result.url,
        // SSL
        sslValid: result.ssl?.valid ?? null,
        sslProtocol: result.ssl?.protocol ?? null,
        sslIssuer: result.ssl?.issuer ?? null,
        sslExpiresAt: result.ssl?.expiresAt ?? null,
        // Performance
        performanceScore: result.performanceScore ?? null,
        mobileScore: result.mobileScore ?? null,
        desktopScore: result.desktopScore ?? null,
        fcpMs: result.fcpMs ?? null,
        lcpMs: result.lcpMs ?? null,
        ttiMs: result.ttiMs ?? null,
        cls: result.cls ?? null,
        // SEO
        seoTitle: result.seo?.title ?? null,
        seoDescription: result.seo?.description ?? null,
        seoH1Count: result.seo?.h1Count ?? null,
        seoHasCanonical: result.seo?.hasCanonical ?? null,
        seoIndexable: result.seo?.indexable ?? null,
        hasOpenGraph: result.seo?.hasOpenGraph ?? null,
        hasTwitterCards: result.seo?.hasTwitterCards ?? null,
        hasJsonLd: result.seo?.hasJsonLd ?? null,
        jsonLdTypes: result.seo?.jsonLdTypes ? JSON.stringify(result.seo.jsonLdTypes) : null,
        // Tech Stack
        techStack: result.techStack ? JSON.stringify(result.techStack) : null,
        // Security
        hasHttps: result.security?.hasHttps ?? null,
        hstsEnabled: result.security?.hstsEnabled ?? null,
        xFrameOptions: result.security?.xFrameOptions ?? null,
        hasCsp: result.security?.hasCsp ?? null,
        // Accessibility
        accessibilityScore: result.accessibility?.score ?? null,
        accessibilityIssues: result.accessibility?.issues
          ? JSON.stringify(result.accessibility.issues)
          : null,
        // Crawlability
        hasRobotsTxt: result.crawlability?.hasRobotsTxt ?? null,
        robotsAllowsIndex: result.crawlability?.robotsAllowsIndex ?? null,
        hasSitemap: result.crawlability?.hasSitemap ?? null,
        sitemapUrl: result.crawlability?.sitemapUrl ?? null,
        sitemapUrlCount: result.crawlability?.sitemapUrlCount ?? null,
        // Responsive
        hasViewportMeta: result.responsive?.details?.hasViewportMeta ?? null,
        breakpoints: result.responsive?.details?.breakpoints
          ? JSON.stringify(result.responsive.details.breakpoints)
          : null,
        mediaQueriesCount: result.responsive?.details?.mediaQueriesFound ?? null,
        isResponsive: result.responsive?.isResponsive ?? null,
        responsiveConfidence: result.responsive?.confidence ?? null,
        // Server Location (IP-API)
        serverLocation: result.serverLocation?.location ?? null,
        serverIp: result.serverLocation?.serverIp ?? null,
        serverIsp: result.serverLocation?.isp ?? null,
        serverCountry: result.serverLocation?.country ?? null,
        serverCity: result.serverLocation?.city ?? null,
        isHosting: result.serverLocation?.isHosting ?? null,
        // Domain WHOIS
        domainRegistrar: result.whois?.registrar ?? null,
        domainCreatedAt: result.whois?.createdAt ?? null,
        domainExpiresAt: result.whois?.expiresAt ?? null,
        domainAgeYears: result.whois?.ageYears ?? null,
        daysUntilExpiry: result.whois?.daysUntilExpiry ?? null,
        whoisOwner: result.whois?.owner ?? null,
        whoisCountry: result.whois?.country ?? null,
        // Favicon
        faviconUrl: result.faviconUrl ?? null,
        // Screenshots
        screenshotDesktop: result.screenshotDesktop ?? null,
        screenshotMobile: result.screenshotMobile ?? null,
        // Metadata
        apisUsed: JSON.stringify(result.analysisPerformed),
        analyzedAt: new Date(),
      };

      await prisma.websiteAnalysis.upsert({
        where: { clienteId },
        create: {
          clienteId,
          ...analysisData,
        },
        update: analysisData,
      });

      // Update the client record with SSL status
      await prisma.cliente.update({
        where: { id: clienteId },
        data: {
          tieneSSL: result.ssl?.valid,
        },
      });

      logger.info('Website analysis saved', { clienteId, analysisPerformed: result.analysisPerformed });
    } catch (error) {
      logger.error('Failed to save website analysis', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get existing analysis for a client
   */
  static async getAnalysis(clienteId: string) {
    const analysis = await prisma.websiteAnalysis.findUnique({
      where: { clienteId },
    });

    if (!analysis) return null;

    return {
      ...analysis,
      apisUsed: analysis.apisUsed ? JSON.parse(analysis.apisUsed) : [],
      jsonLdTypes: analysis.jsonLdTypes ? JSON.parse(analysis.jsonLdTypes) : [],
      techStack: analysis.techStack ? JSON.parse(analysis.techStack) : null,
      accessibilityIssues: analysis.accessibilityIssues
        ? JSON.parse(analysis.accessibilityIssues)
        : [],
      breakpoints: analysis.breakpoints ? JSON.parse(analysis.breakpoints) : [],
    };
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
