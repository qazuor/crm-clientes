/**
 * Quota history tracking and alert management.
 * Extracted from quota-manager.ts for file size compliance.
 */

import { prisma } from './prisma';
import { logger } from './logger';
import { getQuotaInfo } from './quota-manager';

type ServiceName = 'screenshots' | 'pagespeed' | 'serpapi' | 'builtwith';

/** Save quota history before daily reset. */
export async function saveQuotaHistory(
  quotaId: string,
  used: number,
  successCount: number,
  errorCount: number,
): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    await prisma.quotaHistory.upsert({
      where: {
        quotaId_date: { quotaId, date: yesterday },
      },
      create: {
        quotaId,
        date: yesterday,
        used,
        success: successCount,
        errors: errorCount,
      },
      update: {
        used,
        success: successCount,
        errors: errorCount,
      },
    });
  } catch (error) {
    logger.error('Error saving quota history', error instanceof Error ? error : new Error(String(error)));
  }
}

/** Get quota history for a service (last N days). */
export async function getQuotaHistory(
  serviceName: ServiceName,
  days: number = 30,
): Promise<{ date: Date; used: number; success: number; errors: number }[]> {
  try {
    const quota = await prisma.quota.findUnique({
      where: { service: serviceName },
    });

    if (!quota) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const history = await prisma.quotaHistory.findMany({
      where: {
        quotaId: quota.id,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    return history.map((h) => ({
      date: h.date,
      used: h.used,
      success: h.success,
      errors: h.errors,
    }));
  } catch (error) {
    logger.error(`Error getting quota history for ${serviceName}`, error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/** Get all quotas history. */
export async function getAllQuotasHistory(
  days: number = 7,
): Promise<Record<string, { date: Date; used: number; success: number; errors: number }[]>> {
  const services: ServiceName[] = ['screenshots', 'pagespeed', 'serpapi', 'builtwith'];
  const result: Record<string, { date: Date; used: number; success: number; errors: number }[]> = {};

  for (const service of services) {
    result[service] = await getQuotaHistory(service, days);
  }

  return result;
}

/** Check if any quota is near limit and should alert. */
export async function checkQuotaAlerts(): Promise<{
  service: string;
  percentage: number;
  used: number;
  limit: number;
  threshold: number;
}[]> {
  try {
    const quotas = await prisma.quota.findMany();
    const alerts: {
      service: string;
      percentage: number;
      used: number;
      limit: number;
      threshold: number;
    }[] = [];

    for (const quota of quotas) {
      const percentage = (quota.used / quota.limit) * 100;
      if (percentage >= quota.alertThreshold && !quota.alertSent) {
        alerts.push({
          service: quota.service,
          percentage,
          used: quota.used,
          limit: quota.limit,
          threshold: quota.alertThreshold,
        });

        await prisma.quota.update({
          where: { id: quota.id },
          data: { alertSent: true },
        });
      }
    }

    return alerts;
  } catch (error) {
    logger.error('Error checking quota alerts', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/** Update alert threshold for a service. */
export async function setAlertThreshold(serviceName: ServiceName, threshold: number): Promise<void> {
  try {
    await prisma.quota.update({
      where: { service: serviceName },
      data: { alertThreshold: Math.min(100, Math.max(0, threshold)) },
    });
  } catch (error) {
    logger.error(`Error setting alert threshold for ${serviceName}`, error instanceof Error ? error : new Error(String(error)));
  }
}

/** Get quota with alert info. */
export async function getQuotaWithAlerts(serviceName: ServiceName): Promise<{
  used: number;
  limit: number;
  available: number;
  percentage: number;
  resetIn: string;
  alertThreshold: number;
  isNearLimit: boolean;
} | null> {
  try {
    const quota = await prisma.quota.findUnique({
      where: { service: serviceName },
    });

    if (!quota) return null;

    const basicInfo = await getQuotaInfo(serviceName);
    if (!basicInfo) return null;

    return {
      ...basicInfo,
      alertThreshold: quota.alertThreshold,
      isNearLimit: basicInfo.percentage >= quota.alertThreshold,
    };
  } catch (error) {
    logger.error(`Error getting quota with alerts for ${serviceName}`, error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
