/**
 * Type definitions for the useEnrichment hook.
 * API response shapes, request options, and bulk operation types.
 */

import type {
  AIProvider,
  EnrichmentMode,
  FieldReviewAction,
  FieldReviewStatus,
  EnrichmentHistoryEntry,
  EnrichmentStatusEnum,
  ClienteEnrichmentData,
  WebsiteAnalysisData,
} from '@/types/enrichment';

// ─── API response shapes ───────────────────────────────────────────────

/** Current client values for comparison in review UI */
export interface CurrentClientValues {
  website: string | null;
  industry: string | null;
  description: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  socialProfiles: {
    facebook: string | null;
    instagram: string | null;
    linkedin: string | null;
    twitter: string | null;
    whatsapp: string | null;
  };
}

/** GET /api/clientes/[id]/enrich */
export interface EnrichmentGetResponse {
  latestEnrichment: ClienteEnrichmentData | null;
  websiteAnalysis: WebsiteAnalysisData | null;
  history: EnrichmentHistoryEntry[];
  enrichmentStatus: EnrichmentStatusEnum;
  currentClientValues?: CurrentClientValues;
}

/** POST /api/clientes/[id]/enrich  (mode=ai) */
export interface EnrichPostAIResponse {
  success: boolean;
  enrichment: ClienteEnrichmentData;
  result: Record<string, unknown>;
  externalDataUsed?: string[];
  errors: Array<{ provider: string; error: string }>;
  cooldownWarning: boolean;
  hoursAgo: number | null;
}

/** POST /api/clientes/[id]/enrich  (mode=web) */
export interface EnrichPostWebResponse {
  success: boolean;
  websiteAnalysis: WebsiteAnalysisData;
  cooldownWarning: boolean;
  hoursAgo: number | null;
}

export type EnrichPostResponse = EnrichPostAIResponse | EnrichPostWebResponse;

/** PATCH /api/clientes/[id]/enrich */
export interface FieldReviewResponse {
  success: boolean;
  action: FieldReviewAction;
  fields: string[];
  fieldStatuses: Record<string, FieldReviewStatus>;
  allReviewed: boolean;
  enrichmentStatus: string;
}

/** POST options for single-client enrichment */
export interface EnrichOptions {
  mode?: EnrichmentMode;
  provider?: AIProvider | 'auto';
  quick?: boolean;
  fields?: string[];
  useExternalApis?: boolean;
  verifyEmails?: boolean;
  searchGoogleMaps?: boolean;
  confidenceThreshold?: number;
}

/** PATCH options for field review */
export interface ReviewFieldsOptions {
  action: FieldReviewAction;
  fields: string[];
  editedValues?: Record<string, unknown>;
  enrichmentId?: string;
}

// ─── Bulk types ────────────────────────────────────────────────────────

export interface BulkEnrichmentOptions {
  clienteIds: string[];
  includeAI?: boolean;
  includeWebsiteAnalysis?: boolean;
  provider?: AIProvider | 'auto';
}

export interface BulkEnrichmentResult {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    clienteId: string;
    clienteName: string;
    success: boolean;
    aiEnriched?: boolean;
    websiteAnalyzed?: boolean;
    error?: string;
  }>;
}

export interface BulkStatsResponse {
  stats: {
    totalClients: number;
    enrichedClients: number;
    analyzedWebsites: number;
    pendingEnrichment: number;
    pendingAnalysis: number;
    confirmedClients: number;
    pendingConfirmation: number;
  };
  pendingClients: Array<{
    id: string;
    nombre: string;
    sitioWeb: string | null;
    hasEnrichment: boolean;
    hasWebsiteAnalysis: boolean;
  }>;
  pendingConfirmation: Array<{
    id: string;
    clienteId: string;
    clienteName: string;
    website: string | null;
    industry: string | null;
    description: string | null;
    companySize: string | null;
    address: string | null;
    emails: Array<{ email: string; type?: string }> | null;
    phones: Array<{ number: string; type?: string }> | null;
    socialProfiles: Record<string, string> | null;
    websiteScore: number | null;
    industryScore: number | null;
    descriptionScore: number | null;
    companySizeScore: number | null;
    addressScore: number | null;
    aiProvidersUsed: string[] | null;
    enrichedAt: string | null;
    currentWebsite: string | null;
    currentIndustry: string | null;
    currentDescription: string | null;
    fieldStatuses: Record<string, string> | null;
  }>;
  availableAIProviders: string[];
}

export interface BatchFieldItem {
  clienteId: string;
  fields: string[];
}

export interface BatchConfirmRejectResult {
  success: boolean;
  confirmed?: number;
  rejected?: number;
  errors?: string[];
}
