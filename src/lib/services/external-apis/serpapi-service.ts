/**
 * SerpAPI Service
 * Google Search results and social media search
 * Free tier: 100 searches/month
 */

import { quotaManager } from '@/lib/quota-manager';
import { ApiKeyService } from '../api-key-service';
import { logger } from '@/lib/logger';

export interface SerpSearchResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  displayedLink?: string;
  favicon?: string;
}

export interface SerpSocialProfile {
  platform: string;
  url: string;
  title?: string;
  snippet?: string;
}

export interface SerpSearchResponse {
  success: boolean;
  query?: string;
  results?: SerpSearchResult[];
  socialProfiles?: SerpSocialProfile[];
  relatedSearches?: string[];
  totalResults?: number;
  error?: string;
}

const SERPAPI_BASE = 'https://serpapi.com/search.json';

/**
 * SerpAPI Service for web and social media search
 */
export class SerpAPIService {
  /**
   * Search Google for company information
   */
  static async searchCompany(companyName: string, location?: string): Promise<SerpSearchResponse> {
    try {
      // Check quota
      const quotaCheck = await quotaManager.canMakeRequest('serpapi');
      if (!quotaCheck.allowed) {
        return {
          success: false,
          error: `Quota excedida para SerpAPI. Reset en ${quotaCheck.resetIn}`,
        };
      }

      const apiKey = await ApiKeyService.getDecryptedKey('serpapi');

      if (!apiKey) {
        return {
          success: false,
          error: 'API key de SerpAPI no configurada',
        };
      }

      // Build search query
      let query = companyName;
      if (location) {
        query += ` ${location}`;
      }

      const params = new URLSearchParams({
        engine: 'google',
        q: query,
        api_key: apiKey,
        num: '10',
        hl: 'es',
        gl: 'ar', // Argentina by default, can be configurable
      });

      const response = await fetch(`${SERPAPI_BASE}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          await quotaManager.recordError('serpapi', 'API key inválida');
          return { success: false, error: 'API key inválida' };
        }
        if (response.status === 429) {
          await quotaManager.recordError('serpapi', 'Rate limit excedido');
          return { success: false, error: 'Rate limit excedido' };
        }
        await quotaManager.recordError('serpapi', `HTTP ${response.status}`);
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();

      if (data.error) {
        await quotaManager.recordError('serpapi', data.error);
        return { success: false, error: data.error };
      }

      await quotaManager.incrementUsage('serpapi');
      await quotaManager.recordSuccess('serpapi');

      return this.parseSearchResponse(data, query);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('SerpAPI search error', error instanceof Error ? error : new Error(message));
      await quotaManager.recordError('serpapi', message);
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Search for social media profiles of a company
   */
  static async searchSocialProfiles(companyName: string): Promise<SerpSearchResponse> {
    try {
      // Check quota
      const quotaCheck = await quotaManager.canMakeRequest('serpapi');
      if (!quotaCheck.allowed) {
        return {
          success: false,
          error: `Quota excedida para SerpAPI. Reset en ${quotaCheck.resetIn}`,
        };
      }

      const apiKey = await ApiKeyService.getDecryptedKey('serpapi');

      if (!apiKey) {
        return {
          success: false,
          error: 'API key de SerpAPI no configurada',
        };
      }

      // Search specifically for social media profiles
      const socialPlatforms = ['linkedin', 'facebook', 'instagram', 'twitter'];
      const query = `"${companyName}" (${socialPlatforms.map(p => `site:${p}.com`).join(' OR ')})`;

      const params = new URLSearchParams({
        engine: 'google',
        q: query,
        api_key: apiKey,
        num: '20',
        hl: 'es',
      });

      const response = await fetch(`${SERPAPI_BASE}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          await quotaManager.recordError('serpapi', 'API key inválida');
          return { success: false, error: 'API key inválida' };
        }
        if (response.status === 429) {
          await quotaManager.recordError('serpapi', 'Rate limit excedido');
          return { success: false, error: 'Rate limit excedido' };
        }
        await quotaManager.recordError('serpapi', `HTTP ${response.status}`);
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();

      if (data.error) {
        await quotaManager.recordError('serpapi', data.error);
        return { success: false, error: data.error };
      }

      await quotaManager.incrementUsage('serpapi');
      await quotaManager.recordSuccess('serpapi');

      // Parse specifically for social profiles
      const socialProfiles = this.extractSocialProfiles(data, companyName);

      return {
        success: true,
        query,
        socialProfiles,
        results: this.parseOrganicResults(data.organic_results || []),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('SerpAPI social search error', error instanceof Error ? error : new Error(message));
      await quotaManager.recordError('serpapi', message);
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Search Google Maps for business information
   */
  static async searchLocalBusiness(companyName: string, location: string): Promise<{
    success: boolean;
    name?: string;
    address?: string;
    phone?: string;
    website?: string;
    rating?: number;
    reviews?: number;
    hours?: string[];
    type?: string;
    gpsCoordinates?: { latitude: number; longitude: number };
    error?: string;
  }> {
    try {
      // Check quota
      const quotaCheck = await quotaManager.canMakeRequest('serpapi');
      if (!quotaCheck.allowed) {
        return {
          success: false,
          error: `Quota excedida para SerpAPI. Reset en ${quotaCheck.resetIn}`,
        };
      }

      const apiKey = await ApiKeyService.getDecryptedKey('serpapi');

      if (!apiKey) {
        return {
          success: false,
          error: 'API key de SerpAPI no configurada',
        };
      }

      const params = new URLSearchParams({
        engine: 'google_maps',
        q: `${companyName} ${location}`,
        api_key: apiKey,
        hl: 'es',
      });

      const response = await fetch(`${SERPAPI_BASE}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        await quotaManager.recordError('serpapi', `HTTP ${response.status}`);
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();

      if (data.error) {
        await quotaManager.recordError('serpapi', data.error);
        return { success: false, error: data.error };
      }

      await quotaManager.incrementUsage('serpapi');
      await quotaManager.recordSuccess('serpapi');

      // Get first local result
      const localResults = data.local_results || [];
      if (localResults.length === 0) {
        return { success: false, error: 'No se encontraron resultados locales' };
      }

      const business = localResults[0];
      return {
        success: true,
        name: business.title,
        address: business.address,
        phone: business.phone,
        website: business.website,
        rating: business.rating,
        reviews: business.reviews,
        hours: business.hours,
        type: business.type,
        gpsCoordinates: business.gps_coordinates,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('SerpAPI local search error', error instanceof Error ? error : new Error(message));
      await quotaManager.recordError('serpapi', message);
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Parse search response
   */
  private static parseSearchResponse(data: Record<string, unknown>, query: string): SerpSearchResponse {
    const results = this.parseOrganicResults(
      (data.organic_results as Array<Record<string, unknown>>) || []
    );

    const relatedSearches: string[] = [];
    if (data.related_searches && Array.isArray(data.related_searches)) {
      for (const related of data.related_searches) {
        if (related.query) {
          relatedSearches.push(related.query);
        }
      }
    }

    // Extract social profiles from organic results
    const socialProfiles = this.extractSocialProfiles(data, query);

    return {
      success: true,
      query,
      results,
      socialProfiles,
      relatedSearches,
      totalResults: (data.search_information as { total_results?: number })?.total_results,
    };
  }

  /**
   * Parse organic results
   */
  private static parseOrganicResults(organicResults: Array<Record<string, unknown>>): SerpSearchResult[] {
    const results: SerpSearchResult[] = [];

    for (const result of organicResults) {
      results.push({
        position: result.position as number,
        title: result.title as string,
        link: result.link as string,
        snippet: result.snippet as string,
        displayedLink: result.displayed_link as string,
        favicon: result.favicon as string,
      });
    }

    return results;
  }

  /**
   * Extract social profiles from search results
   */
  private static extractSocialProfiles(
    data: Record<string, unknown>,
    companyName: string
  ): SerpSocialProfile[] {
    const profiles: SerpSocialProfile[] = [];
    const organicResults = (data.organic_results as Array<Record<string, unknown>>) || [];
    const companyLower = companyName.toLowerCase();

    const platformPatterns: Record<string, RegExp> = {
      linkedin: /linkedin\.com\/company\/([^/?]+)/i,
      facebook: /facebook\.com\/([^/?]+)/i,
      instagram: /instagram\.com\/([^/?]+)/i,
      twitter: /twitter\.com\/([^/?]+)|x\.com\/([^/?]+)/i,
      youtube: /youtube\.com\/(user|channel|c)\/([^/?]+)/i,
    };

    for (const result of organicResults) {
      const link = result.link as string;
      const title = (result.title as string) || '';
      const snippet = (result.snippet as string) || '';

      for (const [platform, pattern] of Object.entries(platformPatterns)) {
        if (pattern.test(link)) {
          // Check if it might be related to the company
          const titleLower = title.toLowerCase();
          const snippetLower = snippet.toLowerCase();

          if (
            titleLower.includes(companyLower) ||
            snippetLower.includes(companyLower) ||
            // Also accept if it's likely the main company page
            titleLower.includes('official') ||
            titleLower.includes('empresa')
          ) {
            // Avoid duplicates for same platform
            if (!profiles.find(p => p.platform === platform)) {
              profiles.push({
                platform,
                url: link,
                title,
                snippet,
              });
            }
          }
          break;
        }
      }
    }

    return profiles;
  }
}
