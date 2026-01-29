'use client';

import { useState, useCallback } from 'react';

export interface EnrichmentStatus {
  isLoading: boolean;
  lastResult: unknown;
  error: string | null;
}

export interface UseEnrichmentOptions {
  onSuccess?: (result: unknown) => void;
  onError?: (error: string) => void;
}

export function useEnrichment(options: UseEnrichmentOptions = {}) {
  const [status, setStatus] = useState<EnrichmentStatus>({
    isLoading: false,
    lastResult: null,
    error: null
  });

  const enrich = useCallback(async (clienteId: string, services: string[] = ['screenshots', 'pagespeed']) => {
    if (!clienteId) {
      const error = 'Cliente ID requerido';
      setStatus(prev => ({ ...prev, error }));
      options.onError?.(error);
      return;
    }

    setStatus({
      isLoading: true,
      lastResult: null,
      error: null
    });

    try {
      const response = await fetch('/api/enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clienteId,
          services
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      setStatus({
        isLoading: false,
        lastResult: result,
        error: null
      });

      options.onSuccess?.(result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      setStatus({
        isLoading: false,
        lastResult: null,
        error: errorMessage
      });

      options.onError?.(errorMessage);
      throw error;
    }
  }, [options]);

  const getEnrichmentData = useCallback(async (clienteId: string) => {
    try {
      const response = await fetch(`/api/enrichment?clienteId=${clienteId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      return result.data;

    } catch (error) {
      console.error('Error obteniendo datos de enriquecimiento:', error);
      return null;
    }
  }, []);

  const clearStatus = useCallback(() => {
    setStatus({
      isLoading: false,
      lastResult: null,
      error: null
    });
  }, []);

  return {
    ...status,
    enrich,
    getEnrichmentData,
    clearStatus
  };
}

export default useEnrichment;