/**
 * Utility functions for enrichment field status management
 * and mapping enrichment fields to client record updates.
 */

import type { FieldReviewStatus, ReviewableField } from '@/types/enrichment';

/** Network name to field name mapping for social profiles. */
const NETWORK_FIELD_MAP: Readonly<Record<string, string>> = {
  facebook: 'social_facebook',
  instagram: 'social_instagram',
  linkedin: 'social_linkedin',
  twitter: 'social_twitter',
  whatsapp: 'social_whatsapp',
  youtube: 'social_youtube',
  tiktok: 'social_tiktok',
} as const;

/** Client-model social fields (subset that has dedicated columns). */
const CLIENT_SOCIAL_FIELDS = new Set(['facebook', 'instagram', 'linkedin', 'twitter', 'whatsapp']);

/**
 * Build fieldStatuses JSON from enrichment data.
 * Only includes fields that have non-null values, all set to PENDING.
 * Social profiles are split into individual network fields.
 */
export function buildFieldStatuses(
  enrichmentData: Record<string, unknown>,
): Record<string, FieldReviewStatus> {
  const statuses: Record<string, FieldReviewStatus> = {};

  // Basic fields mapping (excludes socialProfiles - handled separately)
  const basicFieldMapping: Readonly<Record<string, string | string[]>> = {
    website: 'website',
    industry: 'industry',
    description: 'description',
    companySize: 'companySize',
    address: 'address',
    emails: 'emails',
    phones: 'phones',
  };

  for (const [field, keys] of Object.entries(basicFieldMapping)) {
    const keyList = Array.isArray(keys) ? keys : [keys];
    const hasData = keyList.some((k) => {
      const val = enrichmentData[k];
      if (val == null) return false;
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed.length > 0;
          if (typeof parsed === 'object') return Object.keys(parsed as Record<string, unknown>).length > 0;
        } catch {
          // Not JSON, treat as regular string
        }
        return val.length > 0;
      }
      return true;
    });

    if (hasData) {
      statuses[field] = 'PENDING';
    }
  }

  // Handle socialProfiles - create individual entries for each network found
  const socialProfilesRaw = enrichmentData.socialProfiles;
  if (socialProfilesRaw) {
    let profiles: Record<string, string> | null = null;

    if (typeof socialProfilesRaw === 'string') {
      try {
        profiles = JSON.parse(socialProfilesRaw);
      } catch {
        profiles = null;
      }
    } else if (typeof socialProfilesRaw === 'object' && socialProfilesRaw !== null) {
      profiles = socialProfilesRaw as Record<string, string>;
    }

    if (profiles) {
      for (const [network, fieldName] of Object.entries(NETWORK_FIELD_MAP)) {
        if (profiles[network] && typeof profiles[network] === 'string' && profiles[network].length > 0) {
          statuses[fieldName] = 'PENDING';
        }
      }
    }
  }

  return statuses;
}

/** Parse a JSON string or return the value if already an object/array. */
function parseJsonField<T>(val: unknown): T | null {
  if (val == null) return null;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T;
    } catch {
      return null;
    }
  }
  return val as T;
}

/**
 * Get the client update data for a single confirmed enrichment field.
 * Maps enrichment field names to the corresponding Cliente model columns.
 */
export function getFieldUpdateData(
  field: ReviewableField,
  enrichment: Record<string, unknown>,
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};

  switch (field) {
    case 'website':
      if (enrichment.website) updateData.sitioWeb = enrichment.website;
      break;
    case 'industry':
      if (enrichment.industry) updateData.industria = enrichment.industry;
      break;
    case 'description':
      if (enrichment.description) updateData.notas = enrichment.description;
      break;
    case 'address':
      if (enrichment.address) updateData.direccion = enrichment.address;
      break;
    case 'socialProfiles': {
      const profiles = parseJsonField<Record<string, string>>(enrichment.socialProfiles);
      if (profiles) {
        for (const network of CLIENT_SOCIAL_FIELDS) {
          if (profiles[network]) updateData[network] = profiles[network];
        }
      }
      break;
    }
    case 'emails': {
      const emailsArray = parseJsonField<Array<Record<string, string>>>(enrichment.emails);
      if (Array.isArray(emailsArray) && emailsArray.length > 0) {
        const first = emailsArray[0];
        const emailValue = first.value ?? first.email ?? first;
        if (typeof emailValue === 'string') updateData.email = emailValue;
      }
      break;
    }
    case 'phones': {
      const phonesArray = parseJsonField<Array<Record<string, string>>>(enrichment.phones);
      if (Array.isArray(phonesArray) && phonesArray.length > 0) {
        const first = phonesArray[0];
        const phoneValue = first.value ?? first.number ?? first;
        if (typeof phoneValue === 'string') updateData.telefono = phoneValue;
      }
      break;
    }
    // Individual social network fields
    case 'social_facebook':
    case 'social_instagram':
    case 'social_linkedin':
    case 'social_twitter':
    case 'social_whatsapp':
    case 'social_youtube':
    case 'social_tiktok': {
      const network = field.replace('social_', '');
      const profiles = parseJsonField<Record<string, string>>(enrichment.socialProfiles);
      if (profiles?.[network] && CLIENT_SOCIAL_FIELDS.has(network)) {
        updateData[network] = profiles[network];
      }
      break;
    }
    // companySize: no direct client mapping (no field in Cliente model)
  }

  return updateData;
}
