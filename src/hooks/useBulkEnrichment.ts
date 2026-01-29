/**
 * React Query hook for bulk enrichment
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface EnrichmentStats {
  totalClients: number;
  enrichedClients: number;
  analyzedWebsites: number;
  pendingEnrichment: number;
  pendingAnalysis: number;
}

interface PendingClient {
  id: string;
  nombre: string;
  sitioWeb: string | null;
  hasEnrichment: boolean;
  hasWebsiteAnalysis: boolean;
}

interface BulkEnrichmentStatsResponse {
  stats: EnrichmentStats;
  pendingClients: PendingClient[];
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

interface BulkEnrichmentOptions {
  clienteIds: string[];
  includeAI?: boolean;
  includeWebsiteAnalysis?: boolean;
}

async function fetchBulkEnrichmentStats(): Promise<BulkEnrichmentStatsResponse> {
  const response = await fetch('/api/admin/bulk-enrich');

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al obtener estadisticas');
  }

  return response.json();
}

async function runBulkEnrichment(options: BulkEnrichmentOptions): Promise<BulkEnrichmentResult> {
  const response = await fetch('/api/admin/bulk-enrich', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error en enriquecimiento');
  }

  return response.json();
}

/**
 * Hook to get bulk enrichment stats and pending clients
 */
export function useBulkEnrichmentStats() {
  return useQuery({
    queryKey: ['bulk-enrichment-stats'],
    queryFn: fetchBulkEnrichmentStats,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to run bulk enrichment
 */
export function useRunBulkEnrichment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runBulkEnrichment,
    onSuccess: () => {
      // Invalidate stats and clients queries
      queryClient.invalidateQueries({ queryKey: ['bulk-enrichment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/**
 * Combined hook for bulk enrichment
 */
export function useBulkEnrichment() {
  const statsQuery = useBulkEnrichmentStats();
  const enrichMutation = useRunBulkEnrichment();

  return {
    // Data
    stats: statsQuery.data?.stats ?? null,
    pendingClients: statsQuery.data?.pendingClients ?? [],
    isLoading: statsQuery.isLoading,
    isError: statsQuery.isError,
    error: statsQuery.error,

    // Actions
    enrich: (options: BulkEnrichmentOptions) => enrichMutation.mutateAsync(options),

    // Mutation state
    isEnriching: enrichMutation.isPending,
    enrichError: enrichMutation.error,
    enrichResult: enrichMutation.data,

    // Refetch
    refetch: statsQuery.refetch,
  };
}
