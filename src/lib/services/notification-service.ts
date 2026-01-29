/**
 * In-App Notification Service
 * Handles notifications for enrichment results and other events
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export type NotificationType =
  | 'enrichment_complete'
  | 'enrichment_failed'
  | 'bulk_enrichment_complete'
  | 'analysis_complete'
  | 'analysis_failed'
  | 'quota_warning'
  | 'quota_exceeded'
  | 'system';

export interface CreateNotificationDTO {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
}

/**
 * Notification Service
 */
export class NotificationService {
  /**
   * Create a new notification
   */
  static async create(data: CreateNotificationDTO): Promise<Notification> {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          link: data.link ?? null,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        },
      });

      logger.info('Notification created', { userId: data.userId, type: data.type });

      return {
        ...notification,
        type: notification.type as NotificationType,
      };
    } catch (error) {
      logger.error('Failed to create notification', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  static async getForUser(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number }
  ): Promise<Notification[]> {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(options?.unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
    });

    return notifications.map((n) => ({
      ...n,
      type: n.type as NotificationType,
    }));
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, read: false },
    });
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(id: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return result.count;
  }

  /**
   * Delete old notifications (older than 30 days)
   */
  static async cleanup(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        read: true,
      },
    });

    logger.info('Cleaned up old notifications', { deleted: result.count });

    return result.count;
  }

  // ============== Helper methods for common notifications ==============

  /**
   * Notify user that enrichment completed
   */
  static async notifyEnrichmentComplete(
    userId: string,
    clienteId: string,
    clienteName: string,
    fieldsEnriched: string[]
  ): Promise<Notification> {
    return this.create({
      userId,
      type: 'enrichment_complete',
      title: 'Enriquecimiento completado',
      message: `Se enriqueció ${clienteName} con ${fieldsEnriched.length} campos: ${fieldsEnriched.join(', ')}`,
      link: `/clientes/${clienteId}`,
      metadata: { clienteId, fieldsEnriched },
    });
  }

  /**
   * Notify user that enrichment failed
   */
  static async notifyEnrichmentFailed(
    userId: string,
    clienteId: string,
    clienteName: string,
    error: string
  ): Promise<Notification> {
    return this.create({
      userId,
      type: 'enrichment_failed',
      title: 'Error en enriquecimiento',
      message: `No se pudo enriquecer ${clienteName}: ${error}`,
      link: `/clientes/${clienteId}`,
      metadata: { clienteId, error },
    });
  }

  /**
   * Notify user that bulk enrichment completed
   */
  static async notifyBulkEnrichmentComplete(
    userId: string,
    total: number,
    successful: number,
    failed: number
  ): Promise<Notification> {
    return this.create({
      userId,
      type: 'bulk_enrichment_complete',
      title: 'Enriquecimiento en bloque completado',
      message: `Procesados ${total} clientes: ${successful} exitosos, ${failed} fallidos`,
      link: '/clientes',
      metadata: { total, successful, failed },
    });
  }

  /**
   * Notify user about quota warning
   */
  static async notifyQuotaWarning(
    userId: string,
    service: string,
    used: number,
    limit: number
  ): Promise<Notification> {
    const percentage = Math.round((used / limit) * 100);
    return this.create({
      userId,
      type: 'quota_warning',
      title: `Cuota de ${service} al ${percentage}%`,
      message: `Has usado ${used} de ${limit} solicitudes. Considera ajustar el uso.`,
      link: '/admin/settings/quotas',
      metadata: { service, used, limit, percentage },
    });
  }

  /**
   * Notify user that quota was exceeded
   */
  static async notifyQuotaExceeded(
    userId: string,
    service: string
  ): Promise<Notification> {
    return this.create({
      userId,
      type: 'quota_exceeded',
      title: `Cuota de ${service} excedida`,
      message: `La cuota de ${service} ha sido alcanzada. El servicio no estara disponible hasta el próximo periodo.`,
      link: '/admin/settings/quotas',
      metadata: { service },
    });
  }
}
