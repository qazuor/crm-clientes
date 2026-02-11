/**
 * Helper functions for external API calls used during enrichment post-processing.
 * Extracted from enrichment-post-processor.ts.
 */

import { HunterService } from './external-apis/hunter-service';
import { SerpAPIService } from './external-apis/serpapi-service';
import { GooglePlacesService } from './external-apis/google-places-service';

/** Verify emails using Hunter.io API. */
export async function verifyEmailsWithHunter(
  emails: ReadonlyArray<{ email: string; type: string }>,
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
      verified: undefined,
      status: 'not_checked',
    });
  }

  return { all: results, verified, errors };
}

/** Search Google Maps for business information via SerpAPI. */
export async function searchGoogleMaps(
  companyName: string,
  location?: string,
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

/** Search Google Places for detailed business information. */
export async function searchGooglePlaces(
  companyName: string,
  location?: string,
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
