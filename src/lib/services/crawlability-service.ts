/**
 * Crawlability Analysis Service
 * Analyzes robots.txt and sitemap of a website
 */

import { logger } from '@/lib/logger';

export interface CrawlabilityResult {
  success: boolean;
  // Robots.txt
  hasRobotsTxt?: boolean;
  robotsTxtContent?: string;
  robotsAllowsIndex?: boolean;
  robotsDisallowedPaths?: string[];
  robotsCrawlDelay?: number;
  sitemapFromRobots?: string[];
  // Sitemap
  hasSitemap?: boolean;
  sitemapUrl?: string;
  sitemapUrlCount?: number;
  sitemapLastModified?: Date;
  sitemapUrls?: string[]; // First 10 URLs
  // Errors
  error?: string;
}

/**
 * Crawlability Service
 */
export class CrawlabilityService {
  /**
   * Analyze crawlability of a URL
   */
  static async analyzeUrl(url: string): Promise<CrawlabilityResult> {
    const result: CrawlabilityResult = {
      success: true,
    };

    try {
      const baseUrl = new URL(url);
      const origin = baseUrl.origin;

      // Analyze robots.txt
      const robotsResult = await this.analyzeRobotsTxt(origin);
      Object.assign(result, robotsResult);

      // Try to find sitemap
      let sitemapUrl = robotsResult.sitemapFromRobots?.[0];
      if (!sitemapUrl) {
        // Try common sitemap locations
        sitemapUrl = await this.findSitemap(origin);
      }

      if (sitemapUrl) {
        const sitemapResult = await this.analyzeSitemap(sitemapUrl);
        Object.assign(result, sitemapResult);
      }

      return result;
    } catch (error) {
      logger.warn('Crawlability analysis failed', {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Analyze robots.txt
   */
  private static async analyzeRobotsTxt(
    origin: string
  ): Promise<Partial<CrawlabilityResult>> {
    try {
      const robotsUrl = `${origin}/robots.txt`;
      const response = await fetch(robotsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CRM-Bot/1.0)',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return {
          hasRobotsTxt: false,
          robotsAllowsIndex: true, // No robots.txt means everything is allowed
        };
      }

      const content = await response.text();
      const result: Partial<CrawlabilityResult> = {
        hasRobotsTxt: true,
        robotsTxtContent: content.substring(0, 5000), // Limit size
      };

      // Parse robots.txt
      const lines = content.split('\n');
      const disallowedPaths: string[] = [];
      const sitemaps: string[] = [];
      let currentUserAgent = '';
      let allowsIndex = true;

      for (const line of lines) {
        const trimmedLine = line.trim().toLowerCase();

        // Skip comments and empty lines
        if (trimmedLine.startsWith('#') || !trimmedLine) continue;

        // User-agent
        const userAgentMatch = line.match(/^user-agent:\s*(.+)/i);
        if (userAgentMatch) {
          currentUserAgent = userAgentMatch[1].trim();
          continue;
        }

        // Disallow (check for * user-agent or our bot)
        const disallowMatch = line.match(/^disallow:\s*(.+)/i);
        if (
          disallowMatch &&
          (currentUserAgent === '*' || currentUserAgent.toLowerCase().includes('bot'))
        ) {
          const path = disallowMatch[1].trim();
          if (path && path !== '') {
            disallowedPaths.push(path);
            // Check if root is disallowed
            if (path === '/') {
              allowsIndex = false;
            }
          }
        }

        // Crawl-delay
        const crawlDelayMatch = line.match(/^crawl-delay:\s*(\d+)/i);
        if (crawlDelayMatch) {
          result.robotsCrawlDelay = parseInt(crawlDelayMatch[1], 10);
        }

        // Sitemap
        const sitemapMatch = line.match(/^sitemap:\s*(.+)/i);
        if (sitemapMatch) {
          sitemaps.push(sitemapMatch[1].trim());
        }
      }

      result.robotsDisallowedPaths = disallowedPaths.slice(0, 20); // Limit
      result.robotsAllowsIndex = allowsIndex;
      result.sitemapFromRobots = sitemaps;

      return result;
    } catch {
      return {
        hasRobotsTxt: false,
        robotsAllowsIndex: true,
      };
    }
  }

  /**
   * Find sitemap URL
   */
  private static async findSitemap(origin: string): Promise<string | undefined> {
    const commonPaths = [
      '/sitemap.xml',
      '/sitemap_index.xml',
      '/sitemap/',
      '/sitemaps/sitemap.xml',
    ];

    for (const path of commonPaths) {
      try {
        const sitemapUrl = `${origin}${path}`;
        const response = await fetch(sitemapUrl, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CRM-Bot/1.0)',
          },
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('xml') || contentType.includes('text')) {
            return sitemapUrl;
          }
        }
      } catch {
        // Continue to next path
      }
    }

    return undefined;
  }

  /**
   * Analyze sitemap
   */
  private static async analyzeSitemap(
    sitemapUrl: string
  ): Promise<Partial<CrawlabilityResult>> {
    try {
      const response = await fetch(sitemapUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CRM-Bot/1.0)',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        return {
          hasSitemap: false,
        };
      }

      const content = await response.text();
      const result: Partial<CrawlabilityResult> = {
        hasSitemap: true,
        sitemapUrl,
      };

      // Check if it's a sitemap index
      const isSitemapIndex = content.includes('<sitemapindex');

      if (isSitemapIndex) {
        // Count sub-sitemaps
        const sitemapMatches = content.match(/<sitemap>/gi) || [];
        result.sitemapUrlCount = sitemapMatches.length;
      } else {
        // Regular sitemap - count URLs
        const urlMatches = content.match(/<url>/gi) || [];
        result.sitemapUrlCount = urlMatches.length;

        // Extract first 10 URLs
        const urlLocMatches = content.matchAll(/<loc>([^<]+)<\/loc>/gi);
        const urls: string[] = [];
        for (const match of urlLocMatches) {
          if (urls.length >= 10) break;
          urls.push(match[1]);
        }
        result.sitemapUrls = urls;
      }

      // Try to find lastmod
      const lastmodMatch = content.match(/<lastmod>([^<]+)<\/lastmod>/i);
      if (lastmodMatch) {
        const date = new Date(lastmodMatch[1]);
        if (!isNaN(date.getTime())) {
          result.sitemapLastModified = date;
        }
      }

      return result;
    } catch {
      return {
        hasSitemap: false,
      };
    }
  }
}
