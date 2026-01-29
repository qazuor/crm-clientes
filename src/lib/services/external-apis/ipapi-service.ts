/**
 * IP-API Service
 * Geolocation of IP addresses and domains
 * Free tier: 45 requests/minute (unlimited per day) - HTTP only
 * Pro: $13/month for HTTPS and no limits
 *
 * NOTE: This API is FREE and does NOT require an API key
 * We use HTTP endpoint for free tier (data is not sensitive)
 */

import { logger } from '@/lib/logger';

export interface IpApiResult {
  success: boolean;
  // Query info
  query?: string; // IP address queried
  // Location
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  // Network
  isp?: string;
  org?: string;
  as?: string; // AS number and name
  asname?: string;
  // Flags
  mobile?: boolean;
  proxy?: boolean;
  hosting?: boolean;
  // Error
  error?: string;
}

// Free tier uses HTTP (not HTTPS)
const IPAPI_BASE = 'http://ip-api.com/json';

/**
 * IP-API Service for IP/domain geolocation
 * No API key required - completely free
 */
export class IpApiService {
  /**
   * Get geolocation info for an IP or domain
   */
  static async lookup(ipOrDomain: string): Promise<IpApiResult> {
    try {
      // Clean input - remove protocol if present
      const target = this.cleanTarget(ipOrDomain);

      const fields = [
        'status',
        'message',
        'country',
        'countryCode',
        'region',
        'regionName',
        'city',
        'zip',
        'lat',
        'lon',
        'timezone',
        'isp',
        'org',
        'as',
        'asname',
        'mobile',
        'proxy',
        'hosting',
        'query',
      ].join(',');

      const url = `${IPAPI_BASE}/${encodeURIComponent(target)}?fields=${fields}`;

      logger.debug('[IP-API] Looking up', { target });

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();

      if (data.status === 'fail') {
        return {
          success: false,
          error: data.message || 'Lookup failed',
        };
      }

      logger.debug('[IP-API] Lookup result', {
        target,
        country: data.country,
        city: data.city,
        isp: data.isp,
      });

      return {
        success: true,
        query: data.query,
        country: data.country,
        countryCode: data.countryCode,
        region: data.region,
        regionName: data.regionName,
        city: data.city,
        zip: data.zip,
        lat: data.lat,
        lon: data.lon,
        timezone: data.timezone,
        isp: data.isp,
        org: data.org,
        as: data.as,
        asname: data.asname,
        mobile: data.mobile,
        proxy: data.proxy,
        hosting: data.hosting,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[IP-API] Lookup error', error instanceof Error ? error : new Error(message));
      return { success: false, error: message };
    }
  }

  /**
   * Get server location for a website
   */
  static async getServerLocation(websiteUrl: string): Promise<{
    success: boolean;
    serverIp?: string;
    location?: string;
    country?: string;
    city?: string;
    isp?: string;
    isHosting?: boolean;
    isProxy?: boolean;
    error?: string;
  }> {
    const domain = this.extractDomain(websiteUrl);
    const result = await this.lookup(domain);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Build location string
    const locationParts = [];
    if (result.city) locationParts.push(result.city);
    if (result.regionName) locationParts.push(result.regionName);
    if (result.country) locationParts.push(result.country);

    return {
      success: true,
      serverIp: result.query,
      location: locationParts.join(', ') || undefined,
      country: result.country,
      city: result.city,
      isp: result.isp || result.org,
      isHosting: result.hosting,
      isProxy: result.proxy,
    };
  }

  /**
   * Format location for display
   */
  static formatLocation(result: IpApiResult): string {
    const parts = [];

    if (result.city) parts.push(result.city);
    if (result.regionName && result.regionName !== result.city) {
      parts.push(result.regionName);
    }
    if (result.country) parts.push(result.country);

    if (parts.length === 0) return 'Ubicacion desconocida';

    let location = parts.join(', ');

    // Add hosting/proxy indicator
    if (result.hosting) {
      location += ' (Datacenter)';
    } else if (result.proxy) {
      location += ' (Proxy/VPN)';
    }

    return location;
  }

  /**
   * Clean target - remove protocol and path
   */
  private static cleanTarget(input: string): string {
    try {
      // If it looks like a URL, extract the hostname
      if (input.includes('://') || input.includes('/')) {
        const url = input.startsWith('http') ? input : `https://${input}`;
        return new URL(url).hostname;
      }
      return input;
    } catch {
      return input;
    }
  }

  /**
   * Extract domain from URL
   */
  private static extractDomain(url: string): string {
    try {
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }
}
