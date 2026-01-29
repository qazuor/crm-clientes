/**
 * Google Safe Browsing API Service
 * Check URLs for malware, phishing, and other threats
 * Free tier: 10,000 requests/day
 */

import { ApiKeyService } from '../api-key-service';
import { logger } from '@/lib/logger';

export type ThreatType =
  | 'MALWARE'
  | 'SOCIAL_ENGINEERING'
  | 'UNWANTED_SOFTWARE'
  | 'POTENTIALLY_HARMFUL_APPLICATION'
  | 'THREAT_TYPE_UNSPECIFIED';

export type PlatformType =
  | 'WINDOWS'
  | 'LINUX'
  | 'ANDROID'
  | 'OSX'
  | 'IOS'
  | 'ANY_PLATFORM'
  | 'ALL_PLATFORMS'
  | 'CHROME';

export interface ThreatMatch {
  threatType: ThreatType;
  platformType: PlatformType;
  threat: {
    url: string;
  };
  cacheDuration: string;
  threatEntryType: string;
}

export interface SafeBrowsingResult {
  success: boolean;
  isSafe: boolean;
  threats?: ThreatMatch[];
  checkedUrl?: string;
  error?: string;
}

export interface SafeBrowsingBatchResult {
  success: boolean;
  results: Array<{
    url: string;
    isSafe: boolean;
    threats?: ThreatMatch[];
  }>;
  error?: string;
}

const SAFE_BROWSING_API_BASE = 'https://safebrowsing.googleapis.com/v4';

/**
 * Google Safe Browsing API Service for website safety checks
 */
export class GoogleSafeBrowsingService {
  /**
   * Check if a single URL is safe
   */
  static async checkUrl(url: string): Promise<SafeBrowsingResult> {
    try {
      const apiKey = await ApiKeyService.getDecryptedKey('google_safe_browsing');

      if (!apiKey) {
        return {
          success: false,
          isSafe: true, // Default to safe if no API key
          error: 'API key de Google Safe Browsing no configurada',
        };
      }

      // Normalize URL
      const normalizedUrl = this.normalizeUrl(url);

      const requestBody = {
        client: {
          clientId: 'crm-clientes',
          clientVersion: '1.0.0',
        },
        threatInfo: {
          threatTypes: [
            'MALWARE',
            'SOCIAL_ENGINEERING',
            'UNWANTED_SOFTWARE',
            'POTENTIALLY_HARMFUL_APPLICATION',
          ],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url: normalizedUrl }],
        },
      };

      logger.debug('[SafeBrowsing] Checking URL', { url: normalizedUrl });

      const response = await fetch(
        `${SAFE_BROWSING_API_BASE}/threatMatches:find?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        if (response.status === 400) {
          return { success: false, isSafe: true, error: 'URL invalida' };
        }
        if (response.status === 403) {
          return { success: false, isSafe: true, error: 'API key invalida o sin permisos' };
        }
        return { success: false, isSafe: true, error: `HTTP ${response.status}` };
      }

      const data = await response.json();

      // If matches is empty or undefined, the URL is safe
      const threats = data.matches as ThreatMatch[] | undefined;
      const isSafe = !threats || threats.length === 0;

      logger.debug('[SafeBrowsing] Check result', {
        url: normalizedUrl,
        isSafe,
        threatCount: threats?.length || 0,
      });

      return {
        success: true,
        isSafe,
        threats,
        checkedUrl: normalizedUrl,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[SafeBrowsing] Check error', error instanceof Error ? error : new Error(message));
      return {
        success: false,
        isSafe: true, // Default to safe on error
        error: message,
      };
    }
  }

  /**
   * Check multiple URLs at once (more efficient for batch operations)
   * Max 500 URLs per request
   */
  static async checkUrls(urls: string[]): Promise<SafeBrowsingBatchResult> {
    try {
      const apiKey = await ApiKeyService.getDecryptedKey('google_safe_browsing');

      if (!apiKey) {
        return {
          success: false,
          results: urls.map(url => ({ url, isSafe: true })),
          error: 'API key de Google Safe Browsing no configurada',
        };
      }

      // Limit to 500 URLs max
      const urlsToCheck = urls.slice(0, 500);
      const normalizedUrls = urlsToCheck.map(url => this.normalizeUrl(url));

      const requestBody = {
        client: {
          clientId: 'crm-clientes',
          clientVersion: '1.0.0',
        },
        threatInfo: {
          threatTypes: [
            'MALWARE',
            'SOCIAL_ENGINEERING',
            'UNWANTED_SOFTWARE',
            'POTENTIALLY_HARMFUL_APPLICATION',
          ],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: normalizedUrls.map(url => ({ url })),
        },
      };

      logger.debug('[SafeBrowsing] Batch checking URLs', { count: normalizedUrls.length });

      const response = await fetch(
        `${SAFE_BROWSING_API_BASE}/threatMatches:find?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        return {
          success: false,
          results: normalizedUrls.map(url => ({ url, isSafe: true })),
          error: `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      const threats = (data.matches as ThreatMatch[]) || [];

      // Create a map of unsafe URLs
      const unsafeUrls = new Map<string, ThreatMatch[]>();
      for (const threat of threats) {
        const threatUrl = threat.threat.url;
        if (!unsafeUrls.has(threatUrl)) {
          unsafeUrls.set(threatUrl, []);
        }
        unsafeUrls.get(threatUrl)!.push(threat);
      }

      // Build results for all URLs
      const results = normalizedUrls.map(url => ({
        url,
        isSafe: !unsafeUrls.has(url),
        threats: unsafeUrls.get(url),
      }));

      logger.debug('[SafeBrowsing] Batch check result', {
        total: normalizedUrls.length,
        unsafe: unsafeUrls.size,
      });

      return {
        success: true,
        results,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[SafeBrowsing] Batch check error', error instanceof Error ? error : new Error(message));
      return {
        success: false,
        results: urls.map(url => ({ url, isSafe: true })),
        error: message,
      };
    }
  }

  /**
   * Get human-readable threat description
   */
  static getThreatDescription(threatType: ThreatType): string {
    const descriptions: Record<ThreatType, string> = {
      MALWARE: 'Este sitio contiene software malicioso (malware)',
      SOCIAL_ENGINEERING: 'Este sitio puede intentar engañarte (phishing)',
      UNWANTED_SOFTWARE: 'Este sitio distribuye software no deseado',
      POTENTIALLY_HARMFUL_APPLICATION: 'Este sitio puede contener aplicaciones dañinas',
      THREAT_TYPE_UNSPECIFIED: 'Este sitio presenta riesgos de seguridad',
    };

    return descriptions[threatType] || 'Este sitio puede no ser seguro';
  }

  /**
   * Get all threat descriptions for a result
   */
  static getAllThreatDescriptions(threats: ThreatMatch[]): string[] {
    const uniqueTypes = new Set(threats.map(t => t.threatType));
    return Array.from(uniqueTypes).map(type => this.getThreatDescription(type));
  }

  /**
   * Normalize URL for checking
   */
  private static normalizeUrl(url: string): string {
    try {
      // Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      const parsed = new URL(url);
      // Return full URL for checking
      return parsed.href;
    } catch {
      // If URL parsing fails, return as-is
      return url;
    }
  }

  /**
   * Quick check if URL is safe (simplified result)
   */
  static async isUrlSafe(url: string): Promise<{ safe: boolean; reason?: string }> {
    const result = await this.checkUrl(url);

    if (!result.success) {
      // If check fails, assume safe but note the error
      return { safe: true, reason: result.error };
    }

    if (!result.isSafe && result.threats) {
      return {
        safe: false,
        reason: this.getAllThreatDescriptions(result.threats).join('. '),
      };
    }

    return { safe: true };
  }
}
