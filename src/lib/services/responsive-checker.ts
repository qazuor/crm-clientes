/**
 * Responsive Checker Service
 * Dual method for detecting if a website is responsive:
 * 1. Media Queries Detection - Checks CSS for responsive breakpoints
 * 2. Layout Analysis - Compares viewport meta and structural indicators
 */

import { logger } from '@/lib/logger';

export interface ResponsiveCheckResult {
  success: boolean;
  isResponsive: boolean;
  confidence: 'high' | 'medium' | 'low';
  methods: {
    viewportMeta: boolean;
    mediaQueries: boolean;
    mobileOptimized: boolean;
  };
  details: {
    hasViewportMeta: boolean;
    viewportContent?: string;
    mediaQueriesFound: number;
    breakpoints: string[];
    hasMobileStyles: boolean;
    hasFlexOrGrid: boolean;
    hasResponsiveImages: boolean;
    hasResponsiveUnits: boolean;
  };
  error?: string;
}

// Common responsive breakpoints to look for
const COMMON_BREAKPOINTS = [
  '320px', '375px', '414px', '480px', // Mobile
  '576px', '600px', '640px', // Small tablets
  '768px', '800px', '834px', // Tablets
  '992px', '1024px', // Large tablets / small desktop
  '1200px', '1280px', '1366px', '1440px', // Desktop
  '1920px', // Large desktop
];

/**
 * Responsive Checker Service
 */
export class ResponsiveChecker {
  /**
   * Check if a URL is responsive using dual methods
   */
  static async checkUrl(url: string): Promise<ResponsiveCheckResult> {
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
          isResponsive: false,
          confidence: 'low',
          methods: { viewportMeta: false, mediaQueries: false, mobileOptimized: false },
          details: {
            hasViewportMeta: false,
            mediaQueriesFound: 0,
            breakpoints: [],
            hasMobileStyles: false,
            hasFlexOrGrid: false,
            hasResponsiveImages: false,
            hasResponsiveUnits: false,
          },
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const html = await response.text();
      return this.analyzeHtml(html);
    } catch (error) {
      logger.warn('Responsive check failed', {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        isResponsive: false,
        confidence: 'low',
        methods: { viewportMeta: false, mediaQueries: false, mobileOptimized: false },
        details: {
          hasViewportMeta: false,
          mediaQueriesFound: 0,
          breakpoints: [],
          hasMobileStyles: false,
          hasFlexOrGrid: false,
          hasResponsiveImages: false,
          hasResponsiveUnits: false,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Analyze HTML content for responsive indicators
   */
  private static analyzeHtml(html: string): ResponsiveCheckResult {
    const details: ResponsiveCheckResult['details'] = {
      hasViewportMeta: false,
      mediaQueriesFound: 0,
      breakpoints: [],
      hasMobileStyles: false,
      hasFlexOrGrid: false,
      hasResponsiveImages: false,
      hasResponsiveUnits: false,
    };

    // Method 1: Check for viewport meta tag
    const viewportMatch = html.match(/<meta[^>]*name=["']viewport["'][^>]*content=["']([^"']*)["']/i);
    if (!viewportMatch) {
      const viewportMatch2 = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']viewport["']/i);
      if (viewportMatch2) {
        details.hasViewportMeta = true;
        details.viewportContent = viewportMatch2[1];
      }
    } else {
      details.hasViewportMeta = true;
      details.viewportContent = viewportMatch[1];
    }

    // Check if viewport is properly configured for mobile
    const viewportMobileOptimized = details.viewportContent
      ? details.viewportContent.includes('width=device-width') ||
        details.viewportContent.includes('initial-scale')
      : false;

    // Method 2: Check for media queries in inline styles and style tags
    const styleContent = this.extractStyles(html);
    const mediaQueryAnalysis = this.analyzeMediaQueries(styleContent);

    details.mediaQueriesFound = mediaQueryAnalysis.count;
    details.breakpoints = mediaQueryAnalysis.breakpoints;
    details.hasMobileStyles = mediaQueryAnalysis.hasMobileStyles;

    // Additional responsive indicators
    details.hasFlexOrGrid = this.hasFlexOrGrid(html, styleContent);
    details.hasResponsiveImages = this.hasResponsiveImages(html);
    details.hasResponsiveUnits = this.hasResponsiveUnits(styleContent);

    // Calculate overall responsiveness
    const methods = {
      viewportMeta: details.hasViewportMeta && viewportMobileOptimized,
      mediaQueries: details.mediaQueriesFound >= 3,
      mobileOptimized: details.hasMobileStyles || details.hasFlexOrGrid,
    };

    // Determine if responsive and confidence level
    const positiveSignals = [
      methods.viewportMeta,
      methods.mediaQueries,
      methods.mobileOptimized,
      details.hasResponsiveImages,
      details.hasResponsiveUnits,
    ].filter(Boolean).length;

    let isResponsive = false;
    let confidence: 'high' | 'medium' | 'low' = 'low';

    if (positiveSignals >= 4) {
      isResponsive = true;
      confidence = 'high';
    } else if (positiveSignals >= 2) {
      isResponsive = true;
      confidence = 'medium';
    } else if (positiveSignals >= 1 && methods.viewportMeta) {
      isResponsive = true;
      confidence = 'low';
    }

    return {
      success: true,
      isResponsive,
      confidence,
      methods,
      details,
    };
  }

  /**
   * Extract all style content from HTML
   */
  private static extractStyles(html: string): string {
    const styles: string[] = [];

    // Extract inline style tags
    const styleMatches = html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    for (const match of styleMatches) {
      styles.push(match[1]);
    }

    // Extract inline styles from elements
    const inlineStyles = html.matchAll(/style=["']([^"']*)["']/gi);
    for (const match of inlineStyles) {
      styles.push(match[1]);
    }

    return styles.join('\n');
  }

  /**
   * Analyze media queries in CSS
   */
  private static analyzeMediaQueries(css: string): {
    count: number;
    breakpoints: string[];
    hasMobileStyles: boolean;
  } {
    const breakpoints: Set<string> = new Set();
    let count = 0;
    let hasMobileStyles = false;

    // Find all @media rules
    const mediaMatches = css.matchAll(/@media[^{]*\{/gi);
    for (const match of mediaMatches) {
      count++;
      const mediaRule = match[0];

      // Extract breakpoint values
      const widthMatches = mediaRule.matchAll(/(?:max|min)-width:\s*(\d+(?:px|em|rem))/gi);
      for (const widthMatch of widthMatches) {
        const value = widthMatch[1].toLowerCase();
        breakpoints.add(value);

        // Check for mobile-specific breakpoints (under 768px)
        const numericValue = parseInt(value, 10);
        if (numericValue <= 768) {
          hasMobileStyles = true;
        }
      }
    }

    // Also check for common breakpoint patterns in class names
    for (const bp of COMMON_BREAKPOINTS) {
      if (css.includes(bp)) {
        breakpoints.add(bp);
      }
    }

    return {
      count,
      breakpoints: Array.from(breakpoints).sort((a, b) => {
        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);
        return numA - numB;
      }),
      hasMobileStyles,
    };
  }

  /**
   * Check for flexbox or grid usage
   */
  private static hasFlexOrGrid(html: string, css: string): boolean {
    const combinedContent = html + css;
    return (
      /display:\s*flex/i.test(combinedContent) ||
      /display:\s*grid/i.test(combinedContent) ||
      /class=["'][^"']*(?:flex|grid)[^"']*["']/i.test(html)
    );
  }

  /**
   * Check for responsive images
   */
  private static hasResponsiveImages(html: string): boolean {
    return (
      /<img[^>]*srcset=/i.test(html) ||
      /<picture[^>]*>/i.test(html) ||
      /<img[^>]*sizes=/i.test(html) ||
      /max-width:\s*100%/i.test(html) ||
      /width:\s*100%/i.test(html)
    );
  }

  /**
   * Check for responsive CSS units
   */
  private static hasResponsiveUnits(css: string): boolean {
    return (
      /\d+(?:vw|vh|vmin|vmax|%|rem|em)/i.test(css) &&
      !/^\s*0(?:vw|vh|vmin|vmax|%|rem|em)/i.test(css) // Exclude zero values
    );
  }
}
