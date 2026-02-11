/**
 * Type definitions for the Website Analysis Service.
 */

import type { SecurityHeadersResult } from './security-headers-service';
import type { TechStackResult } from './tech-stack-service';
import type { CrawlabilityResult } from './crawlability-service';
import type { AccessibilityResult } from './accessibility-service';
import type { ResponsiveCheckResult } from './responsive-checker';
import type { BuiltWithResult } from './external-apis/builtwith-service';

export interface WebsiteAnalysisOptions {
  readonly clienteId: string;
  readonly url: string;
  readonly includeScreenshots?: boolean;
  readonly includePageSpeed?: boolean;
  readonly includeSsl?: boolean;
  readonly includeSeo?: boolean;
  readonly includeTechStack?: boolean;
  readonly includeSecurity?: boolean;
  readonly includeAccessibility?: boolean;
  readonly includeCrawlability?: boolean;
  readonly includeResponsive?: boolean;
  readonly includeBuiltWith?: boolean;
  readonly includeServerLocation?: boolean;
  readonly includeWhois?: boolean;
  readonly includeFavicon?: boolean;
}

export interface SslAnalysis {
  readonly valid: boolean;
  readonly protocol?: string;
  readonly issuer?: string;
  readonly expiresAt?: Date;
}

export interface SeoAnalysis {
  readonly title?: string;
  readonly description?: string;
  readonly h1Count?: number;
  readonly hasCanonical?: boolean;
  readonly indexable?: boolean;
  readonly hasOpenGraph?: boolean;
  readonly hasTwitterCards?: boolean;
  readonly hasJsonLd?: boolean;
  readonly jsonLdTypes?: string[];
}

export interface ServerLocationInfo {
  readonly serverIp?: string;
  readonly location?: string;
  readonly country?: string;
  readonly city?: string;
  readonly isp?: string;
  readonly isHosting?: boolean;
  readonly isProxy?: boolean;
}

export interface WhoisInfo {
  readonly registrar?: string;
  readonly createdAt?: Date;
  readonly expiresAt?: Date;
  readonly ageYears?: number;
  readonly daysUntilExpiry?: number;
  readonly owner?: string;
  readonly country?: string;
}

export interface WebsiteAnalysisResult {
  success: boolean;
  url: string;
  screenshotDesktop?: string;
  screenshotMobile?: string;
  performanceScore?: number;
  mobileScore?: number;
  desktopScore?: number;
  fcpMs?: number;
  lcpMs?: number;
  ttiMs?: number;
  cls?: number;
  ssl?: SslAnalysis;
  seo?: SeoAnalysis;
  techStack?: TechStackResult;
  builtWithTech?: BuiltWithResult;
  security?: SecurityHeadersResult;
  accessibility?: AccessibilityResult;
  crawlability?: CrawlabilityResult;
  responsive?: ResponsiveCheckResult;
  serverLocation?: ServerLocationInfo;
  whois?: WhoisInfo;
  faviconUrl?: string;
  errors: string[];
  analysisPerformed: string[];
}
