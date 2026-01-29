/**
 * WhoisXML API Service
 * Domain WHOIS information
 * Free tier: 500 requests/month
 * Paid: From $9/month for more requests
 */

import { ApiKeyService } from '../api-key-service';
import { logger } from '@/lib/logger';

export interface WhoisContact {
  name?: string;
  organization?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
  email?: string;
  telephone?: string;
  fax?: string;
}

export interface WhoisResult {
  success: boolean;
  // Domain info
  domainName?: string;
  registrarName?: string;
  registrarUrl?: string;
  // Dates
  createdDate?: string;
  updatedDate?: string;
  expiresDate?: string;
  // Age calculation
  domainAgeDays?: number;
  domainAgeYears?: number;
  daysUntilExpiry?: number;
  // Status
  status?: string[];
  // Contacts
  registrant?: WhoisContact;
  admin?: WhoisContact;
  tech?: WhoisContact;
  // DNS
  nameServers?: string[];
  // Meta
  estimatedDomainAge?: number;
  error?: string;
}

const WHOISXML_API_BASE = 'https://www.whoisxmlapi.com/whoisserver/WhoisService';

/**
 * WhoisXML API Service for domain information
 */
export class WhoisXmlService {
  /**
   * Get WHOIS information for a domain
   */
  static async lookup(domain: string): Promise<WhoisResult> {
    try {
      const apiKey = await ApiKeyService.getDecryptedKey('whoisxml');

      if (!apiKey) {
        return {
          success: false,
          error: 'API key de WhoisXML no configurada',
        };
      }

      // Clean domain
      const cleanDomain = this.extractDomain(domain);

      const url = `${WHOISXML_API_BASE}?apiKey=${apiKey}&domainName=${encodeURIComponent(cleanDomain)}&outputFormat=JSON`;

      logger.debug('[WhoisXML] Looking up domain', { domain: cleanDomain });

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return { success: false, error: 'API key invalida o sin creditos' };
        }
        return { success: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();

      // Check for API errors
      if (data.ErrorMessage) {
        return { success: false, error: data.ErrorMessage.msg || 'API error' };
      }

      const whoisRecord = data.WhoisRecord;
      if (!whoisRecord) {
        return { success: false, error: 'No WHOIS data found' };
      }

      // Parse dates and calculate ages
      const createdDate = whoisRecord.createdDate || whoisRecord.registryData?.createdDate;
      const expiresDate = whoisRecord.expiresDate || whoisRecord.registryData?.expiresDate;
      const updatedDate = whoisRecord.updatedDate || whoisRecord.registryData?.updatedDate;

      let domainAgeDays: number | undefined;
      let domainAgeYears: number | undefined;
      let daysUntilExpiry: number | undefined;

      if (createdDate) {
        const created = new Date(createdDate);
        const now = new Date();
        domainAgeDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        domainAgeYears = Math.floor(domainAgeDays / 365);
      }

      if (expiresDate) {
        const expires = new Date(expiresDate);
        const now = new Date();
        daysUntilExpiry = Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Parse contacts
      const registrant = this.parseContact(whoisRecord.registrant);
      const admin = this.parseContact(whoisRecord.administrativeContact);
      const tech = this.parseContact(whoisRecord.technicalContact);

      // Parse name servers
      const nameServers = whoisRecord.nameServers?.hostNames || [];

      // Parse status
      const status = whoisRecord.status ?
        (Array.isArray(whoisRecord.status) ? whoisRecord.status : [whoisRecord.status]) :
        [];

      logger.debug('[WhoisXML] Lookup complete', {
        domain: cleanDomain,
        registrar: whoisRecord.registrarName,
        ageDays: domainAgeDays,
        expiresIn: daysUntilExpiry,
      });

      return {
        success: true,
        domainName: whoisRecord.domainName,
        registrarName: whoisRecord.registrarName,
        registrarUrl: whoisRecord.registrarUrl,
        createdDate,
        updatedDate,
        expiresDate,
        domainAgeDays,
        domainAgeYears,
        daysUntilExpiry,
        status,
        registrant,
        admin,
        tech,
        nameServers,
        estimatedDomainAge: whoisRecord.estimatedDomainAge,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[WhoisXML] Lookup error', error instanceof Error ? error : new Error(message));
      return { success: false, error: message };
    }
  }

  /**
   * Get summary information for display
   */
  static async getDomainSummary(domain: string): Promise<{
    success: boolean;
    domain?: string;
    registrar?: string;
    age?: string;
    expiresIn?: string;
    owner?: string;
    country?: string;
    isExpiringSoon?: boolean;
    isNew?: boolean;
    error?: string;
  }> {
    const result = await this.lookup(domain);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Format age
    let age: string | undefined;
    if (result.domainAgeYears !== undefined) {
      if (result.domainAgeYears >= 1) {
        age = `${result.domainAgeYears} año${result.domainAgeYears > 1 ? 's' : ''}`;
      } else if (result.domainAgeDays !== undefined) {
        age = `${result.domainAgeDays} dias`;
      }
    }

    // Format expiry
    let expiresIn: string | undefined;
    let isExpiringSoon = false;
    if (result.daysUntilExpiry !== undefined) {
      if (result.daysUntilExpiry < 0) {
        expiresIn = 'Expirado';
        isExpiringSoon = true;
      } else if (result.daysUntilExpiry < 30) {
        expiresIn = `${result.daysUntilExpiry} dias (expira pronto!)`;
        isExpiringSoon = true;
      } else if (result.daysUntilExpiry < 365) {
        expiresIn = `${result.daysUntilExpiry} dias`;
      } else {
        const years = Math.floor(result.daysUntilExpiry / 365);
        expiresIn = `${years} año${years > 1 ? 's' : ''}`;
      }
    }

    // Check if domain is new (less than 6 months)
    const isNew = result.domainAgeDays !== undefined && result.domainAgeDays < 180;

    return {
      success: true,
      domain: result.domainName,
      registrar: result.registrarName,
      age,
      expiresIn,
      owner: result.registrant?.organization || result.registrant?.name,
      country: result.registrant?.country,
      isExpiringSoon,
      isNew,
    };
  }

  /**
   * Check if a domain looks suspicious based on WHOIS data
   */
  static async checkDomainTrust(domain: string): Promise<{
    success: boolean;
    trustScore?: number; // 0-100
    warnings?: string[];
    error?: string;
  }> {
    const result = await this.lookup(domain);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const warnings: string[] = [];
    let trustScore = 100;

    // Check domain age
    if (result.domainAgeDays !== undefined) {
      if (result.domainAgeDays < 30) {
        warnings.push('Dominio muy nuevo (menos de 1 mes)');
        trustScore -= 30;
      } else if (result.domainAgeDays < 180) {
        warnings.push('Dominio nuevo (menos de 6 meses)');
        trustScore -= 15;
      }
    }

    // Check expiry
    if (result.daysUntilExpiry !== undefined && result.daysUntilExpiry < 30) {
      warnings.push('Dominio expira pronto');
      trustScore -= 20;
    }

    // Check if registrant info is hidden/privacy protected
    if (!result.registrant?.organization && !result.registrant?.name) {
      warnings.push('Informacion del propietario oculta');
      trustScore -= 10;
    }

    // Normalize score
    trustScore = Math.max(0, Math.min(100, trustScore));

    return {
      success: true,
      trustScore,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Parse contact information
   */
  private static parseContact(contact: Record<string, unknown> | undefined): WhoisContact | undefined {
    if (!contact) return undefined;

    return {
      name: contact.name as string | undefined,
      organization: contact.organization as string | undefined,
      street: contact.street1 as string | undefined,
      city: contact.city as string | undefined,
      state: contact.state as string | undefined,
      postalCode: contact.postalCode as string | undefined,
      country: contact.country as string | undefined,
      countryCode: contact.countryCode as string | undefined,
      email: contact.email as string | undefined,
      telephone: contact.telephone as string | undefined,
      fax: contact.fax as string | undefined,
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
