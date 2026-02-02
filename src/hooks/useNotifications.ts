/**
 * React Query hook for notifications
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Notification } from '@/lib/services/notification-service';

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

async function fetchNotifications(unreadOnly?: boolean): Promise<NotificationsResponse> {
  const params = new URLSearchParams();
  if (unreadOnly) params.set('unreadOnly', 'true');

  const response = await fetch(`/api/notifications?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al obtener notificaciones');
  }

  return response.json();
}

async function markAsRead(notificationId?: string, markAll?: boolean): Promise<void> {
  const response = await fetch('/api/notifications/read', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notificationId, markAll }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al marcar notificacion');
  }
}

/**
 * Hook to get user notifications
 */
export function useNotifications(unreadOnly?: boolean) {
  return useQuery({
    queryKey: ['notifications', unreadOnly],
    queryFn: () => fetchNotifications(unreadOnly),
    refetchInterval: 60000, // Refetch every minute
    refetchIntervalInBackground: false, // Stop polling when tab is not visible
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to mark notifications as read
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ notificationId, markAll }: { notificationId?: string; markAll?: boolean }) =>
      markAsRead(notificationId, markAll),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/**
 * Combined hook for notification functionality
 */
export function useNotificationSystem() {
  const notificationsQuery = useNotifications();
  const markReadMutation = useMarkNotificationRead();

  return {
    // Data
    notifications: notificationsQuery.data?.notifications ?? [],
    unreadCount: notificationsQuery.data?.unreadCount ?? 0,
    isLoading: notificationsQuery.isLoading,
    isError: notificationsQuery.isError,
    error: notificationsQuery.error,

    // Actions
    markAsRead: (notificationId: string) => markReadMutation.mutateAsync({ notificationId }),
    markAllAsRead: () => markReadMutation.mutateAsync({ markAll: true }),

    // Mutation state
    isMarkingRead: markReadMutation.isPending,

    // Refetch
    refetch: notificationsQuery.refetch,
  };
}
