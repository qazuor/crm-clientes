'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { EnrichmentSettings, UpdateEnrichmentSettingsDTO } from '@/types/enrichment';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const SETTINGS_QUERY_KEY = ['enrichment-settings'];

async function fetchSettings(): Promise<EnrichmentSettings> {
  const response = await fetch('/api/admin/settings/enrichment');
  const data: ApiResponse<EnrichmentSettings> = await response.json();

  if (!data.success) {
    throw new Error(data.error ?? 'Error al obtener la configuracion');
  }

  return data.data!;
}

async function updateSettings(
  dto: UpdateEnrichmentSettingsDTO
): Promise<EnrichmentSettings> {
  const response = await fetch('/api/admin/settings/enrichment', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data: ApiResponse<EnrichmentSettings> = await response.json();

  if (!data.success) {
    throw new Error(data.error ?? 'Error al actualizar la configuracion');
  }

  return data.data!;
}

async function resetSettings(): Promise<EnrichmentSettings> {
  const response = await fetch('/api/admin/settings/enrichment', {
    method: 'POST',
  });
  const data: ApiResponse<EnrichmentSettings> = await response.json();

  if (!data.success) {
    throw new Error(data.error ?? 'Error al restaurar la configuracion');
  }

  return data.data!;
}

export function useEnrichmentSettings() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: fetchSettings,
    staleTime: 60_000, // 1 minute
  });
}

export function useUpdateEnrichmentSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(SETTINGS_QUERY_KEY, data);
    },
  });
}

export function useResetEnrichmentSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(SETTINGS_QUERY_KEY, data);
    },
  });
}

// Hook to update a single setting
export function useUpdateSetting() {
  const { mutateAsync: updateAll, isPending } = useUpdateEnrichmentSettings();

  const updateSetting = async <K extends keyof UpdateEnrichmentSettingsDTO>(
    key: K,
    value: UpdateEnrichmentSettingsDTO[K]
  ) => {
    await updateAll({ [key]: value });
  };

  return { updateSetting, isPending };
}
