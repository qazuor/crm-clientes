/**
 * React Query hook for website analysis
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WebsiteAnalysisResult } from '@/lib/services/website-analysis-service';

interface WebsiteAnalysis {
  id: string;
  clienteId: string;
  url: string;
  // SSL
  sslValid: boolean | null;
  sslProtocol: string | null;
  sslIssuer: string | null;
  sslExpiresAt: string | null;
  // Performance
  performanceScore: number | null;
  mobileScore: number | null;
  desktopScore: number | null;
  fcpMs: number | null;
  lcpMs: number | null;
  ttiMs: number | null;
  cls: number | null;
  // SEO
  seoTitle: string | null;
  seoDescription: string | null;
  seoH1Count: number | null;
  seoHasCanonical: boolean | null;
  seoIndexable: boolean | null;
  hasOpenGraph: boolean | null;
  hasTwitterCards: boolean | null;
  hasJsonLd: boolean | null;
  jsonLdTypes: string[] | null;
  // Tech Stack
  techStack: {
    technologies?: Array<{ name: string; category: string; confidence: number }>;
    categories?: Record<string, string[]>;
  } | null;
  // Security
  hasHttps: boolean | null;
  hstsEnabled: boolean | null;
  xFrameOptions: string | null;
  hasCsp: boolean | null;
  isSafeBrowsing: boolean | null;
  // Accessibility
  accessibilityScore: number | null;
  accessibilityIssues: Array<{
    severity: string;
    rule: string;
    message: string;
    count?: number;
  }> | null;
  // Crawlability
  hasRobotsTxt: boolean | null;
  robotsAllowsIndex: boolean | null;
  hasSitemap: boolean | null;
  sitemapUrl: string | null;
  sitemapUrlCount: number | null;
  // Responsive
  hasViewportMeta: boolean | null;
  breakpoints: string[] | null;
  mediaQueriesCount: number | null;
  isResponsive?: boolean;
  responsiveConfidence?: 'high' | 'medium' | 'low';
  // Server (IP-API)
  serverLocation: string | null;
  serverIp: string | null;
  serverIsp: string | null;
  serverCountry: string | null;
  serverCity: string | null;
  isHosting: boolean | null;
  // Domain (WhoisXML)
  domainRegistrar: string | null;
  domainCreatedAt: string | null;
  domainExpiresAt: string | null;
  domainAgeYears: number | null;
  daysUntilExpiry: number | null;
  whoisOwner: string | null;
  whoisCountry: string | null;
  // Favicon
  faviconUrl: string | null;
  // Screenshots
  screenshotDesktop: string | null;
  screenshotMobile: string | null;
  // Metadata
  apisUsed: string[] | null;
  analyzedAt: string | null;
}

interface AnalysisResponse {
  analysis: WebsiteAnalysis | null;
}

interface RunAnalysisResponse {
  success: boolean;
  analysis: WebsiteAnalysisResult;
  errors: string[];
}

interface AnalysisOptions {
  // Basic analysis
  includeScreenshots?: boolean;
  includePageSpeed?: boolean;
  includeSsl?: boolean;
  includeSeo?: boolean;
  includeTechStack?: boolean;
  includeSecurity?: boolean;
  includeAccessibility?: boolean;
  includeCrawlability?: boolean;
  includeResponsive?: boolean;
  // External APIs (opt-in)
  includeBuiltWith?: boolean;
  // Free APIs (default enabled)
  includeServerLocation?: boolean;
  includeFavicon?: boolean;
  // Paid APIs (opt-in)
  includeWhois?: boolean;
  // Quick mode
  quick?: boolean;
}

async function fetchAnalysis(clienteId: string): Promise<AnalysisResponse> {
  const response = await fetch(`/api/clientes/${clienteId}/analyze`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al obtener analisis');
  }

  return response.json();
}

async function runAnalysis(
  clienteId: string,
  options?: AnalysisOptions
): Promise<RunAnalysisResponse> {
  const response = await fetch(`/api/clientes/${clienteId}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options || {}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error en analisis');
  }

  return response.json();
}

/**
 * Hook to get website analysis data for a client
 */
export function useWebsiteAnalysisData(clienteId: string | undefined) {
  return useQuery({
    queryKey: ['website-analysis', clienteId],
    queryFn: () => fetchAnalysis(clienteId!),
    enabled: !!clienteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to trigger website analysis
 */
export function useRunWebsiteAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clienteId,
      options,
    }: {
      clienteId: string;
      options?: AnalysisOptions;
    }) => runAnalysis(clienteId, options),
    onSuccess: (data, variables) => {
      // Invalidate analysis query
      queryClient.invalidateQueries({
        queryKey: ['website-analysis', variables.clienteId],
      });
      // Also invalidate client data since we may have updated screenshots
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
 * Combined hook for website analysis functionality
 */
export function useWebsiteAnalysis(clienteId: string | undefined) {
  const analysisQuery = useWebsiteAnalysisData(clienteId);
  const analysisMutation = useRunWebsiteAnalysis();

  return {
    // Data
    analysis: analysisQuery.data?.analysis ?? null,
    isLoading: analysisQuery.isLoading,
    isError: analysisQuery.isError,
    error: analysisQuery.error,

    // Actions
    analyze: (options?: AnalysisOptions) => {
      if (!clienteId) return;
      return analysisMutation.mutateAsync({ clienteId, options });
    },
    quickAnalyze: () => {
      if (!clienteId) return;
      return analysisMutation.mutateAsync({ clienteId, options: { quick: true } });
    },
    analyzeWithExternalApis: (externalOptions?: { includeBuiltWith?: boolean; includeWhois?: boolean }) => {
      if (!clienteId) return;
      return analysisMutation.mutateAsync({
        clienteId,
        options: {
          includeBuiltWith: externalOptions?.includeBuiltWith ?? true,
          includeWhois: externalOptions?.includeWhois ?? false,
          includeServerLocation: true,
          includeFavicon: true,
        },
      });
    },

    // Mutation state
    isAnalyzing: analysisMutation.isPending,
    analyzeError: analysisMutation.error,
    analyzeResult: analysisMutation.data,

    // Refetch
    refetch: analysisQuery.refetch,
  };
}
