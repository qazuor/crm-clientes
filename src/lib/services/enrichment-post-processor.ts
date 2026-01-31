/**
 * Enrichment Post-Processor
 * Enhances AI enrichment results with external API data
 * Called after ConsensusService to verify and augment results
 */

import { HunterService } from './external-apis/hunter-service';
import { SerpAPIService } from './external-apis/serpapi-service';
import { GooglePlacesService } from './external-apis/google-places-service';
import { GoogleSafeBrowsingService } from './external-apis/google-safe-browsing-service';
import { SocialMediaService, SocialProfile } from './social-media-service';
import { SettingsService } from './settings-service';
import { logger } from '@/lib/logger';
import type { EnrichmentResult } from './consensus-service';

export interface PostProcessorOptions {
  verifyEmails?: boolean;
  searchGoogleMaps?: boolean;
  searchGooglePlaces?: boolean;
  checkWebsiteSafety?: boolean;
  searchSocialProfiles?: boolean;
  companyName: string;
  location?: string;
  websiteUrl?: string;
}

export interface PostProcessorResult {
  enhancedResult: EnrichmentResult;
  socialProfiles?: SocialProfile[];
  externalDataUsed: string[];
  errors: string[];
}

/**
 * Post-processes AI enrichment results with external API verification
 */
export class EnrichmentPostProcessor {
  /**
   * Enhance AI results with external API data
   */
  static async process(
    aiResult: EnrichmentResult,
    options: PostProcessorOptions
  ): Promise<PostProcessorResult> {
    const externalDataUsed: string[] = [];
    const errors: string[] = [];

    // Clone the result to avoid mutation
    const enhancedResult: EnrichmentResult = JSON.parse(JSON.stringify(aiResult));

    // Get settings to check if external APIs are enabled
    await SettingsService.getEnrichmentSettings();

    // 1. Verify emails with Hunter.io
    if (options.verifyEmails !== false && enhancedResult.emails?.value) {
      try {
        const verifiedEmails = await this.verifyEmailsWithHunter(
          enhancedResult.emails.value
        );

        if (verifiedEmails.verified.length > 0) {
          enhancedResult.emails = {
            ...enhancedResult.emails,
            value: verifiedEmails.all,
            score: Math.min(enhancedResult.emails.score * 1.15, 1.0), // Boost score for verified
            source: `${enhancedResult.emails.source} (${verifiedEmails.verified.length} verificados con Hunter.io)`,
          };
          externalDataUsed.push('hunter_email_verify');
        }

        if (verifiedEmails.errors.length > 0) {
          errors.push(...verifiedEmails.errors);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error verificando emails';
        errors.push(`Hunter.io: ${msg}`);
        logger.warn('Hunter email verification failed', { error: err });
      }
    }

    // 2. Search Google Maps for business data via SerpAPI
    if (options.searchGoogleMaps !== false && options.companyName) {
      try {
        const mapsResult = await this.searchGoogleMaps(
          options.companyName,
          options.location
        );

        if (mapsResult.success) {
          // Enhance address if not found or low confidence
          if (mapsResult.address && (!enhancedResult.address?.value || enhancedResult.address.score < 0.7)) {
            enhancedResult.address = {
              value: mapsResult.address,
              score: 0.9, // High confidence from Google Maps
              source: 'Google Maps via SerpAPI',
              providers: enhancedResult.address?.providers || [],
              consensus: false,
            };
            externalDataUsed.push('serpapi_maps_address');
          }

          // Enhance phones if found
          if (mapsResult.phone) {
            const existingPhones = enhancedResult.phones?.value || [];
            const phoneExists = existingPhones.some(
              p => p.number.replace(/\D/g, '') === mapsResult.phone!.replace(/\D/g, '')
            );

            if (!phoneExists) {
              enhancedResult.phones = {
                value: [
                  { number: mapsResult.phone, type: 'business' },
                  ...existingPhones,
                ],
                score: Math.max(enhancedResult.phones?.score || 0, 0.9),
                source: 'Google Maps via SerpAPI + AI',
                providers: enhancedResult.phones?.providers || [],
                consensus: false,
              };
              externalDataUsed.push('serpapi_maps_phone');
            }
          }

          // Add industry if not found
          if (mapsResult.type && !enhancedResult.industry?.value) {
            enhancedResult.industry = {
              value: mapsResult.type,
              score: 0.85,
              source: 'Google Maps via SerpAPI',
              providers: [],
              consensus: false,
            };
            externalDataUsed.push('serpapi_maps_industry');
          }
        }

        if (mapsResult.error) {
          errors.push(`SerpAPI Maps: ${mapsResult.error}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error buscando en Google Maps';
        errors.push(`SerpAPI: ${msg}`);
        logger.warn('SerpAPI Google Maps search failed', { error: err });
      }
    }

    // 3. Search Google Places for detailed business info
    if (options.searchGooglePlaces !== false && options.companyName) {
      try {
        const placesResult = await this.searchGooglePlaces(
          options.companyName,
          options.location
        );

        if (placesResult.success && placesResult.place) {
          const place = placesResult.place;

          // Enhance address if not found or low confidence
          if (place.formattedAddress && (!enhancedResult.address?.value || enhancedResult.address.score < 0.8)) {
            enhancedResult.address = {
              value: place.formattedAddress,
              score: 0.95, // Very high confidence from Google Places
              source: 'Google Places API',
              providers: enhancedResult.address?.providers || [],
              consensus: false,
            };
            externalDataUsed.push('google_places_address');
          }

          // Enhance phone if found
          if (place.formattedPhoneNumber || place.internationalPhoneNumber) {
            const newPhone = place.internationalPhoneNumber || place.formattedPhoneNumber!;
            const existingPhones = enhancedResult.phones?.value || [];
            const phoneExists = existingPhones.some(
              p => p.number.replace(/\D/g, '') === newPhone.replace(/\D/g, '')
            );

            if (!phoneExists) {
              enhancedResult.phones = {
                value: [
                  { number: newPhone, type: 'business' },
                  ...existingPhones,
                ],
                score: Math.max(enhancedResult.phones?.score || 0, 0.95),
                source: 'Google Places API + AI',
                providers: enhancedResult.phones?.providers || [],
                consensus: false,
              };
              externalDataUsed.push('google_places_phone');
            }
          }

          // Enhance website if found
          if (place.website && (!enhancedResult.website?.value || enhancedResult.website.score < 0.8)) {
            enhancedResult.website = {
              value: place.website,
              score: 0.95,
              source: 'Google Places API',
              providers: enhancedResult.website?.providers || [],
              consensus: false,
            };
            externalDataUsed.push('google_places_website');
          }

          // Add industry from place types
          if (place.types && !enhancedResult.industry?.value) {
            const industry = GooglePlacesService.mapTypesToIndustry(place.types);
            if (industry) {
              enhancedResult.industry = {
                value: industry,
                score: 0.85,
                source: 'Google Places API',
                providers: [],
                consensus: false,
              };
              externalDataUsed.push('google_places_industry');
            }
          }

          // Add description with rating info
          if (place.rating && place.userRatingsTotal) {
            const ratingInfo = `Rating: ${place.rating}/5 (${place.userRatingsTotal} reseñas en Google)`;
            if (!enhancedResult.description?.value) {
              enhancedResult.description = {
                value: ratingInfo,
                score: 0.8,
                source: 'Google Places API',
                providers: [],
                consensus: false,
              };
            } else {
              enhancedResult.description.value += `\n${ratingInfo}`;
            }
            externalDataUsed.push('google_places_rating');
          }
        }

        if (placesResult.error) {
          errors.push(`Google Places: ${placesResult.error}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error buscando en Google Places';
        errors.push(`Google Places: ${msg}`);
        logger.warn('Google Places search failed', { error: err });
      }
    }

    // 4. Check website safety with Google Safe Browsing
    const websiteToCheck = options.websiteUrl || enhancedResult.website?.value;
    if (options.checkWebsiteSafety !== false && websiteToCheck) {
      try {
        const safetyResult = await GoogleSafeBrowsingService.checkUrl(websiteToCheck);

        if (safetyResult.success) {
          if (!safetyResult.isSafe && safetyResult.threats) {
            // Website has security issues - add warning to description
            const threatDescriptions = GoogleSafeBrowsingService.getAllThreatDescriptions(safetyResult.threats);
            const warningText = `⚠️ ADVERTENCIA DE SEGURIDAD: ${threatDescriptions.join('. ')}`;

            if (!enhancedResult.description?.value) {
              enhancedResult.description = {
                value: warningText,
                score: 1.0,
                source: 'Google Safe Browsing',
                providers: [],
                consensus: false,
              };
            } else {
              enhancedResult.description.value = `${warningText}\n\n${enhancedResult.description.value}`;
            }

            // Lower the website score since it's unsafe
            if (enhancedResult.website) {
              enhancedResult.website.score = Math.max(0.1, enhancedResult.website.score * 0.3);
              enhancedResult.website.source = `${enhancedResult.website.source} (⚠️ Sitio no seguro)`;
            }

            externalDataUsed.push('google_safe_browsing_unsafe');
            logger.warn('Website flagged as unsafe', {
              url: websiteToCheck,
              threats: safetyResult.threats.map(t => t.threatType),
            });
          } else {
            // Website is safe - optionally boost confidence
            if (enhancedResult.website) {
              enhancedResult.website.score = Math.min(1.0, enhancedResult.website.score * 1.05);
            }
            externalDataUsed.push('google_safe_browsing_safe');
          }
        }

        if (safetyResult.error) {
          errors.push(`Safe Browsing: ${safetyResult.error}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error verificando seguridad del sitio';
        errors.push(`Safe Browsing: ${msg}`);
        logger.warn('Google Safe Browsing check failed', { error: err });
      }
    }

    // 5. Search for social media profiles
    let socialProfiles: SocialProfile[] | undefined;
    if (options.searchSocialProfiles !== false && options.companyName) {
      try {
        const socialResult = await SocialMediaService.searchProfiles(
          options.companyName,
          options.websiteUrl
        );

        if (socialResult.success && socialResult.profiles.length > 0) {
          socialProfiles = socialResult.profiles;
          externalDataUsed.push('social_media_profiles');

          // Also update the enhancedResult.socialProfiles if it exists in the result type
          // Map profiles to a simple key-value format for storage
          const socialMap: Record<string, string> = {};
          for (const profile of socialResult.profiles) {
            socialMap[profile.platform] = profile.url;
          }

          // Add to result if we have profiles
          if (Object.keys(socialMap).length > 0) {
            enhancedResult.socialProfiles = {
              value: socialMap,
              score: 0.85,
              source: 'SerpAPI social search',
              providers: [],
              consensus: false,
            };
          }

          logger.debug('Social profiles found', {
            company: options.companyName,
            profileCount: socialResult.profiles.length,
            platforms: socialResult.profiles.map(p => p.platform),
          });
        }

        if (socialResult.errors && socialResult.errors.length > 0) {
          errors.push(...socialResult.errors.map(e => `Social: ${e}`));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error buscando perfiles sociales';
        errors.push(`Social Media: ${msg}`);
        logger.warn('Social media profile search failed', { error: err });
      }
    }

    return {
      enhancedResult,
      socialProfiles,
      externalDataUsed,
      errors,
    };
  }

  /**
   * Verify emails using Hunter.io
   */
  private static async verifyEmailsWithHunter(
    emails: Array<{ email: string; type: string }>
  ): Promise<{
    all: Array<{ email: string; type: string; verified?: boolean; status?: string }>;
    verified: Array<{ email: string; type: string }>;
    errors: string[];
  }> {
    const results: Array<{ email: string; type: string; verified?: boolean; status?: string }> = [];
    const verified: Array<{ email: string; type: string }> = [];
    const errors: string[] = [];

    // Limit verification to first 5 emails to conserve quota
    const emailsToVerify = emails.slice(0, 5);

    for (const emailData of emailsToVerify) {
      try {
        const result = await HunterService.verifyEmail(emailData.email);

        if (result.success) {
          const isValid = result.status === 'valid' || result.status === 'accept_all';
          results.push({
            ...emailData,
            verified: isValid,
            status: result.status,
          });

          if (isValid) {
            verified.push(emailData);
          }
        } else {
          // Keep email but mark as unverified
          results.push({
            ...emailData,
            verified: false,
            status: 'error',
          });
          if (result.error) {
            errors.push(`Email ${emailData.email}: ${result.error}`);
          }
        }
      } catch {
        results.push({
          ...emailData,
          verified: false,
          status: 'error',
        });
      }
    }

    // Add remaining emails (not verified due to quota limits)
    for (const emailData of emails.slice(5)) {
      results.push({
        ...emailData,
        verified: undefined, // Not verified
        status: 'not_checked',
      });
    }

    return { all: results, verified, errors };
  }

  /**
   * Search Google Maps for business information
   */
  private static async searchGoogleMaps(
    companyName: string,
    location?: string
  ): Promise<{
    success: boolean;
    name?: string;
    address?: string;
    phone?: string;
    website?: string;
    rating?: number;
    type?: string;
    error?: string;
  }> {
    // Use location if provided, otherwise try without
    const searchLocation = location || '';

    const result = await SerpAPIService.searchLocalBusiness(companyName, searchLocation);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      name: result.name,
      address: result.address,
      phone: result.phone,
      website: result.website,
      rating: result.rating,
      type: result.type,
    };
  }

  /**
   * Search Google Places for business information
   */
  private static async searchGooglePlaces(
    companyName: string,
    location?: string
  ): Promise<{
    success: boolean;
    place?: {
      formattedAddress?: string;
      formattedPhoneNumber?: string;
      internationalPhoneNumber?: string;
      website?: string;
      rating?: number;
      userRatingsTotal?: number;
      types?: string[];
    };
    error?: string;
  }> {
    const result = await GooglePlacesService.findBusiness(companyName, location);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    if (!result.place) {
      return { success: true, error: 'No se encontraron resultados' };
    }

    return {
      success: true,
      place: {
        formattedAddress: result.place.formattedAddress,
        formattedPhoneNumber: result.place.formattedPhoneNumber,
        internationalPhoneNumber: result.place.internationalPhoneNumber,
        website: result.place.website,
        rating: result.place.rating,
        userRatingsTotal: result.place.userRatingsTotal,
        types: result.place.types,
      },
    };
  }

  /**
   * Check if external APIs are available (have API keys)
   */
  static async getAvailableExternalApis(): Promise<{
    hunterAvailable: boolean;
    serpApiAvailable: boolean;
    googlePlacesAvailable: boolean;
    googleSafeBrowsingAvailable: boolean;
    socialProfilesAvailable: boolean; // Uses SerpAPI
  }> {
    const { ApiKeyService } = await import('./api-key-service');

    const [hunterKey, serpApiKey, placesKey, safeBrowsingKey] = await Promise.all([
      ApiKeyService.getDecryptedKey('hunter_io'),
      ApiKeyService.getDecryptedKey('serpapi'),
      ApiKeyService.getDecryptedKey('google_places'),
      ApiKeyService.getDecryptedKey('google_safe_browsing'),
    ]);

    return {
      hunterAvailable: !!hunterKey,
      serpApiAvailable: !!serpApiKey,
      googlePlacesAvailable: !!placesKey,
      googleSafeBrowsingAvailable: !!safeBrowsingKey,
      socialProfilesAvailable: !!serpApiKey, // Social profiles use SerpAPI
    };
  }
}
