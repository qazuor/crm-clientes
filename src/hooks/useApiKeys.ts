'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiKeyResponse, CreateApiKeyDTO, UpdateApiKeyDTO } from '@/types/enrichment';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const API_KEYS_QUERY_KEY = ['api-keys'];

async function fetchApiKeys(): Promise<ApiKeyResponse[]> {
  const response = await fetch('/api/admin/api-keys');
  const data: ApiResponse<ApiKeyResponse[]> = await response.json();

  if (!data.success) {
    throw new Error(data.error ?? 'Error al obtener las API keys');
  }

  return data.data ?? [];
}

async function createApiKey(dto: CreateApiKeyDTO): Promise<ApiKeyResponse> {
  const response = await fetch('/api/admin/api-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data: ApiResponse<ApiKeyResponse> = await response.json();

  if (!data.success) {
    throw new Error(data.error ?? 'Error al crear la API key');
  }

  return data.data!;
}

async function updateApiKey({
  id,
  dto,
}: {
  id: string;
  dto: UpdateApiKeyDTO;
}): Promise<ApiKeyResponse> {
  const response = await fetch(`/api/admin/api-keys/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  const data: ApiResponse<ApiKeyResponse> = await response.json();

  if (!data.success) {
    throw new Error(data.error ?? 'Error al actualizar la API key');
  }

  return data.data!;
}

async function deleteApiKey(id: string): Promise<void> {
  const response = await fetch(`/api/admin/api-keys/${id}`, {
    method: 'DELETE',
  });
  const data: ApiResponse<void> = await response.json();

  if (!data.success) {
    throw new Error(data.error ?? 'Error al eliminar la API key');
  }
}

export function useApiKeys() {
  return useQuery({
    queryKey: API_KEYS_QUERY_KEY,
    queryFn: fetchApiKeys,
    staleTime: 30_000, // 30 seconds
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
    },
  });
}

export function useUpdateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
    },
  });
}

export function useToggleApiKey() {
  const { mutateAsync: updateKey, isPending } = useUpdateApiKey();

  const toggle = async (key: ApiKeyResponse) => {
    await updateKey({
      id: key.id,
      dto: { enabled: !key.enabled },
    });
  };

  return { toggle, isPending };
}
