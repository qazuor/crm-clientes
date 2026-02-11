import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import {
  useEnrichmentSettings,
  useUpdateEnrichmentSettings,
  useResetEnrichmentSettings,
  useUpdateSetting,
} from './useEnrichmentSettings';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const mockSettings = {
  id: 'settings-1',
  temperature: 0.3,
  topP: 0.9,
  matchMode: 'fuzzy',
  minConfidenceScore: 0.7,
  requireVerification: true,
  maxResultsPerField: 3,
  enableScreenshots: true,
  enablePageSpeed: true,
  enableSsl: true,
  enableTechStack: true,
  enableSeo: true,
  enableAccessibility: true,
  enableSecurity: true,
  enableCrawlability: true,
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('useEnrichmentSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches settings successfully', async () => {
    server.use(
      http.get('/api/admin/settings/enrichment', () => {
        return HttpResponse.json({ success: true, data: mockSettings });
      }),
    );

    const { result } = renderHook(() => useEnrichmentSettings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.temperature).toBe(0.3);
    expect(result.current.data?.matchMode).toBe('fuzzy');
  });

  it('handles fetch error', async () => {
    server.use(
      http.get('/api/admin/settings/enrichment', () => {
        return HttpResponse.json({ success: false, error: 'Not authorized' });
      }),
    );

    const { result } = renderHook(() => useEnrichmentSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Not authorized');
  });
});

describe('useUpdateEnrichmentSettings', () => {
  it('updates settings successfully', async () => {
    const updatedSettings = { ...mockSettings, enableScreenshots: false };
    server.use(
      http.put('/api/admin/settings/enrichment', () => {
        return HttpResponse.json({ success: true, data: updatedSettings });
      }),
    );

    const { result } = renderHook(() => useUpdateEnrichmentSettings(), {
      wrapper: createWrapper(),
    });

    let response: unknown;
    await act(async () => {
      response = await result.current.mutateAsync({ enableScreenshots: false });
    });

    expect(response).toEqual(updatedSettings);
  });

  it('handles update error', async () => {
    server.use(
      http.put('/api/admin/settings/enrichment', () => {
        return HttpResponse.json({ success: false, error: 'Invalid value' });
      }),
    );

    const { result } = renderHook(() => useUpdateEnrichmentSettings(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({ enableScreenshots: false });
      } catch {
        // Expected error
      }
    });

    expect(result.current.error?.message).toBe('Invalid value');
  });
});

describe('useResetEnrichmentSettings', () => {
  it('resets settings to defaults', async () => {
    server.use(
      http.post('/api/admin/settings/enrichment', () => {
        return HttpResponse.json({ success: true, data: mockSettings });
      }),
    );

    const { result } = renderHook(() => useResetEnrichmentSettings(), {
      wrapper: createWrapper(),
    });

    let response: unknown;
    await act(async () => {
      response = await result.current.mutateAsync();
    });

    expect(response).toEqual(mockSettings);
  });
});

describe('useUpdateSetting', () => {
  it('updates a single setting key', async () => {
    let capturedBody: unknown = null;
    server.use(
      http.put('/api/admin/settings/enrichment', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ success: true, data: { ...mockSettings, maxResultsPerField: 5 } });
      }),
    );

    const { result } = renderHook(() => useUpdateSetting(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.updateSetting('maxResultsPerField', 5);
    });

    expect(capturedBody).toEqual({ maxResultsPerField: 5 });
  });
});
