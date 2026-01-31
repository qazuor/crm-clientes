/**
 * SEO Analysis Service
 * Analyzes SEO-related aspects of a website
 */

import { logger } from '@/lib/logger';

export interface SeoAnalysisResult {
  success: boolean;
  // Basic SEO
  title?: string;
  description?: string;
  h1Count?: number;
  h2Count?: number;
  hasCanonical?: boolean;
  canonicalUrl?: string;
  indexable?: boolean;
  // Open Graph
  hasOpenGraph?: boolean;
  openGraphData?: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
    url?: string;
  };
  // Twitter Cards
  hasTwitterCards?: boolean;
  twitterCardData?: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
  };
  // Structured Data
  hasJsonLd?: boolean;
  jsonLdTypes?: string[];
  jsonLdData?: Record<string, unknown>[];
  // Additional
  viewportMeta?: boolean;
  charset?: string;
  language?: string;
  // Errors
  error?: string;
}

/**
 * SEO Analysis Service
 */
export class SeoAnalysisService {
  /**
   * Analyze SEO of a URL
   */
  static async analyzeUrl(url: string): Promise<SeoAnalysisResult> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CRM-Bot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const html = await response.text();
      return this.parseHtml(html);
    } catch (error) {
      logger.warn('SEO analysis failed', { url, error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Parse HTML and extract SEO data
   */
  private static parseHtml(html: string): SeoAnalysisResult {
    const result: SeoAnalysisResult = {
      success: true,
    };

    try {
      // Title
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      result.title = titleMatch?.[1]?.trim();

      // Meta description
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
      if (!descMatch) {
        const descMatch2 = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
        result.description = descMatch2?.[1]?.trim();
      } else {
        result.description = descMatch[1]?.trim();
      }

      // H1 count
      const h1Matches = html.match(/<h1[^>]*>/gi) || [];
      result.h1Count = h1Matches.length;

      // H2 count
      const h2Matches = html.match(/<h2[^>]*>/gi) || [];
      result.h2Count = h2Matches.length;

      // Canonical
      const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
      if (!canonicalMatch) {
        const canonicalMatch2 = html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
        result.canonicalUrl = canonicalMatch2?.[1];
      } else {
        result.canonicalUrl = canonicalMatch[1];
      }
      result.hasCanonical = !!result.canonicalUrl;

      // Indexable (check for noindex)
      const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i);
      const robotsContent = robotsMatch?.[1]?.toLowerCase() || '';
      result.indexable = !robotsContent.includes('noindex');

      // Open Graph
      result.hasOpenGraph = /<meta[^>]*property=["']og:/i.test(html);
      if (result.hasOpenGraph) {
        result.openGraphData = {
          title: this.extractMetaProperty(html, 'og:title'),
          description: this.extractMetaProperty(html, 'og:description'),
          image: this.extractMetaProperty(html, 'og:image'),
          type: this.extractMetaProperty(html, 'og:type'),
          url: this.extractMetaProperty(html, 'og:url'),
        };
      }

      // Twitter Cards
      result.hasTwitterCards = /<meta[^>]*name=["']twitter:/i.test(html);
      if (result.hasTwitterCards) {
        result.twitterCardData = {
          card: this.extractMetaName(html, 'twitter:card'),
          title: this.extractMetaName(html, 'twitter:title'),
          description: this.extractMetaName(html, 'twitter:description'),
          image: this.extractMetaName(html, 'twitter:image'),
        };
      }

      // JSON-LD
      const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([^<]*)<\/script>/gi);
      const jsonLdData: Record<string, unknown>[] = [];
      const jsonLdTypes: string[] = [];

      for (const match of jsonLdMatches) {
        try {
          const data = JSON.parse(match[1]);
          jsonLdData.push(data);
          if (data['@type']) {
            const types = Array.isArray(data['@type']) ? data['@type'] : [data['@type']];
            jsonLdTypes.push(...types);
          }
        } catch {
          // Invalid JSON, skip
        }
      }

      result.hasJsonLd = jsonLdData.length > 0;
      result.jsonLdTypes = jsonLdTypes;
      result.jsonLdData = jsonLdData;

      // Viewport meta
      result.viewportMeta = /<meta[^>]*name=["']viewport["']/i.test(html);

      // Charset
      const charsetMatch = html.match(/<meta[^>]*charset=["']?([^"'\s>]+)/i);
      result.charset = charsetMatch?.[1];

      // Language
      const langMatch = html.match(/<html[^>]*lang=["']([^"']*)["']/i);
      result.language = langMatch?.[1];

      return result;
    } catch (error) {
      logger.warn('HTML parsing error', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: 'Failed to parse HTML',
      };
    }
  }

  /**
   * Extract Open Graph meta property
   */
  private static extractMetaProperty(html: string, property: string): string | undefined {
    const regex1 = new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
    const regex2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i');

    const match1 = html.match(regex1);
    if (match1) return match1[1];

    const match2 = html.match(regex2);
    return match2?.[1];
  }

  /**
   * Extract meta name content
   */
  private static extractMetaName(html: string, name: string): string | undefined {
    const regex1 = new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
    const regex2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`, 'i');

    const match1 = html.match(regex1);
    if (match1) return match1[1];

    const match2 = html.match(regex2);
    return match2?.[1];
  }
}
