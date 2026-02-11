import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { useEnrichment } from './useEnrichment';

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

const mockEnrichmentData = {
  latestEnrichment: {
    id: 'enr-1',
    status: 'PENDING',
    enrichedAt: '2026-02-08T10:00:00Z',
    provider: 'openai',
    website: 'https://example.com',
    industry: 'Technology',
    description: 'A tech company',
    companySize: '50-200',
    address: null,
    emails: ['test@example.com'],
    phones: [],
    socialProfiles: { linkedin: 'https://linkedin.com/in/test' },
    fieldStatuses: {},
    confidence: 0.85,
  },
  websiteAnalysis: {
    url: 'https://example.com',
    title: 'Example Corp',
    screenshotUrl: null,
  },
  history: [
    { id: 'enr-1', provider: 'openai', status: 'PENDING', enrichedAt: '2026-02-08T10:00:00Z' },
  ],
  enrichmentStatus: 'PENDING_REVIEW',
  currentClientValues: {
    website: 'https://old-site.com',
    industry: 'Retail',
    description: null,
    address: null,
    email: 'old@example.com',
    phone: null,
    socialProfiles: {
      facebook: null,
      instagram: null,
      linkedin: null,
      twitter: null,
      whatsapp: null,
    },
  },
};

const mockBulkStats = {
  stats: {
    totalClients: 100,
    enrichedClients: 40,
    analyzedWebsites: 20,
    pendingEnrichment: 60,
    pendingAnalysis: 30,
    confirmedClients: 10,
    pendingConfirmation: 5,
  },
  pendingClients: [{ id: 'c-1', nombre: 'Client 1', sitioWeb: null, hasEnrichment: false, hasWebsiteAnalysis: false }],
  pendingConfirmation: [],
  availableAIProviders: ['openai', 'deepseek'],
};

describe('useEnrichment (single-client mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches enrichment data for a client', async () => {
    server.use(
      http.get('/api/clientes/:id/enrich', () => {
        return HttpResponse.json(mockEnrichmentData);
      }),
    );

    const { result } = renderHook(() => useEnrichment('client-123'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.latestEnrichment?.id).toBe('enr-1');
    expect(result.current.enrichmentStatus).toBe('PENDING_REVIEW');
    expect(result.current.history).toHaveLength(1);
    expect(result.current.websiteAnalysis?.url).toBe('https://example.com');
    expect(result.current.currentClientValues?.website).toBe('https://old-site.com');
  });

  it('derives field statuses from enrichment data when fieldStatuses is empty', async () => {
    server.use(
      http.get('/api/clientes/:id/enrich', () => {
        return HttpResponse.json(mockEnrichmentData);
      }),
    );

    const { result } = renderHook(() => useEnrichment('client-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should derive PENDING fields from non-null values
    expect(result.current.fieldStatuses).not.toBeNull();
    expect(result.current.fieldStatuses?.website).toBe('PENDING');
    expect(result.current.fieldStatuses?.industry).toBe('PENDING');
    expect(result.current.fieldStatuses?.description).toBe('PENDING');
    expect(result.current.fieldStatuses?.companySize).toBe('PENDING');
    expect(result.current.fieldStatuses?.emails).toBe('PENDING');
    expect(result.current.fieldStatuses?.socialProfiles).toBe('PENDING');
    // address is null, phones is empty -> should not be in derived statuses
    expect(result.current.fieldStatuses?.address).toBeUndefined();
    expect(result.current.fieldStatuses?.phones).toBeUndefined();
  });

  it('computes pending fields from field statuses', async () => {
    server.use(
      http.get('/api/clientes/:id/enrich', () => {
        return HttpResponse.json(mockEnrichmentData);
      }),
    );

    const { result } = renderHook(() => useEnrichment('client-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pendingFields.length).toBeGreaterThan(0);
    expect(result.current.pendingFields).toContain('website');
    expect(result.current.pendingFields).toContain('industry');
    expect(result.current.isPending).toBe(true);
  });

  it('computes cooldown info', async () => {
    server.use(
      http.get('/api/clientes/:id/enrich', () => {
        return HttpResponse.json(mockEnrichmentData);
      }),
    );

    const { result } = renderHook(() => useEnrichment('client-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.cooldown.lastEnrichedAt).toBeInstanceOf(Date);
    expect(typeof result.current.cooldown.hoursAgo).toBe('number');
    expect(typeof result.current.cooldown.shouldWarn).toBe('boolean');
  });

  it('handles fetch error', async () => {
    server.use(
      http.get('/api/clientes/:id/enrich', () => {
        return HttpResponse.json({ error: 'Not found' }, { status: 404 });
      }),
    );

    const { result } = renderHook(() => useEnrichment('client-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Not found');
  });

  it('triggers enrich mutation', async () => {
    server.use(
      http.get('/api/clientes/:id/enrich', () => {
        return HttpResponse.json(mockEnrichmentData);
      }),
      http.post('/api/clientes/:id/enrich', () => {
        return HttpResponse.json({ success: true, enrichmentId: 'enr-2' });
      }),
    );

    const { result } = renderHook(() => useEnrichment('client-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.enrich({});
    });

    expect(result.current.isEnriching).toBe(false);
  });

  it('triggers review mutation for confirm', async () => {
    let capturedBody: unknown = null;
    server.use(
      http.get('/api/clientes/:id/enrich', () => {
        return HttpResponse.json(mockEnrichmentData);
      }),
      http.patch('/api/clientes/:id/enrich', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ success: true, updated: ['website'] });
      }),
    );

    const { result } = renderHook(() => useEnrichment('client-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.confirmField('website');
    });

    expect(capturedBody).toEqual({
      action: 'confirm',
      fields: ['website'],
    });
  });

  it('defaults to empty state without clienteId', () => {
    const { result } = renderHook(() => useEnrichment(), {
      wrapper: createWrapper(),
    });

    expect(result.current.latestEnrichment).toBeNull();
    expect(result.current.history).toEqual([]);
    expect(result.current.enrichmentStatus).toBe('NONE');
    expect(result.current.pendingFields).toEqual([]);
    expect(result.current.fieldStatuses).toBeNull();
  });
});

describe('useEnrichment (bulk mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches bulk stats when no clienteId provided', async () => {
    server.use(
      http.get('/api/admin/bulk-enrich', () => {
        return HttpResponse.json(mockBulkStats);
      }),
    );

    const { result } = renderHook(() => useEnrichment(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.bulk.isLoading).toBe(false);
    });

    expect(result.current.bulk.stats?.totalClients).toBe(100);
    expect(result.current.bulk.pendingClients).toHaveLength(1);
    expect(result.current.bulk.availableAIProviders).toContain('openai');
  });

  it('triggers bulk enrich mutation', async () => {
    let capturedBody: unknown = null;
    server.use(
      http.get('/api/admin/bulk-enrich', () => {
        return HttpResponse.json(mockBulkStats);
      }),
      http.post('/api/admin/bulk-enrich', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ success: true, processed: 5 });
      }),
    );

    const { result } = renderHook(() => useEnrichment(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.bulk.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.bulk.enrich({ clienteIds: ['c-1'], provider: 'openai' });
    });

    expect(capturedBody).toEqual({ clienteIds: ['c-1'], provider: 'openai' });
  });

  it('triggers bulk confirm batch', async () => {
    let capturedBody: unknown = null;
    server.use(
      http.get('/api/admin/bulk-enrich', () => {
        return HttpResponse.json(mockBulkStats);
      }),
      http.patch('/api/admin/bulk-enrich', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ success: true, confirmed: 2 });
      }),
    );

    const { result } = renderHook(() => useEnrichment(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.bulk.isLoading).toBe(false);
    });

    const items = [
      { clienteId: 'c-1', fields: ['website'] },
      { clienteId: 'c-2', fields: ['industry'] },
    ];

    await act(async () => {
      await result.current.bulk.confirmBatch(items);
    });

    expect(capturedBody).toEqual({ action: 'confirm', items });
  });

  it('defaults bulk data when loading', () => {
    server.use(
      http.get('/api/admin/bulk-enrich', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return HttpResponse.json(mockBulkStats);
      }),
    );

    const { result } = renderHook(() => useEnrichment(), {
      wrapper: createWrapper(),
    });

    expect(result.current.bulk.stats).toBeNull();
    expect(result.current.bulk.pendingClients).toEqual([]);
    expect(result.current.bulk.pendingConfirmation).toEqual([]);
    expect(result.current.bulk.availableAIProviders).toEqual([]);
  });
});
