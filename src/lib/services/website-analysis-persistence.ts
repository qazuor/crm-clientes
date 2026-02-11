/**
 * Database persistence for website analysis results.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { WebsiteAnalysisResult } from './website-analysis-types';

/** Save website analysis results to database. */
export async function saveWebsiteAnalysis(
  clienteId: string,
  result: WebsiteAnalysisResult,
): Promise<void> {
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
      create: { clienteId, ...analysisData },
      update: analysisData,
    });

    // Update the client record with SSL status
    await prisma.cliente.update({
      where: { id: clienteId },
      data: { tieneSSL: result.ssl?.valid },
    });

    logger.info('Website analysis saved', { clienteId, analysisPerformed: result.analysisPerformed });
  } catch (error) {
    logger.error('Failed to save website analysis', error instanceof Error ? error : new Error(String(error)));
  }
}

/** Get existing analysis for a client, with JSON fields parsed. */
export async function getWebsiteAnalysis(clienteId: string) {
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
