/**
 * React Query hook for AI-powered client enrichment
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EnrichmentResult } from '@/lib/services/consensus-service';

interface ClienteEnrichment {
  id: string;
  clienteId: string;
  website: string | null;
  websiteScore: number | null;
  emails: Array<{ email: string; type: string }> | null;
  phones: Array<{ number: string; type: string }> | null;
  address: string | null;
  addressScore: number | null;
  description: string | null;
  descriptionScore: number | null;
  industry: string | null;
  industryScore: number | null;
  companySize: string | null;
  companySizeScore: number | null;
  socialProfiles: Record<string, string> | null;
  aiProvidersUsed: string[] | null;
  enrichedAt: string | null;
}

interface EnrichmentResponse {
  enrichment: ClienteEnrichment | null;
}

interface EnrichClientResponse {
  success: boolean;
  enrichment: ClienteEnrichment;
  result: EnrichmentResult;
  externalDataUsed?: string[];
  errors: Array<{ provider: string; error: string }>;
}

interface EnrichClientOptions {
  fields?: string[];
  quick?: boolean;
  // External API options
  useExternalApis?: boolean;
  verifyEmails?: boolean;
  searchGoogleMaps?: boolean;
}

async function fetchEnrichment(clienteId: string): Promise<EnrichmentResponse> {
  const response = await fetch(`/api/clientes/${clienteId}/enrich`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al obtener enriquecimiento');
  }

  return response.json();
}

async function enrichClient(
  clienteId: string,
  options?: EnrichClientOptions
): Promise<EnrichClientResponse> {
  const response = await fetch(`/api/clientes/${clienteId}/enrich`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options || {}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error en enriquecimiento');
  }

  return response.json();
}

/**
 * Hook to get AI enrichment data for a client
 */
export function useAIEnrichmentData(clienteId: string | undefined) {
  return useQuery({
    queryKey: ['ai-enrichment', clienteId],
    queryFn: () => fetchEnrichment(clienteId!),
    enabled: !!clienteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to trigger AI client enrichment
 */
export function useEnrichClientAI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clienteId,
      options,
    }: {
      clienteId: string;
      options?: EnrichClientOptions;
    }) => enrichClient(clienteId, options),
    onSuccess: (data, variables) => {
      // Invalidate enrichment query
      queryClient.invalidateQueries({
        queryKey: ['ai-enrichment', variables.clienteId],
      });
      // Also invalidate client data since we may have updated it
      queryClient.invalidateQueries({
        queryKey: ['cliente', variables.clienteId],
      });
      queryClient.invalidateQueries({
        queryKey: ['clientes'],
      });
    },
  });
}

/**
 * Combined hook for AI enrichment functionality
 */
export function useAIEnrichment(clienteId: string | undefined) {
  const enrichmentQuery = useAIEnrichmentData(clienteId);
  const enrichMutation = useEnrichClientAI();

  return {
    // Data
    enrichment: enrichmentQuery.data?.enrichment ?? null,
    isLoading: enrichmentQuery.isLoading,
    isError: enrichmentQuery.isError,
    error: enrichmentQuery.error,

    // Actions
    enrich: (options?: EnrichClientOptions) => {
      if (!clienteId) return;
      return enrichMutation.mutateAsync({ clienteId, options });
    },
    quickEnrich: () => {
      if (!clienteId) return;
      return enrichMutation.mutateAsync({ clienteId, options: { quick: true } });
    },
    enrichWithExternalApis: (externalOptions?: { verifyEmails?: boolean; searchGoogleMaps?: boolean }) => {
      if (!clienteId) return;
      return enrichMutation.mutateAsync({
        clienteId,
        options: {
          useExternalApis: true,
          verifyEmails: externalOptions?.verifyEmails ?? true,
          searchGoogleMaps: externalOptions?.searchGoogleMaps ?? true,
        },
      });
    },

    // Mutation state
    isEnriching: enrichMutation.isPending,
    enrichError: enrichMutation.error,
    enrichResult: enrichMutation.data,

    // Refetch
    refetch: enrichmentQuery.refetch,
  };
}
