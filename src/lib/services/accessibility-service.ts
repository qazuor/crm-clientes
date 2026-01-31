/**
 * Accessibility Analysis Service
 * Performs basic accessibility checks on a website
 */

import { logger } from '@/lib/logger';

export interface AccessibilityResult {
  success: boolean;
  score?: number;
  issues: AccessibilityIssue[];
  summary: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
  checks: {
    hasLangAttribute?: boolean;
    hasDoctype?: boolean;
    imagesWithAlt?: { total: number; withAlt: number };
    linksWithText?: { total: number; withText: number };
    formLabels?: { total: number; withLabels: number };
    headingHierarchy?: boolean;
    skipLink?: boolean;
    colorContrastEstimate?: string;
  };
  error?: string;
}

export interface AccessibilityIssue {
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  rule: string;
  message: string;
  count?: number;
}

/**
 * Accessibility Service
 */
export class AccessibilityService {
  /**
   * Analyze accessibility of a URL
   */
  static async analyzeUrl(url: string): Promise<AccessibilityResult> {
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
          issues: [],
          summary: { critical: 0, serious: 0, moderate: 0, minor: 0 },
          checks: {},
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const html = await response.text();
      return this.analyzeHtml(html);
    } catch (error) {
      logger.warn('Accessibility analysis failed', {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        issues: [],
        summary: { critical: 0, serious: 0, moderate: 0, minor: 0 },
        checks: {},
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Analyze HTML content for accessibility issues
   */
  private static analyzeHtml(html: string): AccessibilityResult {
    const issues: AccessibilityIssue[] = [];
    const checks: AccessibilityResult['checks'] = {};

    // 1. Check for DOCTYPE
    checks.hasDoctype = /<!doctype\s+html/i.test(html);
    if (!checks.hasDoctype) {
      issues.push({
        severity: 'moderate',
        rule: 'html-has-doctype',
        message: 'Page is missing a DOCTYPE declaration',
      });
    }

    // 2. Check for lang attribute
    const langMatch = html.match(/<html[^>]*lang=["']([^"']+)["']/i);
    checks.hasLangAttribute = !!langMatch;
    if (!checks.hasLangAttribute) {
      issues.push({
        severity: 'serious',
        rule: 'html-has-lang',
        message: 'The <html> element does not have a lang attribute',
      });
    }

    // 3. Check images for alt attributes
    const allImages = html.match(/<img[^>]*>/gi) || [];
    const imagesWithAlt = html.match(/<img[^>]*alt=["'][^"']*["'][^>]*>/gi) || [];
    checks.imagesWithAlt = {
      total: allImages.length,
      withAlt: imagesWithAlt.length,
    };
    const missingAltCount = allImages.length - imagesWithAlt.length;
    if (missingAltCount > 0) {
      issues.push({
        severity: 'critical',
        rule: 'image-alt',
        message: `${missingAltCount} image(s) missing alt attribute`,
        count: missingAltCount,
      });
    }

    // 4. Check links for descriptive text
    const allLinks = html.match(/<a[^>]*>[\s\S]*?<\/a>/gi) || [];
    let linksWithText = 0;
    for (const link of allLinks) {
      // Check if link has text content, aria-label, or title
      const hasText = /<a[^>]*>[\s\S]*[a-zA-Z]+[\s\S]*<\/a>/i.test(link);
      const hasAriaLabel = /aria-label=["'][^"']+["']/i.test(link);
      const hasTitle = /title=["'][^"']+["']/i.test(link);
      if (hasText || hasAriaLabel || hasTitle) {
        linksWithText++;
      }
    }
    checks.linksWithText = {
      total: allLinks.length,
      withText: linksWithText,
    };
    const emptyLinksCount = allLinks.length - linksWithText;
    if (emptyLinksCount > 0) {
      issues.push({
        severity: 'serious',
        rule: 'link-name',
        message: `${emptyLinksCount} link(s) without accessible name`,
        count: emptyLinksCount,
      });
    }

    // 5. Check form inputs for labels
    const inputs = html.match(/<input[^>]*type=["'](?:text|email|password|tel|number|search|url)[^>]*>/gi) || [];
    let inputsWithLabels = 0;
    for (const input of inputs) {
      const hasAriaLabel = /aria-label=["'][^"']+["']/i.test(input);
      const hasAriaLabelledby = /aria-labelledby=["'][^"']+["']/i.test(input);
      const hasPlaceholder = /placeholder=["'][^"']+["']/i.test(input);
      const idMatch = input.match(/id=["']([^"']+)["']/i);
      const hasLabel = idMatch && new RegExp(`<label[^>]*for=["']${idMatch[1]}["']`, 'i').test(html);

      if (hasAriaLabel || hasAriaLabelledby || hasLabel) {
        inputsWithLabels++;
      } else if (hasPlaceholder) {
        // Placeholder alone is not sufficient but better than nothing
        inputsWithLabels += 0.5;
      }
    }
    checks.formLabels = {
      total: inputs.length,
      withLabels: Math.round(inputsWithLabels),
    };
    const unlabeledInputs = Math.round(inputs.length - inputsWithLabels);
    if (unlabeledInputs > 0) {
      issues.push({
        severity: 'critical',
        rule: 'label',
        message: `${unlabeledInputs} form input(s) without proper label`,
        count: unlabeledInputs,
      });
    }

    // 6. Check heading hierarchy
    const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
    if (h1Count === 0) {
      issues.push({
        severity: 'serious',
        rule: 'page-has-heading-one',
        message: 'Page does not have a main heading (h1)',
      });
      checks.headingHierarchy = false;
    } else if (h1Count > 1) {
      issues.push({
        severity: 'moderate',
        rule: 'heading-order',
        message: `Page has ${h1Count} h1 headings (should have only one)`,
      });
      checks.headingHierarchy = false;
    } else {
      checks.headingHierarchy = h1Count === 1;
    }

    // 7. Check for skip link
    const hasSkipLink =
      /<a[^>]*href=["']#(main|content|maincontent)[^"']*["'][^>]*>/i.test(html) ||
      /skip[- ]?to[- ]?(main|content)/i.test(html);
    checks.skipLink = hasSkipLink;
    if (!hasSkipLink) {
      issues.push({
        severity: 'minor',
        rule: 'bypass',
        message: 'Page does not have a skip link for keyboard navigation',
      });
    }

    // 8. Basic color contrast hint (can't fully check without rendering)
    // Check for common low-contrast patterns
    const hasGrayOnWhite =
      /color:\s*#(?:999|aaa|bbb|ccc|ddd|eee|[89a-f]{3})/i.test(html) ||
      /color:\s*rgb\(\s*(?:1[5-9]\d|2[0-5]\d)/i.test(html);
    checks.colorContrastEstimate = hasGrayOnWhite
      ? 'Potential low contrast detected'
      : 'No obvious issues detected';

    // Calculate summary
    const summary = {
      critical: issues.filter((i) => i.severity === 'critical').length,
      serious: issues.filter((i) => i.severity === 'serious').length,
      moderate: issues.filter((i) => i.severity === 'moderate').length,
      minor: issues.filter((i) => i.severity === 'minor').length,
    };

    // Calculate score (0-100)
    const score = Math.max(
      0,
      100 -
        summary.critical * 20 -
        summary.serious * 10 -
        summary.moderate * 5 -
        summary.minor * 2
    );

    return {
      success: true,
      score,
      issues,
      summary,
      checks,
    };
  }
}
