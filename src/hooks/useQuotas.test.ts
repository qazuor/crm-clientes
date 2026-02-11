import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import {
  useQuotaStatus,
  useQuotaHistory,
  useUpdateAlertThreshold,
  useResetQuota,
  useQuotas,
} from './useQuotas';

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

const mockQuotas = [
  {
    service: 'openai',
    used: 50,
    limit: 100,
    available: 50,
    percentage: 50,
    resetIn: '12h',
  },
  {
    service: 'pagespeed',
    used: 10,
    limit: 50,
    available: 40,
    percentage: 20,
    resetIn: '24h',
  },
];

const mockHistory = {
  history: {
    openai: [
      { date: '2026-01-01', used: 30, success: 28, errors: 2 },
    ],
  },
  alerts: [
    { service: 'openai', percentage: 80, used: 80, limit: 100, threshold: 75 },
  ],
  timestamp: '2026-02-08T12:00:00Z',
};

describe('useQuotaStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches quotas successfully', async () => {
    server.use(
      http.get('/api/quotas', () => {
        return HttpResponse.json({ success: true, data: mockQuotas });
      }),
    );

    const { result } = renderHook(() => useQuotaStatus(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].service).toBe('openai');
  });

  it('handles quota fetch error', async () => {
    server.use(
      http.get('/api/quotas', () => {
        return HttpResponse.json({ success: false, error: 'Service unavailable' });
      }),
    );

    const { result } = renderHook(() => useQuotaStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Service unavailable');
  });
});

describe('useQuotaHistory', () => {
  it('fetches quota history', async () => {
    server.use(
      http.get('/api/quotas/history', () => {
        return HttpResponse.json({ success: true, data: mockHistory });
      }),
    );

    const { result } = renderHook(() => useQuotaHistory(7), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.history.openai).toHaveLength(1);
    expect(result.current.data?.alerts).toHaveLength(1);
  });

  it('passes days parameter in URL', async () => {
    let capturedUrl = '';
    server.use(
      http.get('/api/quotas/history', ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ success: true, data: mockHistory });
      }),
    );

    const { result } = renderHook(() => useQuotaHistory(14), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(capturedUrl).toContain('days=14');
  });
});

describe('useUpdateAlertThreshold', () => {
  it('updates alert threshold', async () => {
    let capturedBody: unknown = null;
    server.use(
      http.put('/api/quotas/history', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          success: true,
          data: { service: 'openai', threshold: 90 },
        });
      }),
    );

    const { result } = renderHook(() => useUpdateAlertThreshold(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ service: 'openai', threshold: 90 });
    });

    expect(capturedBody).toEqual({ service: 'openai', threshold: 90 });
  });
});

describe('useResetQuota', () => {
  it('resets a quota', async () => {
    let capturedBody: unknown = null;
    server.use(
      http.post('/api/quotas', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ success: true });
      }),
    );

    const { result } = renderHook(() => useResetQuota(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync('openai');
    });

    expect(capturedBody).toEqual({ action: 'reset', service: 'openai' });
  });
});

describe('useQuotas', () => {
  it('provides combined quota data with computed totals', async () => {
    server.use(
      http.get('/api/quotas', () => {
        return HttpResponse.json({ success: true, data: mockQuotas });
      }),
      http.get('/api/quotas/history', () => {
        return HttpResponse.json({ success: true, data: mockHistory });
      }),
    );

    const { result } = renderHook(() => useQuotas(7), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Computed totals: 50+10 = 60 used, 100+50 = 150 limit
    expect(result.current.quotas).toHaveLength(2);
    expect(result.current.totalUsed).toBe(60);
    expect(result.current.totalLimit).toBe(150);
    expect(result.current.totalPercentage).toBeCloseTo(40, 0);

    // History and alerts
    expect(result.current.alerts).toHaveLength(1);
    expect(Object.keys(result.current.history)).toContain('openai');

    // Actions are functions
    expect(typeof result.current.updateThreshold).toBe('function');
    expect(typeof result.current.resetQuota).toBe('function');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('defaults to empty when loading', () => {
    server.use(
      http.get('/api/quotas', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return HttpResponse.json({ success: true, data: mockQuotas });
      }),
      http.get('/api/quotas/history', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return HttpResponse.json({ success: true, data: mockHistory });
      }),
    );

    const { result } = renderHook(() => useQuotas(), {
      wrapper: createWrapper(),
    });

    expect(result.current.quotas).toEqual([]);
    expect(result.current.totalUsed).toBe(0);
    expect(result.current.totalLimit).toBe(0);
    expect(result.current.totalPercentage).toBe(0);
    expect(result.current.history).toEqual({});
    expect(result.current.alerts).toEqual([]);
  });
});
