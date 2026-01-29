/**
 * Social Media Search Service
 * Finds company social media profiles using multiple methods
 */

import { SerpAPIService } from './external-apis/serpapi-service';
import { logger } from '@/lib/logger';

export interface SocialProfile {
  platform: 'linkedin' | 'facebook' | 'instagram' | 'twitter' | 'youtube' | 'tiktok' | 'whatsapp';
  url: string;
  username?: string;
  verified: boolean;
  confidence: 'high' | 'medium' | 'low';
  source: 'serpapi' | 'website' | 'manual';
}

export interface SocialSearchResult {
  success: boolean;
  profiles: SocialProfile[];
  errors?: string[];
}

/**
 * Social Media Service
 */
export class SocialMediaService {
  /**
   * Search for company social profiles
   */
  static async searchProfiles(
    companyName: string,
    websiteUrl?: string
  ): Promise<SocialSearchResult> {
    const profiles: SocialProfile[] = [];
    const errors: string[] = [];

    // Method 1: Try to extract from website directly if provided
    if (websiteUrl) {
      try {
        const websiteProfiles = await this.extractFromWebsite(websiteUrl);
        profiles.push(...websiteProfiles);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error extracting from website';
        errors.push(message);
      }
    }

    // Method 2: Search using SerpAPI
    try {
      const serpResult = await SerpAPIService.searchSocialProfiles(companyName);

      if (serpResult.success && serpResult.socialProfiles) {
        for (const sp of serpResult.socialProfiles) {
          const platform = this.normalizePlatform(sp.platform);
          if (platform) {
            // Check if we already have this platform
            const existing = profiles.find(p => p.platform === platform);
            if (!existing) {
              profiles.push({
                platform,
                url: sp.url,
                username: this.extractUsername(sp.url, platform),
                verified: false,
                confidence: 'medium',
                source: 'serpapi',
              });
            }
          }
        }
      } else if (serpResult.error) {
        errors.push(`SerpAPI: ${serpResult.error}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error searching SerpAPI';
      errors.push(message);
    }

    // Deduplicate and prioritize by confidence
    const deduped = this.deduplicateProfiles(profiles);

    return {
      success: deduped.length > 0 || errors.length === 0,
      profiles: deduped,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Extract social profiles from a website
   */
  static async extractFromWebsite(url: string): Promise<SocialProfile[]> {
    const profiles: SocialProfile[] = [];

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CRMBot/1.0)',
        },
      });

      if (!response.ok) {
        return profiles;
      }

      const html = await response.text();

      // Define patterns for each platform
      const patterns: Array<{
        platform: SocialProfile['platform'];
        regex: RegExp;
      }> = [
        { platform: 'linkedin', regex: /https?:\/\/(www\.)?linkedin\.com\/company\/([a-zA-Z0-9_-]+)/gi },
        { platform: 'facebook', regex: /https?:\/\/(www\.)?facebook\.com\/([a-zA-Z0-9._-]+)/gi },
        { platform: 'instagram', regex: /https?:\/\/(www\.)?instagram\.com\/([a-zA-Z0-9._]+)/gi },
        { platform: 'twitter', regex: /https?:\/\/(www\.)?(twitter|x)\.com\/([a-zA-Z0-9_]+)/gi },
        { platform: 'youtube', regex: /https?:\/\/(www\.)?youtube\.com\/(user|channel|c|@)\/([a-zA-Z0-9_-]+)/gi },
        { platform: 'tiktok', regex: /https?:\/\/(www\.)?tiktok\.com\/@([a-zA-Z0-9._-]+)/gi },
        { platform: 'whatsapp', regex: /https?:\/\/(api\.)?whatsapp\.com\/(send\?phone=|message\/)(\d+)/gi },
      ];

      for (const { platform, regex } of patterns) {
        const matches = html.matchAll(regex);
        for (const match of matches) {
          const fullUrl = match[0];
          const username = match[match.length - 1]; // Last capture group

          // Skip generic/invalid usernames
          if (this.isValidUsername(username, platform)) {
            // Check if already found
            const existing = profiles.find(p => p.platform === platform);
            if (!existing) {
              profiles.push({
                platform,
                url: fullUrl,
                username,
                verified: true, // Found on official website
                confidence: 'high',
                source: 'website',
              });
            }
          }
        }
      }
    } catch (err) {
      logger.warn('Error extracting social profiles from website', { url, error: err });
    }

    return profiles;
  }

  /**
   * Verify if a social profile URL is valid
   */
  static async verifyProfile(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CRMBot/1.0)',
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Normalize platform name
   */
  private static normalizePlatform(platform: string): SocialProfile['platform'] | null {
    const normalized = platform.toLowerCase();

    const mapping: Record<string, SocialProfile['platform']> = {
      linkedin: 'linkedin',
      facebook: 'facebook',
      instagram: 'instagram',
      twitter: 'twitter',
      x: 'twitter',
      youtube: 'youtube',
      tiktok: 'tiktok',
      whatsapp: 'whatsapp',
    };

    return mapping[normalized] || null;
  }

  /**
   * Extract username from URL
   */
  private static extractUsername(url: string, platform: SocialProfile['platform']): string | undefined {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      switch (platform) {
        case 'linkedin':
          return path.replace('/company/', '').replace(/\/$/, '');
        case 'facebook':
        case 'instagram':
        case 'tiktok':
          return path.replace(/^\/+|\/+$/g, '').replace('@', '');
        case 'twitter':
          return path.replace(/^\/+|\/+$/g, '');
        case 'youtube':
          return path.replace(/^\/(user|channel|c|@)\//, '').replace(/\/$/, '');
        default:
          return undefined;
      }
    } catch {
      return undefined;
    }
  }

  /**
   * Check if username is valid (not generic)
   */
  private static isValidUsername(username: string, platform: SocialProfile['platform']): boolean {
    if (!username || username.length < 2) return false;

    // Generic usernames to exclude
    const genericUsernames = [
      'share', 'sharer', 'intent', 'login', 'signup', 'help', 'about',
      'privacy', 'terms', 'settings', 'home', 'explore', 'search',
      'watch', 'feed', 'notifications', 'messages', 'hashtag',
    ];

    const usernameLower = username.toLowerCase();

    if (genericUsernames.includes(usernameLower)) {
      return false;
    }

    // Platform-specific validation
    switch (platform) {
      case 'whatsapp':
        // WhatsApp should be a phone number
        return /^\d{10,15}$/.test(username);
      default:
        // Should be alphanumeric with some special chars
        return /^[a-zA-Z0-9._-]+$/.test(username);
    }
  }

  /**
   * Deduplicate profiles, keeping highest confidence
   */
  private static deduplicateProfiles(profiles: SocialProfile[]): SocialProfile[] {
    const byPlatform = new Map<SocialProfile['platform'], SocialProfile>();

    const confidenceOrder = { high: 3, medium: 2, low: 1 };

    for (const profile of profiles) {
      const existing = byPlatform.get(profile.platform);
      if (!existing || confidenceOrder[profile.confidence] > confidenceOrder[existing.confidence]) {
        byPlatform.set(profile.platform, profile);
      }
    }

    return Array.from(byPlatform.values());
  }
}
