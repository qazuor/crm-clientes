/**
 * Hunter.io API Service
 * Find professional email addresses
 * Free tier: 25 searches/month
 */

import { ApiKeyService } from '../api-key-service';
import { logger } from '@/lib/logger';

export interface HunterEmail {
  value: string;
  type: 'personal' | 'generic';
  confidence: number;
  firstName?: string;
  lastName?: string;
  position?: string;
  seniority?: string;
  department?: string;
  linkedin?: string;
  twitter?: string;
  phoneNumber?: string;
  sources?: Array<{
    domain: string;
    uri: string;
    extractedOn: string;
    lastSeenOn: string;
    stillOnPage: boolean;
  }>;
}

export interface HunterDomainResult {
  success: boolean;
  domain?: string;
  disposable?: boolean;
  webmail?: boolean;
  acceptAll?: boolean;
  pattern?: string;
  organization?: string;
  description?: string;
  industry?: string;
  country?: string;
  state?: string;
  city?: string;
  twitter?: string;
  facebook?: string;
  linkedin?: string;
  emails?: HunterEmail[];
  totalEmails?: number;
  error?: string;
}

export interface HunterVerifyResult {
  success: boolean;
  email?: string;
  status?: 'valid' | 'invalid' | 'accept_all' | 'webmail' | 'disposable' | 'unknown';
  score?: number;
  regexp?: boolean;
  gibberish?: boolean;
  disposable?: boolean;
  webmail?: boolean;
  mxRecords?: boolean;
  smtpServer?: boolean;
  smtpCheck?: boolean;
  acceptAll?: boolean;
  block?: boolean;
  error?: string;
}

const HUNTER_API_BASE = 'https://api.hunter.io/v2';

/**
 * Hunter.io Service for email finding and verification
 */
export class HunterService {
  /**
   * Search for emails on a domain
   */
  static async searchDomain(domain: string, limit: number = 10): Promise<HunterDomainResult> {
    try {
      const apiKey = await ApiKeyService.getDecryptedKey('hunter_io');

      if (!apiKey) {
        return {
          success: false,
          error: 'API key de Hunter.io no configurada',
        };
      }

      const cleanDomain = this.extractDomain(domain);
      const url = `${HUNTER_API_BASE}/domain-search?domain=${encodeURIComponent(cleanDomain)}&limit=${limit}&api_key=${apiKey}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'API key inválida' };
        }
        if (response.status === 429) {
          return { success: false, error: 'Rate limit excedido' };
        }
        const errorData = await response.json();
        return { success: false, error: errorData.errors?.[0]?.details || `HTTP ${response.status}` };
      }

      const data = await response.json();

      if (data.errors && data.errors.length > 0) {
        return { success: false, error: data.errors[0].details };
      }

      return this.parseDomainResponse(data.data, cleanDomain);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Hunter.io domain search error', error instanceof Error ? error : new Error(message));
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Find email for a specific person at a domain
   */
  static async findEmail(
    domain: string,
    firstName: string,
    lastName: string
  ): Promise<{ success: boolean; email?: string; score?: number; error?: string }> {
    try {
      const apiKey = await ApiKeyService.getDecryptedKey('hunter_io');

      if (!apiKey) {
        return {
          success: false,
          error: 'API key de Hunter.io no configurada',
        };
      }

      const cleanDomain = this.extractDomain(domain);
      const url = `${HUNTER_API_BASE}/email-finder?domain=${encodeURIComponent(cleanDomain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${apiKey}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'API key inválida' };
        }
        if (response.status === 429) {
          return { success: false, error: 'Rate limit excedido' };
        }
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();

      if (data.errors && data.errors.length > 0) {
        return { success: false, error: data.errors[0].details };
      }

      return {
        success: true,
        email: data.data?.email,
        score: data.data?.score,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Hunter.io email finder error', error instanceof Error ? error : new Error(message));
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Verify an email address
   */
  static async verifyEmail(email: string): Promise<HunterVerifyResult> {
    try {
      const apiKey = await ApiKeyService.getDecryptedKey('hunter_io');

      if (!apiKey) {
        return {
          success: false,
          error: 'API key de Hunter.io no configurada',
        };
      }

      const url = `${HUNTER_API_BASE}/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'API key inválida' };
        }
        if (response.status === 429) {
          return { success: false, error: 'Rate limit excedido' };
        }
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();

      if (data.errors && data.errors.length > 0) {
        return { success: false, error: data.errors[0].details };
      }

      const verifyData = data.data;
      return {
        success: true,
        email: verifyData.email,
        status: verifyData.status,
        score: verifyData.score,
        regexp: verifyData.regexp,
        gibberish: verifyData.gibberish,
        disposable: verifyData.disposable,
        webmail: verifyData.webmail,
        mxRecords: verifyData.mx_records,
        smtpServer: verifyData.smtp_server,
        smtpCheck: verifyData.smtp_check,
        acceptAll: verifyData.accept_all,
        block: verifyData.block,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Hunter.io email verify error', error instanceof Error ? error : new Error(message));
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Parse domain search response
   */
  private static parseDomainResponse(data: Record<string, unknown>, domain: string): HunterDomainResult {
    const emails: HunterEmail[] = [];

    if (data.emails && Array.isArray(data.emails)) {
      for (const email of data.emails) {
        emails.push({
          value: email.value,
          type: email.type,
          confidence: email.confidence,
          firstName: email.first_name,
          lastName: email.last_name,
          position: email.position,
          seniority: email.seniority,
          department: email.department,
          linkedin: email.linkedin,
          twitter: email.twitter,
          phoneNumber: email.phone_number,
          sources: email.sources?.map((s: Record<string, unknown>) => ({
            domain: s.domain as string,
            uri: s.uri as string,
            extractedOn: s.extracted_on as string,
            lastSeenOn: s.last_seen_on as string,
            stillOnPage: s.still_on_page as boolean,
          })),
        });
      }
    }

    return {
      success: true,
      domain,
      disposable: data.disposable as boolean,
      webmail: data.webmail as boolean,
      acceptAll: data.accept_all as boolean,
      pattern: data.pattern as string,
      organization: data.organization as string,
      description: data.description as string,
      industry: data.industry as string,
      country: data.country as string,
      state: data.state as string,
      city: data.city as string,
      twitter: data.twitter as string,
      facebook: data.facebook as string,
      linkedin: data.linkedin as string,
      emails,
      totalEmails: (data.emails as unknown[])?.length ?? 0,
    };
  }

  /**
   * Extract domain from URL
   */
  private static extractDomain(input: string): string {
    try {
      // Remove protocol if present
      let domain = input.replace(/^https?:\/\//, '');
      // Remove path and query
      domain = domain.split('/')[0].split('?')[0];
      // Remove www.
      domain = domain.replace(/^www\./, '');
      return domain.toLowerCase();
    } catch {
      return input;
    }
  }
}
