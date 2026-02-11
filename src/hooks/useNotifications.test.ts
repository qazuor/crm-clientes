import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import {
  useNotifications,
  useMarkNotificationRead,
  useNotificationSystem,
} from './useNotifications';

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

const mockNotifications = {
  notifications: [
    { id: 'n-1', title: 'Test', message: 'Hello', read: false, createdAt: '2026-01-01' },
    { id: 'n-2', title: 'Test 2', message: 'World', read: true, createdAt: '2026-01-02' },
  ],
  unreadCount: 1,
};

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches notifications successfully', async () => {
    server.use(
      http.get('/api/notifications', () => {
        return HttpResponse.json(mockNotifications);
      }),
    );

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.notifications).toHaveLength(2);
    expect(result.current.data?.unreadCount).toBe(1);
  });

  it('passes unreadOnly parameter', async () => {
    let capturedUrl = '';
    server.use(
      http.get('/api/notifications', ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(mockNotifications);
      }),
    );

    const { result } = renderHook(() => useNotifications(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(capturedUrl).toContain('unreadOnly=true');
  });

  it('handles error response', async () => {
    server.use(
      http.get('/api/notifications', () => {
        return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }),
    );

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Unauthorized');
  });
});

describe('useMarkNotificationRead', () => {
  it('marks a single notification as read', async () => {
    let capturedBody: unknown = null;
    server.use(
      http.post('/api/notifications/read', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ success: true });
      }),
    );

    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ notificationId: 'n-1' });
    });

    expect(capturedBody).toEqual({ notificationId: 'n-1' });
  });

  it('marks all notifications as read', async () => {
    let capturedBody: unknown = null;
    server.use(
      http.post('/api/notifications/read', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ success: true });
      }),
    );

    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ markAll: true });
    });

    expect(capturedBody).toEqual({ markAll: true });
  });

  it('handles mark as read error', async () => {
    server.use(
      http.post('/api/notifications/read', () => {
        return HttpResponse.json({ error: 'Not found' }, { status: 404 });
      }),
    );

    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({ notificationId: 'invalid' });
      } catch {
        // Expected error
      }
    });

    expect(result.current.error?.message).toBe('Not found');
  });
});

describe('useNotificationSystem', () => {
  it('provides combined notification data and actions', async () => {
    server.use(
      http.get('/api/notifications', () => {
        return HttpResponse.json(mockNotifications);
      }),
    );

    const { result } = renderHook(() => useNotificationSystem(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.unreadCount).toBe(1);
    expect(typeof result.current.markAsRead).toBe('function');
    expect(typeof result.current.markAllAsRead).toBe('function');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('defaults to empty data when loading', () => {
    server.use(
      http.get('/api/notifications', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return HttpResponse.json(mockNotifications);
      }),
    );

    const { result } = renderHook(() => useNotificationSystem(), {
      wrapper: createWrapper(),
    });

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.isMarkingRead).toBe(false);
  });
});
