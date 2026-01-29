/**
 * URL Verification Service
 * Validates discovered URLs are accessible and belong to the correct company
 */

import { AISdkService } from './ai-sdk-service';
import { getUrlVerificationPrompt } from './enrichment-prompts';

export interface UrlVerificationResult {
  url: string;
  isAccessible: boolean;
  statusCode?: number;
  responseTime?: number;
  hasSSL: boolean;
  sslValid?: boolean;
  isOfficial?: boolean;
  confidence?: number;
  redirectUrl?: string;
  error?: string;
}

/**
 * URL Verification Service
 */
export class UrlVerificationService {
  /**
   * Verify a URL is accessible
   */
  static async verifyAccessibility(url: string, timeoutMs = 10000): Promise<UrlVerificationResult> {
    const result: UrlVerificationResult = {
      url,
      isAccessible: false,
      hasSSL: url.startsWith('https://'),
    };

    try {
      // Normalize URL
      let normalizedUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        normalizedUrl = `https://${url}`;
        result.url = normalizedUrl;
        result.hasSSL = true;
      }

      const startTime = Date.now();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(normalizedUrl, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'follow',
        });

        clearTimeout(timeout);

        result.isAccessible = response.ok || response.status < 400;
        result.statusCode = response.status;
        result.responseTime = Date.now() - startTime;

        // Check for redirects
        if (response.url !== normalizedUrl) {
          result.redirectUrl = response.url;
        }

        // SSL is valid if we got a response via HTTPS
        if (result.hasSSL) {
          result.sslValid = true;
        }
      } catch (fetchError) {
        clearTimeout(timeout);

        // Try HTTP if HTTPS failed
        if (normalizedUrl.startsWith('https://')) {
          const httpUrl = normalizedUrl.replace('https://', 'http://');
          try {
            const httpResponse = await fetch(httpUrl, {
              method: 'HEAD',
              signal: AbortSignal.timeout(timeoutMs),
              redirect: 'follow',
            });

            result.isAccessible = httpResponse.ok || httpResponse.status < 400;
            result.statusCode = httpResponse.status;
            result.hasSSL = false;
            result.url = httpUrl;

            if (httpResponse.url !== httpUrl) {
              result.redirectUrl = httpResponse.url;
              result.hasSSL = httpResponse.url.startsWith('https://');
            }
          } catch {
            result.error = 'URL not accessible via HTTPS or HTTP';
          }
        } else {
          result.error = fetchError instanceof Error ? fetchError.message : 'Request failed';
        }
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  /**
   * Verify URL belongs to the company using AI
   */
  static async verifyOwnership(
    url: string,
    companyName: string
  ): Promise<{
    isOfficial: boolean;
    confidence: number;
    reasoning: string;
    alternativeUrl?: string;
  }> {
    const availableProviders = await AISdkService.getAvailableProviders();

    if (availableProviders.length === 0) {
      // Without AI, assume it's valid if accessible
      return {
        isOfficial: true,
        confidence: 0.5,
        reasoning: 'No AI verification available - assuming valid',
      };
    }

    try {
      const prompt = getUrlVerificationPrompt(url, companyName);

      const response = await AISdkService.complete(
        availableProviders[0],
        [
          { role: 'system', content: 'You are a website ownership verification expert.' },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.1 }
      );

      const parsed = AISdkService.parseJsonResponse<{
        isValid: boolean;
        isOfficial: boolean;
        confidence: number;
        reasoning: string;
        alternativeUrl?: string;
      }>(response.content);

      if (parsed) {
        return {
          isOfficial: parsed.isOfficial,
          confidence: parsed.confidence,
          reasoning: parsed.reasoning,
          alternativeUrl: parsed.alternativeUrl ?? undefined,
        };
      }
    } catch (error) {
      console.error('URL ownership verification failed:', error);
    }

    return {
      isOfficial: true,
      confidence: 0.3,
      reasoning: 'AI verification failed - assuming valid with low confidence',
    };
  }

  /**
   * Full URL verification (accessibility + ownership)
   */
  static async verifyUrl(
    url: string,
    companyName: string
  ): Promise<UrlVerificationResult & { ownership?: { isOfficial: boolean; confidence: number; reasoning: string } }> {
    // First check accessibility
    const accessResult = await this.verifyAccessibility(url);

    if (!accessResult.isAccessible) {
      return accessResult;
    }

    // Then verify ownership
    const urlToVerify = accessResult.redirectUrl || accessResult.url;
    const ownership = await this.verifyOwnership(urlToVerify, companyName);

    return {
      ...accessResult,
      isOfficial: ownership.isOfficial,
      confidence: ownership.confidence,
      ownership,
    };
  }

  /**
   * Find and verify the best URL from multiple candidates
   */
  static async findBestUrl(
    candidates: string[],
    companyName: string
  ): Promise<{ url: string; verification: UrlVerificationResult } | null> {
    const results: Array<{ url: string; verification: UrlVerificationResult; score: number }> = [];

    for (const url of candidates) {
      const verification = await this.verifyUrl(url, companyName);

      if (verification.isAccessible) {
        // Calculate a score based on various factors
        let score = 0;
        if (verification.hasSSL) score += 2;
        if (verification.sslValid) score += 1;
        if (verification.isOfficial) score += 3;
        if (verification.confidence) score += verification.confidence * 2;
        if (verification.responseTime && verification.responseTime < 2000) score += 1;

        results.push({ url: verification.url, verification, score });
      }
    }

    if (results.length === 0) {
      return null;
    }

    // Return the highest scoring URL
    results.sort((a, b) => b.score - a.score);
    return { url: results[0].url, verification: results[0].verification };
  }

  /**
   * Normalize a URL for storage
   */
  static normalizeUrl(url: string): string {
    try {
      let normalized = url.trim().toLowerCase();

      // Add protocol if missing
      if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = `https://${normalized}`;
      }

      const parsed = new URL(normalized);

      // Remove trailing slash
      let result = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
      if (result.endsWith('/') && parsed.pathname === '/') {
        result = result.slice(0, -1);
      }

      return result;
    } catch {
      return url;
    }
  }
}
