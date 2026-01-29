/**
 * React Query hooks for quota management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface QuotaInfo {
  service: string;
  used: number;
  limit: number;
  available: number;
  percentage: number;
  resetIn: string;
  successCount?: number;
  errorCount?: number;
  lastError?: string | null;
  lastErrorAt?: Date | null;
  alertThreshold?: number;
  isNearLimit?: boolean;
}

export interface QuotaHistoryEntry {
  date: string;
  used: number;
  success: number;
  errors: number;
}

export interface QuotaAlert {
  service: string;
  percentage: number;
  used: number;
  limit: number;
  threshold: number;
}

interface QuotasResponse {
  success: boolean;
  data: QuotaInfo[];
  error?: string;
}

interface QuotaHistoryResponse {
  success: boolean;
  data: {
    history: Record<string, QuotaHistoryEntry[]>;
    alerts: QuotaAlert[];
    timestamp: string;
  };
  error?: string;
}

async function fetchQuotas(): Promise<QuotaInfo[]> {
  const response = await fetch('/api/quotas');
  const data: QuotasResponse = await response.json();

  if (!data.success) {
    throw new Error(data.error ?? 'Error al obtener quotas');
  }

  return data.data ?? [];
}

async function fetchQuotaHistory(days: number = 7): Promise<{
  history: Record<string, QuotaHistoryEntry[]>;
  alerts: QuotaAlert[];
}> {
  const response = await fetch(`/api/quotas/history?days=${days}`);
  const data: QuotaHistoryResponse = await response.json();

  if (!data.success) {
    throw new Error(data.error ?? 'Error al obtener historial de quotas');
  }

  return {
    history: data.data.history,
    alerts: data.data.alerts,
  };
}

async function updateAlertThreshold(
  service: string,
  threshold: number
): Promise<{ service: string; threshold: number }> {
  const response = await fetch('/api/quotas/history', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service, threshold }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error ?? 'Error al actualizar threshold');
  }

  return { service: data.data.service, threshold: data.data.threshold };
}

async function resetQuota(service: string): Promise<void> {
  const response = await fetch('/api/quotas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reset', service }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error ?? 'Error al resetear quota');
  }
}

/**
 * Hook to get current quota status
 */
export function useQuotaStatus() {
  return useQuery({
    queryKey: ['quotas'],
    queryFn: fetchQuotas,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

/**
 * Hook to get quota history
 */
export function useQuotaHistory(days: number = 7) {
  return useQuery({
    queryKey: ['quotas-history', days],
    queryFn: () => fetchQuotaHistory(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to update alert threshold
 */
export function useUpdateAlertThreshold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ service, threshold }: { service: string; threshold: number }) =>
      updateAlertThreshold(service, threshold),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotas'] });
      queryClient.invalidateQueries({ queryKey: ['quotas-history'] });
    },
  });
}

/**
 * Hook to reset a quota
 */
export function useResetQuota() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (service: string) => resetQuota(service),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotas'] });
    },
  });
}

/**
 * Combined hook for quota management
 */
export function useQuotas(historyDays: number = 7) {
  const statusQuery = useQuotaStatus();
  const historyQuery = useQuotaHistory(historyDays);
  const updateThresholdMutation = useUpdateAlertThreshold();
  const resetMutation = useResetQuota();

  // Calculate totals
  const quotas = statusQuery.data ?? [];
  const totalUsed = quotas.reduce((sum, q) => sum + q.used, 0);
  const totalLimit = quotas.reduce((sum, q) => sum + q.limit, 0);
  const totalPercentage = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

  return {
    // Current status
    quotas,
    totalUsed,
    totalLimit,
    totalPercentage,
    isLoading: statusQuery.isLoading,
    isError: statusQuery.isError,
    error: statusQuery.error,
    refetch: statusQuery.refetch,

    // History
    history: historyQuery.data?.history ?? {},
    alerts: historyQuery.data?.alerts ?? [],
    isLoadingHistory: historyQuery.isLoading,
    historyError: historyQuery.error,

    // Actions
    updateThreshold: (service: string, threshold: number) =>
      updateThresholdMutation.mutateAsync({ service, threshold }),
    resetQuota: (service: string) => resetMutation.mutateAsync(service),
    isUpdating: updateThresholdMutation.isPending,
    isResetting: resetMutation.isPending,
  };
}
