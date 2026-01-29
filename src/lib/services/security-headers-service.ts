/**
 * Security Headers Analysis Service
 * Analyzes security headers of a website
 */

import { logger } from '@/lib/logger';

export interface SecurityHeadersResult {
  success: boolean;
  // HTTPS
  hasHttps?: boolean;
  // HSTS
  hstsEnabled?: boolean;
  hstsMaxAge?: number;
  hstsIncludeSubdomains?: boolean;
  hstsPreload?: boolean;
  // X-Frame-Options
  xFrameOptions?: string;
  // Content-Security-Policy
  hasCsp?: boolean;
  cspDirectives?: string[];
  // X-Content-Type-Options
  xContentTypeOptions?: string;
  // X-XSS-Protection
  xssProtection?: string;
  // Referrer-Policy
  referrerPolicy?: string;
  // Permissions-Policy
  permissionsPolicy?: string;
  // Overall score (0-100)
  score?: number;
  // Issues found
  issues: string[];
  // Error
  error?: string;
}

/**
 * Security Headers Service
 */
export class SecurityHeadersService {
  /**
   * Analyze security headers of a URL
   */
  static async analyzeUrl(url: string): Promise<SecurityHeadersResult> {
    const issues: string[] = [];

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CRM-Bot/1.0)',
        },
        signal: AbortSignal.timeout(10000),
        redirect: 'follow',
      });

      const headers = response.headers;
      const result: SecurityHeadersResult = {
        success: true,
        issues: [],
      };

      // Check HTTPS
      result.hasHttps = url.startsWith('https://') || response.url.startsWith('https://');
      if (!result.hasHttps) {
        issues.push('Site does not use HTTPS');
      }

      // HSTS
      const hsts = headers.get('strict-transport-security');
      result.hstsEnabled = !!hsts;
      if (hsts) {
        const maxAgeMatch = hsts.match(/max-age=(\d+)/i);
        result.hstsMaxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : undefined;
        result.hstsIncludeSubdomains = hsts.toLowerCase().includes('includesubdomains');
        result.hstsPreload = hsts.toLowerCase().includes('preload');
      } else {
        issues.push('HSTS header missing');
      }

      // X-Frame-Options
      result.xFrameOptions = headers.get('x-frame-options') || undefined;
      if (!result.xFrameOptions) {
        issues.push('X-Frame-Options header missing (clickjacking protection)');
      }

      // Content-Security-Policy
      const csp = headers.get('content-security-policy');
      result.hasCsp = !!csp;
      if (csp) {
        result.cspDirectives = csp.split(';').map((d) => d.trim().split(' ')[0]).filter(Boolean);
      } else {
        issues.push('Content-Security-Policy header missing');
      }

      // X-Content-Type-Options
      result.xContentTypeOptions = headers.get('x-content-type-options') || undefined;
      if (result.xContentTypeOptions !== 'nosniff') {
        issues.push('X-Content-Type-Options should be "nosniff"');
      }

      // X-XSS-Protection (deprecated but still useful)
      result.xssProtection = headers.get('x-xss-protection') || undefined;

      // Referrer-Policy
      result.referrerPolicy = headers.get('referrer-policy') || undefined;
      if (!result.referrerPolicy) {
        issues.push('Referrer-Policy header missing');
      }

      // Permissions-Policy (formerly Feature-Policy)
      result.permissionsPolicy = headers.get('permissions-policy') || headers.get('feature-policy') || undefined;

      // Calculate score
      result.score = this.calculateScore(result);
      result.issues = issues;

      return result;
    } catch (error) {
      logger.warn('Security headers analysis failed', {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        issues: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Calculate security score (0-100)
   */
  private static calculateScore(result: SecurityHeadersResult): number {
    let score = 0;
    const maxScore = 100;

    // HTTPS (25 points)
    if (result.hasHttps) score += 25;

    // HSTS (20 points)
    if (result.hstsEnabled) {
      score += 10;
      if (result.hstsMaxAge && result.hstsMaxAge >= 31536000) score += 5; // 1 year+
      if (result.hstsIncludeSubdomains) score += 3;
      if (result.hstsPreload) score += 2;
    }

    // X-Frame-Options (15 points)
    if (result.xFrameOptions) {
      score += 15;
    }

    // CSP (15 points)
    if (result.hasCsp) {
      score += 15;
    }

    // X-Content-Type-Options (10 points)
    if (result.xContentTypeOptions === 'nosniff') {
      score += 10;
    }

    // Referrer-Policy (10 points)
    if (result.referrerPolicy) {
      score += 10;
    }

    // Permissions-Policy (5 points)
    if (result.permissionsPolicy) {
      score += 5;
    }

    return Math.min(score, maxScore);
  }
}
