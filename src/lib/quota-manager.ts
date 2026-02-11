// Sistema de gestión de quotas para APIs gratuitas
// Usa base de datos para persistencia (compatible con Vercel)

import { prisma } from './prisma';
import { logger } from './logger';
import {
  saveQuotaHistory,
  getQuotaHistory as getQuotaHistoryFn,
  getAllQuotasHistory as getAllQuotasHistoryFn,
  checkQuotaAlerts as checkQuotaAlertsFn,
  setAlertThreshold as setAlertThresholdFn,
  getQuotaWithAlerts as getQuotaWithAlertsFn,
} from './quota-alerts';

export interface QuotaService {
  name: string;
  used: number;
  limit: number;
  resetHour: number;
  lastReset: Date;
}

// Límites diarios calculados de quotas mensuales
// Can be overridden via environment variables
const DAILY_LIMITS = {
  screenshots: parseInt(process.env.QUOTA_SCREENSHOTS_DAILY || '33'),      // 1000/mes ÷ 30 días
  pagespeed: parseInt(process.env.QUOTA_PAGESPEED_DAILY || '800'),         // 25000/mes ÷ 30 días
  serpapi: parseInt(process.env.QUOTA_SERPAPI_DAILY || '3'),               // 100/mes ÷ 30 días
  builtwith: parseInt(process.env.QUOTA_BUILTWITH_DAILY || '166'),         // 5000/mes ÷ 30 días
} as const;

type ServiceName = keyof typeof DAILY_LIMITS;

// Cache en memoria para reducir hits a BD
let quotaCache: Record<ServiceName, QuotaService> = {} as Record<ServiceName, QuotaService>;
let lastCacheUpdate = 0;
const CACHE_TTL = 60 * 1000; // 1 minuto (más corto para serverless)

// Verificar si necesitamos resetear las quotas (nuevo día)
function shouldResetQuotas(lastReset: Date): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastResetDate = new Date(lastReset.getFullYear(), lastReset.getMonth(), lastReset.getDate());

  return today.getTime() !== lastResetDate.getTime();
}

// Obtener o crear registro de quota en BD
async function getOrCreateQuota(serviceName: ServiceName): Promise<{ used: number; limit: number; lastReset: Date }> {
  try {
    let quota = await prisma.quota.findUnique({
      where: { service: serviceName }
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (!quota) {
      // Crear registro si no existe
      quota = await prisma.quota.create({
        data: {
          service: serviceName,
          used: 0,
          limit: DAILY_LIMITS[serviceName],
          lastReset: today
        }
      });
    } else if (shouldResetQuotas(quota.lastReset)) {
      // Save history before reset
      await saveQuotaHistory(quota.id, quota.used, quota.successCount, quota.errorCount);

      // Resetear si es nuevo día
      quota = await prisma.quota.update({
        where: { service: serviceName },
        data: {
          used: 0,
          lastReset: today,
          successCount: 0,
          errorCount: 0,
          alertSent: false // Reset alert flag
        }
      });
    }

    return {
      used: quota.used,
      limit: quota.limit,
      lastReset: quota.lastReset
    };
  } catch (error) {
    // Fail-closed: when DB is unavailable, report quota as exhausted
    // to prevent external API calls when we cannot verify quota
    logger.warn(`Quota DB error for ${serviceName}, failing closed (quota exhausted)`, { error: error instanceof Error ? error.message : String(error) });
    return {
      used: DAILY_LIMITS[serviceName],
      limit: DAILY_LIMITS[serviceName],
      lastReset: new Date()
    };
  }
}

// Obtener estado actual de quotas
export async function getQuotaStatus(): Promise<Record<ServiceName, QuotaService>> {
  const now = Date.now();

  // Usar cache si es reciente
  if (now - lastCacheUpdate < CACHE_TTL && Object.keys(quotaCache).length > 0) {
    return quotaCache;
  }

  const services: ServiceName[] = ['screenshots', 'pagespeed', 'serpapi', 'builtwith'];

  const results = await Promise.all(
    services.map(async (service) => {
      const quota = await getOrCreateQuota(service);
      return {
        service,
        data: {
          name: service,
          used: quota.used,
          limit: quota.limit,
          resetHour: 0,
          lastReset: quota.lastReset
        }
      };
    })
  );

  quotaCache = results.reduce((acc, { service, data }) => {
    acc[service] = data;
    return acc;
  }, {} as Record<ServiceName, QuotaService>);

  lastCacheUpdate = now;

  return quotaCache;
}

// Verificar si tenemos quota disponible para un servicio
export async function hasQuotaAvailable(serviceName: ServiceName): Promise<boolean> {
  const quota = await getOrCreateQuota(serviceName);
  return quota.used < quota.limit;
}

// Consumir quota de un servicio
export async function consumeQuota(serviceName: ServiceName, amount: number = 1): Promise<boolean> {
  try {
    const quota = await getOrCreateQuota(serviceName);

    if (quota.used >= quota.limit) {
      return false;
    }

    // Actualizar contador en BD
    await prisma.quota.update({
      where: { service: serviceName },
      data: {
        used: { increment: amount }
      }
    });

    // Invalidar cache
    lastCacheUpdate = 0;

    return true;
  } catch (error) {
    logger.error(`Error consuming quota for ${serviceName}`, error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

// Obtener información detallada de quota
export async function getQuotaInfo(serviceName: ServiceName): Promise<{
  used: number;
  limit: number;
  available: number;
  percentage: number;
  resetIn: string;
} | null> {
  try {
    const quota = await getOrCreateQuota(serviceName);

    const available = quota.limit - quota.used;
    const percentage = (quota.used / quota.limit) * 100;

    // Calcular tiempo hasta reset
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilReset = tomorrow.getTime() - now.getTime();
    const hoursUntilReset = Math.floor(msUntilReset / (1000 * 60 * 60));
    const minutesUntilReset = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60));

    return {
      used: quota.used,
      limit: quota.limit,
      available,
      percentage,
      resetIn: `${hoursUntilReset}h ${minutesUntilReset}m`
    };
  } catch (error) {
    logger.error(`Error getting quota info for ${serviceName}`, error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

// Reset manual de todas las quotas (para testing)
export async function resetAllQuotas(): Promise<void> {
  const services: ServiceName[] = ['screenshots', 'pagespeed', 'serpapi', 'builtwith'];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  await Promise.all(
    services.map(service =>
      prisma.quota.upsert({
        where: { service },
        update: { used: 0, lastReset: today },
        create: { service, used: 0, limit: DAILY_LIMITS[service], lastReset: today }
      })
    )
  );

  // Invalidar cache
  quotaCache = {} as Record<ServiceName, QuotaService>;
  lastCacheUpdate = 0;
}

// Obtener resumen de todas las quotas
export async function getAllQuotasInfo() {
  const services: ServiceName[] = ['screenshots', 'pagespeed', 'serpapi', 'builtwith'];
  const results = await Promise.all(
    services.map(async (service) => ({
      service,
      ...(await getQuotaInfo(service))
    }))
  );

  return results.filter(result => result.used !== undefined);
}

// Extended quota info with success/error counts and alert threshold
export async function getExtendedQuotaInfo(serviceName: ServiceName): Promise<{
  used: number;
  limit: number;
  available: number;
  percentage: number;
  resetIn: string;
  successCount: number;
  errorCount: number;
  lastError: string | null;
  lastErrorAt: Date | null;
  alertThreshold: number;
  isNearLimit: boolean;
} | null> {
  try {
    const quota = await prisma.quota.findUnique({
      where: { service: serviceName }
    });

    if (!quota) {
      const basicInfo = await getQuotaInfo(serviceName);
      if (!basicInfo) return null;
      return {
        ...basicInfo,
        successCount: 0,
        errorCount: 0,
        lastError: null,
        lastErrorAt: null,
        alertThreshold: 80,
        isNearLimit: basicInfo.percentage >= 80,
      };
    }

    const basicInfo = await getQuotaInfo(serviceName);
    if (!basicInfo) return null;

    return {
      ...basicInfo,
      successCount: quota.successCount,
      errorCount: quota.errorCount,
      lastError: quota.lastError,
      lastErrorAt: quota.lastErrorAt,
      alertThreshold: quota.alertThreshold,
      isNearLimit: basicInfo.percentage >= quota.alertThreshold,
    };
  } catch (error) {
    logger.error(`Error getting extended quota info for ${serviceName}`, error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

// Get all quotas with extended info
export async function getAllExtendedQuotasInfo() {
  const services: ServiceName[] = ['screenshots', 'pagespeed', 'serpapi', 'builtwith'];
  const results = await Promise.all(
    services.map(async (service) => ({
      service,
      ...(await getExtendedQuotaInfo(service))
    }))
  );

  return results.filter(result => result.used !== undefined);
}

// Record a successful API call
export async function recordSuccess(serviceName: ServiceName): Promise<void> {
  try {
    await prisma.quota.update({
      where: { service: serviceName },
      data: {
        successCount: { increment: 1 }
      }
    });
    lastCacheUpdate = 0;
  } catch (error) {
    logger.error(`Error recording success for ${serviceName}`, error instanceof Error ? error : new Error(String(error)));
  }
}

// Record an API error
export async function recordError(serviceName: ServiceName, errorMessage: string): Promise<void> {
  try {
    await prisma.quota.update({
      where: { service: serviceName },
      data: {
        errorCount: { increment: 1 },
        lastError: errorMessage.slice(0, 500),
        lastErrorAt: new Date()
      }
    });
    lastCacheUpdate = 0;
  } catch (error) {
    logger.error(`Error recording error for ${serviceName}`, error instanceof Error ? error : new Error(String(error)));
  }
}

// Funciones alias para compatibilidad
export async function canMakeRequest(serviceName: ServiceName): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  resetIn: string;
}> {
  const quotaInfo = await getQuotaInfo(serviceName);
  if (!quotaInfo) {
    return {
      allowed: false,
      used: 0,
      limit: DAILY_LIMITS[serviceName],
      resetIn: '24h 0m'
    };
  }

  return {
    allowed: quotaInfo.available > 0,
    used: quotaInfo.used,
    limit: quotaInfo.limit,
    resetIn: quotaInfo.resetIn
  };
}

export async function incrementUsage(serviceName: ServiceName, amount: number = 1): Promise<boolean> {
  return await consumeQuota(serviceName, amount);
}

export async function getServiceStatus(serviceName: ServiceName) {
  const quotaInfo = await getQuotaInfo(serviceName);
  return quotaInfo || {
    used: 0,
    limit: DAILY_LIMITS[serviceName],
    available: DAILY_LIMITS[serviceName],
    percentage: 0,
    resetIn: '24h 0m'
  };
}

export async function getAllStatus() {
  const results = await getAllQuotasInfo();
  return results.map(result => ({
    service: result.service,
    used: result.used,
    limit: result.limit,
    available: result.available,
    percentage: result.percentage,
    resetIn: result.resetIn
  }));
}

export async function resetQuota(serviceName: ServiceName): Promise<void> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  await prisma.quota.upsert({
    where: { service: serviceName },
    update: { used: 0, lastReset: today },
    create: { service: serviceName, used: 0, limit: DAILY_LIMITS[serviceName], lastReset: today }
  });

  // Invalidar cache
  lastCacheUpdate = 0;
}

// Re-export functions from quota-alerts.ts for backward compatibility
export const getQuotaHistory = getQuotaHistoryFn;
export const getAllQuotasHistory = getAllQuotasHistoryFn;
export const checkQuotaAlerts = checkQuotaAlertsFn;
export const setAlertThreshold = setAlertThresholdFn;
export const getQuotaWithAlerts = getQuotaWithAlertsFn;

// QuotaManager instance para importar en otros módulos
export const quotaManager = {
  canMakeRequest,
  incrementUsage,
  getQuotaInfo,
  getExtendedQuotaInfo,
  getServiceStatus,
  getAllStatus,
  resetQuota,
  resetAllQuotas,
  getAllQuotasInfo,
  getAllExtendedQuotasInfo,
  recordSuccess,
  recordError,
  getQuotaHistory,
  getAllQuotasHistory,
  checkQuotaAlerts,
  setAlertThreshold,
  getQuotaWithAlerts
};
