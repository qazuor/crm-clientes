/**
 * BuiltWith API Service
 * Detects technologies used on a website
 * Free tier: 5000 lookups/month
 */

import { quotaManager } from '@/lib/quota-manager';
import { ApiKeyService } from '../api-key-service';
import { logger } from '@/lib/logger';

export interface BuiltWithTechnology {
  name: string;
  description?: string;
  link?: string;
  tag?: string;
  categories?: string[];
  firstDetected?: string;
  lastDetected?: string;
}

export interface BuiltWithResult {
  success: boolean;
  url?: string;
  technologies?: BuiltWithTechnology[];
  categories?: Record<string, string[]>;
  error?: string;
  fromCache?: boolean;
}

// Free API endpoint (limited data)
const BUILTWITH_FREE_API = 'https://api.builtwith.com/free1/api.json';
// Full API endpoint (requires paid key)
const BUILTWITH_API = 'https://api.builtwith.com/v21/api.json';

/**
 * BuiltWith Service for technology detection
 */
export class BuiltWithService {
  /**
   * Detect technologies used on a website
   */
  static async detectTechnologies(url: string): Promise<BuiltWithResult> {
    try {
      // Check quota
      const quotaCheck = await quotaManager.canMakeRequest('builtwith');
      if (!quotaCheck.allowed) {
        return {
          success: false,
          error: `Quota excedida para BuiltWith. Reset en ${quotaCheck.resetIn}`,
        };
      }

      // Get API key
      const apiKey = await ApiKeyService.getDecryptedKey('builtwith');

      // Normalize URL
      const cleanUrl = this.normalizeUrl(url);

      let result: BuiltWithResult;

      if (apiKey) {
        // Use full API with key
        result = await this.fetchWithKey(cleanUrl, apiKey);
      } else {
        // Use free API (limited)
        result = await this.fetchFreeApi(cleanUrl);
      }

      if (result.success) {
        await quotaManager.incrementUsage('builtwith');
        await quotaManager.recordSuccess('builtwith');
      } else {
        await quotaManager.recordError('builtwith', result.error || 'Unknown error');
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('BuiltWith detection error', error instanceof Error ? error : new Error(message));
      await quotaManager.recordError('builtwith', message);
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Fetch with API key (full results)
   */
  private static async fetchWithKey(url: string, apiKey: string): Promise<BuiltWithResult> {
    const apiUrl = `${BUILTWITH_API}?KEY=${apiKey}&LOOKUP=${encodeURIComponent(url)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        return { success: false, error: 'API key inválida o expirada' };
      }
      if (response.status === 429) {
        return { success: false, error: 'Rate limit excedido' };
      }
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.Errors && data.Errors.length > 0) {
      return { success: false, error: data.Errors[0].Message || 'API error' };
    }

    return this.parseBuiltWithResponse(data, url);
  }

  /**
   * Fetch from free API (limited data)
   */
  private static async fetchFreeApi(url: string): Promise<BuiltWithResult> {
    const apiUrl = `${BUILTWITH_FREE_API}?KEY=free&LOOKUP=${encodeURIComponent(url)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        return { success: false, error: 'Rate limit de API gratuita excedido' };
      }
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.Errors && data.Errors.length > 0) {
      return { success: false, error: data.Errors[0].Message || 'API error' };
    }

    return this.parseFreeResponse(data, url);
  }

  /**
   * Parse full API response
   */
  private static parseBuiltWithResponse(data: Record<string, unknown>, url: string): BuiltWithResult {
    const technologies: BuiltWithTechnology[] = [];
    const categories: Record<string, string[]> = {};

    // Results come in data.Results array
    const results = data.Results as Array<{ Result?: { Paths?: Array<{ Technologies?: Array<Record<string, unknown>> }> } }>;

    if (results && Array.isArray(results)) {
      for (const result of results) {
        const paths = result.Result?.Paths;
        if (paths && Array.isArray(paths)) {
          for (const path of paths) {
            const techs = path.Technologies;
            if (techs && Array.isArray(techs)) {
              for (const tech of techs) {
                const techName = tech.Name as string;
                const techCategory = tech.Tag as string || 'Other';

                if (techName && !technologies.find(t => t.name === techName)) {
                  technologies.push({
                    name: techName,
                    description: tech.Description as string,
                    link: tech.Link as string,
                    tag: techCategory,
                    categories: tech.Categories as string[],
                    firstDetected: tech.FirstDetected as string,
                    lastDetected: tech.LastDetected as string,
                  });

                  // Add to categories
                  if (!categories[techCategory]) {
                    categories[techCategory] = [];
                  }
                  if (!categories[techCategory].includes(techName)) {
                    categories[techCategory].push(techName);
                  }
                }
              }
            }
          }
        }
      }
    }

    return {
      success: true,
      url,
      technologies,
      categories,
    };
  }

  /**
   * Parse free API response
   */
  private static parseFreeResponse(data: Record<string, unknown>, url: string): BuiltWithResult {
    const technologies: BuiltWithTechnology[] = [];
    const categories: Record<string, string[]> = {};

    // Free API has simpler structure
    const groups = data.groups as Array<{ name: string; categories: Array<{ name: string; live: number }> }>;

    if (groups && Array.isArray(groups)) {
      for (const group of groups) {
        const groupName = group.name;
        const cats = group.categories;

        if (cats && Array.isArray(cats)) {
          for (const cat of cats) {
            if (cat.live > 0) {
              const techName = cat.name;

              technologies.push({
                name: techName,
                tag: groupName,
              });

              if (!categories[groupName]) {
                categories[groupName] = [];
              }
              categories[groupName].push(techName);
            }
          }
        }
      }
    }

    return {
      success: true,
      url,
      technologies,
      categories,
      fromCache: false,
    };
  }

  /**
   * Normalize URL for lookup
   */
  private static normalizeUrl(url: string): string {
    try {
      // Remove protocol if present
      let cleanUrl = url.replace(/^https?:\/\//, '');
      // Remove trailing slash
      cleanUrl = cleanUrl.replace(/\/$/, '');
      // Remove www. prefix for consistency
      cleanUrl = cleanUrl.replace(/^www\./, '');
      return cleanUrl;
    } catch {
      return url;
    }
  }
}
