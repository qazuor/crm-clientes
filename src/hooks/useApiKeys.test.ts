import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { useApiKeys, useCreateApiKey, useDeleteApiKey, useToggleApiKey } from './useApiKeys';

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

const mockApiKeys = [
  { id: 'key-1', provider: 'openai', model: 'gpt-4o', enabled: true, maskedKey: 'sk-...abc', lastUsedAt: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'key-2', provider: 'deepseek', model: 'deepseek-chat', enabled: false, maskedKey: 'sk-...def', lastUsedAt: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
];

describe('useApiKeys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches API keys successfully', async () => {
    server.use(
      http.get('/api/admin/api-keys', () => {
        return HttpResponse.json({ success: true, data: mockApiKeys });
      }),
    );

    const { result } = renderHook(() => useApiKeys(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].provider).toBe('openai');
  });

  it('handles fetch error', async () => {
    server.use(
      http.get('/api/admin/api-keys', () => {
        return HttpResponse.json({ success: false, error: 'Forbidden' });
      }),
    );

    const { result } = renderHook(() => useApiKeys(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Forbidden');
  });

  it('returns empty array when data is undefined', async () => {
    server.use(
      http.get('/api/admin/api-keys', () => {
        return HttpResponse.json({ success: true });
      }),
    );

    const { result } = renderHook(() => useApiKeys(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });
});

describe('useCreateApiKey', () => {
  it('creates a new API key', async () => {
    const newKey = { id: 'key-3', provider: 'openai', model: 'gpt-4o', enabled: true, maskedKey: 'sk-...xyz', lastUsedAt: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
    server.use(
      http.post('/api/admin/api-keys', () => {
        return HttpResponse.json({ success: true, data: newKey });
      }),
    );

    const { result } = renderHook(() => useCreateApiKey(), {
      wrapper: createWrapper(),
    });

    let response: unknown;
    await act(async () => {
      response = await result.current.mutateAsync({
        provider: 'openai',
        apiKey: 'sk-test-key-1234',
        model: 'gpt-4o',
      });
    });

    expect(response).toEqual(newKey);
  });

  it('handles create error', async () => {
    server.use(
      http.post('/api/admin/api-keys', () => {
        return HttpResponse.json({ success: false, error: 'Duplicate name' });
      }),
    );

    const { result } = renderHook(() => useCreateApiKey(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          provider: 'openai',
          apiKey: 'sk-test-key-1234',
          model: 'gpt-4o',
        });
      } catch {
        // Expected error
      }
    });

    expect(result.current.error?.message).toBe('Duplicate name');
  });
});

describe('useDeleteApiKey', () => {
  it('deletes an API key', async () => {
    let deletedId = '';
    server.use(
      http.delete('/api/admin/api-keys/:id', ({ params }) => {
        deletedId = params.id as string;
        return HttpResponse.json({ success: true });
      }),
    );

    const { result } = renderHook(() => useDeleteApiKey(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync('key-1');
    });

    expect(deletedId).toBe('key-1');
  });
});

describe('useToggleApiKey', () => {
  it('toggles API key enabled state', async () => {
    let capturedBody: unknown = null;
    server.use(
      http.put('/api/admin/api-keys/:id', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          success: true,
          data: { ...mockApiKeys[0], enabled: false },
        });
      }),
    );

    const { result } = renderHook(() => useToggleApiKey(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.toggle(mockApiKeys[0] as unknown as Parameters<typeof result.current.toggle>[0]);
    });

    expect(capturedBody).toEqual({ enabled: false });
  });
});
