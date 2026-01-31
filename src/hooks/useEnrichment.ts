/**
 * Unified React Query hook for client enrichment.
 *
 * Replaces the former useAIEnrichment, useBulkEnrichment, and legacy useEnrichment hooks.
 *
 * Usage:
 *   const e = useEnrichment(clienteId)   // single-client mode
 *   const e = useEnrichment()             // bulk-only mode
 */
'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AIProvider,
  EnrichmentMode,
  FieldReviewAction,
  FieldReviewStatus,
  EnrichmentHistoryEntry,
  EnrichmentStatusEnum,
  ClienteEnrichmentData,
  WebsiteAnalysisData,
  CooldownInfo,
} from '@/types/enrichment';

// ─── API response shapes ───────────────────────────────────────────────

/** GET /api/clientes/[id]/enrich */
interface EnrichmentGetResponse {
  latestEnrichment: ClienteEnrichmentData | null;
  websiteAnalysis: WebsiteAnalysisData | null;
  history: EnrichmentHistoryEntry[];
  enrichmentStatus: EnrichmentStatusEnum;
}

/** POST /api/clientes/[id]/enrich  (mode=ai) */
interface EnrichPostAIResponse {
  success: boolean;
  enrichment: ClienteEnrichmentData;
  result: Record<string, unknown>;
  externalDataUsed?: string[];
  errors: Array<{ provider: string; error: string }>;
  cooldownWarning: boolean;
  hoursAgo: number | null;
}

/** POST /api/clientes/[id]/enrich  (mode=web) */
interface EnrichPostWebResponse {
  success: boolean;
  websiteAnalysis: WebsiteAnalysisData;
  cooldownWarning: boolean;
  hoursAgo: number | null;
}

type EnrichPostResponse = EnrichPostAIResponse | EnrichPostWebResponse;

/** PATCH /api/clientes/[id]/enrich */
interface FieldReviewResponse {
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

interface BulkEnrichmentResult {
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

interface BulkStatsResponse {
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

interface BatchConfirmRejectResult {
  success: boolean;
  confirmed?: number;
  rejected?: number;
  errors?: string[];
}

// ─── Fetch helpers ─────────────────────────────────────────────────────

async function fetchEnrichment(clienteId: string): Promise<EnrichmentGetResponse> {
  const res = await fetch(`/api/clientes/${clienteId}/enrich`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error al obtener enriquecimiento');
  }
  return res.json();
}

async function postEnrich(clienteId: string, options: EnrichOptions): Promise<EnrichPostResponse> {
  const res = await fetch(`/api/clientes/${clienteId}/enrich`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error en enriquecimiento');
  }
  return res.json();
}

async function patchReview(
  clienteId: string,
  options: ReviewFieldsOptions
): Promise<FieldReviewResponse> {
  const res = await fetch(`/api/clientes/${clienteId}/enrich`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error al procesar revision');
  }
  return res.json();
}

async function fetchBulkStats(): Promise<BulkStatsResponse> {
  const res = await fetch('/api/admin/bulk-enrich');
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error al obtener estadisticas');
  }
  return res.json();
}

async function postBulkEnrich(options: BulkEnrichmentOptions): Promise<BulkEnrichmentResult> {
  const res = await fetch('/api/admin/bulk-enrich', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error en enriquecimiento en bloque');
  }
  return res.json();
}

async function patchBulkReview(
  action: 'confirm' | 'reject',
  items: BatchFieldItem[]
): Promise<BatchConfirmRejectResult> {
  const res = await fetch('/api/admin/bulk-enrich', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, items }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Error al procesar accion en bloque');
  }
  return res.json();
}

// ─── Hook ──────────────────────────────────────────────────────────────

export function useEnrichment(clienteId?: string) {
  const queryClient = useQueryClient();

  // ── Single-client query (only when clienteId provided) ──
  const dataQuery = useQuery({
    queryKey: ['enrichment', clienteId],
    queryFn: () => fetchEnrichment(clienteId!),
    enabled: !!clienteId,
    staleTime: 5 * 60 * 1000,
  });

  // ── Bulk stats query ──
  const bulkStatsQuery = useQuery({
    queryKey: ['bulk-enrichment-stats'],
    queryFn: fetchBulkStats,
    staleTime: 60_000,
    enabled: !clienteId, // only fetch when in bulk mode
  });

  // ── Invalidation helpers ──
  const invalidateSingle = () => {
    if (!clienteId) return;
    queryClient.invalidateQueries({ queryKey: ['enrichment', clienteId] });
    queryClient.invalidateQueries({ queryKey: ['cliente', clienteId] });
    queryClient.invalidateQueries({ queryKey: ['clientes'] });
  };

  const invalidateBulk = () => {
    queryClient.invalidateQueries({ queryKey: ['bulk-enrichment-stats'] });
    queryClient.invalidateQueries({ queryKey: ['clientes'] });
    queryClient.invalidateQueries({ queryKey: ['enrichment'] });
  };

  // ── Single-client mutations ──
  const enrichMutation = useMutation({
    mutationFn: (opts: EnrichOptions) => {
      if (!clienteId) throw new Error('clienteId requerido');
      return postEnrich(clienteId, opts);
    },
    onSuccess: invalidateSingle,
  });

  const reviewMutation = useMutation({
    mutationFn: (opts: ReviewFieldsOptions) => {
      if (!clienteId) throw new Error('clienteId requerido');
      return patchReview(clienteId, opts);
    },
    onSuccess: invalidateSingle,
  });

  // ── Bulk mutations ──
  const bulkEnrichMutation = useMutation({
    mutationFn: postBulkEnrich,
    onSuccess: invalidateBulk,
  });

  const bulkConfirmMutation = useMutation({
    mutationFn: (items: BatchFieldItem[]) => patchBulkReview('confirm', items),
    onSuccess: invalidateBulk,
  });

  const bulkRejectMutation = useMutation({
    mutationFn: (items: BatchFieldItem[]) => patchBulkReview('reject', items),
    onSuccess: invalidateBulk,
  });

  // ── Derived data (single-client) ──
  const latestEnrichment = dataQuery.data?.latestEnrichment ?? null;
  const websiteAnalysis = dataQuery.data?.websiteAnalysis ?? null;
  const history = dataQuery.data?.history ?? [];
  const enrichmentStatus = dataQuery.data?.enrichmentStatus ?? ('NONE' as EnrichmentStatusEnum);

  const fieldStatuses: Record<string, FieldReviewStatus> | null = (() => {
    if (!latestEnrichment) return null;
    if (
      latestEnrichment.fieldStatuses &&
      Object.keys(latestEnrichment.fieldStatuses).length > 0
    ) {
      return latestEnrichment.fieldStatuses;
    }
    // Derive from non-null fields
    if (latestEnrichment.status !== 'PENDING') return null;
    const derived: Record<string, FieldReviewStatus> = {};
    if (latestEnrichment.website) derived.website = 'PENDING';
    if (latestEnrichment.industry) derived.industry = 'PENDING';
    if (latestEnrichment.description) derived.description = 'PENDING';
    if (latestEnrichment.companySize) derived.companySize = 'PENDING';
    if (latestEnrichment.address) derived.address = 'PENDING';
    if (
      latestEnrichment.emails &&
      Array.isArray(latestEnrichment.emails) &&
      latestEnrichment.emails.length > 0
    )
      derived.emails = 'PENDING';
    if (
      latestEnrichment.phones &&
      Array.isArray(latestEnrichment.phones) &&
      latestEnrichment.phones.length > 0
    )
      derived.phones = 'PENDING';
    if (
      latestEnrichment.socialProfiles &&
      typeof latestEnrichment.socialProfiles === 'object' &&
      Object.keys(latestEnrichment.socialProfiles).length > 0
    )
      derived.socialProfiles = 'PENDING';
    return Object.keys(derived).length > 0 ? derived : null;
  })();

  const pendingFields = fieldStatuses
    ? Object.entries(fieldStatuses)
        .filter(([, s]) => s === 'PENDING')
        .map(([f]) => f)
    : [];

  // Cooldown info
  const cooldown: CooldownInfo = useMemo(() => {
    if (!latestEnrichment?.enrichedAt)
      return { shouldWarn: false, lastEnrichedAt: null, hoursAgo: null };
    const enrichedDate = new Date(latestEnrichment.enrichedAt);
    // eslint-disable-next-line react-hooks/purity -- Date.now() is intentional for cooldown calculation
    const hoursAgo = (Date.now() - enrichedDate.getTime()) / (1000 * 60 * 60);
    return {
      shouldWarn: hoursAgo < 24,
      lastEnrichedAt: enrichedDate,
      hoursAgo: Math.round(hoursAgo * 10) / 10,
    };
  }, [latestEnrichment?.enrichedAt]);

  return {
    // ── Single-client data ──
    latestEnrichment,
    websiteAnalysis,
    history,
    enrichmentStatus,
    fieldStatuses,
    pendingFields,
    cooldown,
    isPending: latestEnrichment?.status === 'PENDING',
    isLoading: dataQuery.isLoading,
    isError: dataQuery.isError,
    error: dataQuery.error,

    // ── Single-client actions ──
    enrich: (opts?: EnrichOptions) => enrichMutation.mutateAsync(opts ?? {}),
    quickEnrich: () => enrichMutation.mutateAsync({ quick: true }),
    enrichWeb: () => enrichMutation.mutateAsync({ mode: 'web' }),
    enrichWithProvider: (provider: AIProvider) =>
      enrichMutation.mutateAsync({ provider }),

    // ── Field review actions ──
    confirmFields: (fields: string[], enrichmentId?: string) =>
      reviewMutation.mutateAsync({ action: 'confirm', fields, enrichmentId }),
    rejectFields: (fields: string[], enrichmentId?: string) =>
      reviewMutation.mutateAsync({ action: 'reject', fields, enrichmentId }),
    editFields: (
      fields: string[],
      editedValues: Record<string, unknown>,
      enrichmentId?: string
    ) =>
      reviewMutation.mutateAsync({
        action: 'edit',
        fields,
        editedValues,
        enrichmentId,
      }),

    confirmField: (field: string) =>
      reviewMutation.mutateAsync({ action: 'confirm', fields: [field] }),
    rejectField: (field: string) =>
      reviewMutation.mutateAsync({ action: 'reject', fields: [field] }),
    editField: (field: string, value: unknown) =>
      reviewMutation.mutateAsync({
        action: 'edit',
        fields: [field],
        editedValues: { [field]: value },
      }),

    confirmAllPending: () => {
      if (pendingFields.length === 0) return Promise.resolve(undefined);
      return reviewMutation.mutateAsync({
        action: 'confirm',
        fields: pendingFields,
      });
    },
    rejectAllPending: () => {
      if (pendingFields.length === 0) return Promise.resolve(undefined);
      return reviewMutation.mutateAsync({
        action: 'reject',
        fields: pendingFields,
      });
    },

    // ── Mutation states ──
    isEnriching: enrichMutation.isPending,
    isReviewing: reviewMutation.isPending,
    enrichError: enrichMutation.error,
    enrichResult: enrichMutation.data as EnrichPostResponse | undefined,
    reviewResult: reviewMutation.data,

    // ── Bulk operations ──
    bulk: {
      stats: bulkStatsQuery.data?.stats ?? null,
      pendingClients: bulkStatsQuery.data?.pendingClients ?? [],
      pendingConfirmation: bulkStatsQuery.data?.pendingConfirmation ?? [],
      availableAIProviders: bulkStatsQuery.data?.availableAIProviders ?? [],
      isLoading: bulkStatsQuery.isLoading,
      isError: bulkStatsQuery.isError,
      error: bulkStatsQuery.error,

      enrich: (opts: BulkEnrichmentOptions) =>
        bulkEnrichMutation.mutateAsync(opts),
      confirmBatch: (items: BatchFieldItem[]) =>
        bulkConfirmMutation.mutateAsync(items),
      rejectBatch: (items: BatchFieldItem[]) =>
        bulkRejectMutation.mutateAsync(items),

      isEnriching: bulkEnrichMutation.isPending,
      isConfirming: bulkConfirmMutation.isPending,
      isRejecting: bulkRejectMutation.isPending,
      enrichResult: bulkEnrichMutation.data,

      refetch: bulkStatsQuery.refetch,
    },

    // ── Refetch ──
    refetch: dataQuery.refetch,
    invalidate: () => {
      invalidateSingle();
      invalidateBulk();
    },
  };
}
