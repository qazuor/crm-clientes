/**
 * Social URL Validator Service
 * Validates that social network URLs discovered by AI are accessible before showing them to users
 */

import { UrlVerificationService } from './url-verification-service';
import { validateUrl } from '@/lib/url-validator';
import { logger } from '@/lib/logger';

export interface SocialUrlValidationResult {
  url: string;
  isAccessible: boolean;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

export interface SocialUrlValidationSummary {
  validatedProfiles: Record<string, string>;
  validationResults: Record<string, SocialUrlValidationResult>;
  accessibleCount: number;
  totalCount: number;
}

const SOCIAL_URL_TIMEOUT_MS = 5000;

/**
 * Social URL Validator Service
 * Validates social network URLs for accessibility before presenting to users
 */
export class SocialUrlValidatorService {
  /**
   * Validate multiple social URLs in parallel
   * Returns only accessible URLs and validation metadata
   */
  static async validateSocialUrls(
    profiles: Record<string, string>
  ): Promise<SocialUrlValidationSummary> {
    const validationResults: Record<string, SocialUrlValidationResult> = {};
    const validatedProfiles: Record<string, string> = {};

    const entries = Object.entries(profiles).filter(
      ([, url]) => url && typeof url === 'string' && url.trim().length > 0
    );

    const totalCount = entries.length;

    if (totalCount === 0) {
      return {
        validatedProfiles: {},
        validationResults: {},
        accessibleCount: 0,
        totalCount: 0,
      };
    }

    logger.info('[SocialUrlValidator] Starting validation', {
      totalUrls: totalCount,
      networks: entries.map(([network]) => network),
    });

    const validationPromises = entries.map(async ([network, url]) => {
      const result = await this.validateSingleUrl(url, network);
      return { network, url, result };
    });

    const results = await Promise.allSettled(validationPromises);

    let accessibleCount = 0;

    for (const settledResult of results) {
      if (settledResult.status === 'fulfilled') {
        const { network, url, result } = settledResult.value;
        validationResults[network] = result;

        if (result.isAccessible) {
          validatedProfiles[network] = result.url || url;
          accessibleCount++;
        }
      } else {
        logger.warn('[SocialUrlValidator] Validation promise rejected', {
          reason: settledResult.reason instanceof Error
            ? settledResult.reason.message
            : String(settledResult.reason),
        });
      }
    }

    logger.info('[SocialUrlValidator] Validation complete', {
      totalCount,
      accessibleCount,
      removedCount: totalCount - accessibleCount,
    });

    return {
      validatedProfiles,
      validationResults,
      accessibleCount,
      totalCount,
    };
  }

  /**
   * Validate a single social URL
   */
  static async validateSingleUrl(
    url: string,
    network?: string
  ): Promise<SocialUrlValidationResult> {
    const result: SocialUrlValidationResult = {
      url,
      isAccessible: false,
    };

    try {
      // First, validate URL format and SSRF protection
      const ssrfValidation = validateUrl(url);
      if (!ssrfValidation.valid) {
        result.error = ssrfValidation.error || 'Invalid URL format';
        logger.debug('[SocialUrlValidator] SSRF validation failed', {
          network,
          url,
          error: result.error,
        });
        return result;
      }

      // Use normalized URL from SSRF validation
      const normalizedUrl = ssrfValidation.normalizedUrl || url;
      result.url = normalizedUrl;

      // Verify accessibility with reduced timeout for social networks
      const verification = await UrlVerificationService.verifyAccessibility(
        normalizedUrl,
        SOCIAL_URL_TIMEOUT_MS
      );

      result.isAccessible = verification.isAccessible;
      result.statusCode = verification.statusCode;
      result.responseTime = verification.responseTime;

      if (!verification.isAccessible) {
        result.error = verification.error || `HTTP ${verification.statusCode}`;
      }

      // Use the final URL after redirects
      if (verification.redirectUrl) {
        result.url = verification.redirectUrl;
      } else if (verification.url) {
        result.url = verification.url;
      }

      logger.debug('[SocialUrlValidator] URL validation result', {
        network,
        originalUrl: url,
        finalUrl: result.url,
        isAccessible: result.isAccessible,
        statusCode: result.statusCode,
        responseTime: result.responseTime,
      });
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Validation failed';
      logger.warn('[SocialUrlValidator] Validation error', {
        network,
        url,
        error: result.error,
      });
    }

    return result;
  }

  /**
   * Validate individual social_* fields from enrichment result
   * Returns a map of field names to validated values (null if not accessible)
   */
  static async validateIndividualSocialFields(
    fields: Record<string, { value?: string | null }>
  ): Promise<Record<string, string | null>> {
    const socialFieldPrefixes = ['social_'];
    const validatedFields: Record<string, string | null> = {};

    const socialEntries = Object.entries(fields).filter(
      ([fieldName, fieldData]) =>
        socialFieldPrefixes.some((prefix) => fieldName.startsWith(prefix)) &&
        fieldData?.value &&
        typeof fieldData.value === 'string' &&
        fieldData.value.trim().length > 0
    );

    if (socialEntries.length === 0) {
      return validatedFields;
    }

    logger.info('[SocialUrlValidator] Validating individual social fields', {
      fieldCount: socialEntries.length,
      fields: socialEntries.map(([name]) => name),
    });

    const validationPromises = socialEntries.map(async ([fieldName, fieldData]) => {
      const url = fieldData.value as string;
      const result = await this.validateSingleUrl(url, fieldName);
      return { fieldName, result };
    });

    const results = await Promise.allSettled(validationPromises);

    for (const settledResult of results) {
      if (settledResult.status === 'fulfilled') {
        const { fieldName, result } = settledResult.value;
        validatedFields[fieldName] = result.isAccessible ? result.url : null;
      }
    }

    return validatedFields;
  }
}
