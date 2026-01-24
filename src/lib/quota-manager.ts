// Sistema de gestión de quotas para APIs gratuitas

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

// Cache en memoria para evitar hits constantes a BD
let quotaCache: Record<ServiceName, QuotaService> = {} as any;
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Inicializar cache si no existe
function initializeCache(): Record<ServiceName, QuotaService> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return {
    screenshots: { name: 'screenshots', used: 0, limit: DAILY_LIMITS.screenshots, resetHour: 0, lastReset: today },
    pagespeed: { name: 'pagespeed', used: 0, limit: DAILY_LIMITS.pagespeed, resetHour: 0, lastReset: today },
    serpapi: { name: 'serpapi', used: 0, limit: DAILY_LIMITS.serpapi, resetHour: 0, lastReset: today },
    builtwith: { name: 'builtwith', used: 0, limit: DAILY_LIMITS.builtwith, resetHour: 0, lastReset: today }
  };
}

// Verificar si necesitamos resetear las quotas (nuevo día)
function shouldResetQuotas(service: QuotaService): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastReset = new Date(service.lastReset);
  const lastResetDate = new Date(lastReset.getFullYear(), lastReset.getMonth(), lastReset.getDate());
  
  return today.getTime() !== lastResetDate.getTime();
}

// Resetear quota si es nuevo día
function resetQuotaIfNeeded(service: QuotaService): QuotaService {
  if (shouldResetQuotas(service)) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return {
      ...service,
      used: 0,
      lastReset: today
    };
  }
  return service;
}

// Cargar quotas desde localStorage (server-side safe)
async function loadQuotasFromStorage(): Promise<Record<ServiceName, QuotaService>> {
  try {
    // En el server, usar un archivo JSON simple o base de datos
    // Por simplicidad, usar cache en memoria con inicialización
    const fs = await import('fs').catch(() => null);
    if (fs && typeof window === 'undefined') {
      try {
        const quotaFile = './quotas.json';
        if (fs.existsSync(quotaFile)) {
          const data = fs.readFileSync(quotaFile, 'utf-8');
          const stored = JSON.parse(data);
          
          // Resetear quotas si es necesario
          Object.keys(stored).forEach(key => {
            const serviceName = key as ServiceName;
            stored[serviceName] = resetQuotaIfNeeded(stored[serviceName]);
          });
          
          return stored;
        }
      } catch (error) {
        console.warn('Error loading quotas from file:', error);
      }
    }
  } catch (error) {
    console.warn('Filesystem not available, using memory cache');
  }
  
  return initializeCache();
}

// Guardar quotas a localStorage
async function saveQuotasToStorage(quotas: Record<ServiceName, QuotaService>): Promise<void> {
  try {
    const fs = await import('fs').catch(() => null);
    if (fs && typeof window === 'undefined') {
      try {
        fs.writeFileSync('./quotas.json', JSON.stringify(quotas, null, 2));
      } catch (error) {
        console.warn('Error saving quotas to file:', error);
      }
    }
  } catch (error) {
    console.warn('Filesystem not available, using memory cache only');
  }
}

// Obtener estado actual de quotas
export async function getQuotaStatus(): Promise<Record<ServiceName, QuotaService>> {
  const now = Date.now();
  
  // Usar cache si es reciente
  if (now - lastCacheUpdate < CACHE_TTL && Object.keys(quotaCache).length > 0) {
    return quotaCache;
  }
  
  // Cargar desde storage
  quotaCache = await loadQuotasFromStorage();
  lastCacheUpdate = now;
  
  return quotaCache;
}

// Verificar si tenemos quota disponible para un servicio
export async function hasQuotaAvailable(serviceName: ServiceName): Promise<boolean> {
  const quotas = await getQuotaStatus();
  const service = quotas[serviceName];
  
  if (!service) return false;
  
  const resetService = resetQuotaIfNeeded(service);
  if (resetService.used !== service.used) {
    // Se resetó, actualizar cache
    quotaCache[serviceName] = resetService;
    await saveQuotasToStorage(quotaCache);
  }
  
  return resetService.used < resetService.limit;
}

// Consumir quota de un servicio
export async function consumeQuota(serviceName: ServiceName, amount: number = 1): Promise<boolean> {
  const hasQuota = await hasQuotaAvailable(serviceName);
  
  if (!hasQuota) {
    return false;
  }
  
  // Actualizar counter
  const quotas = await getQuotaStatus();
  quotas[serviceName].used += amount;
  
  // Guardar cambios
  quotaCache = quotas;
  await saveQuotasToStorage(quotaCache);
  lastCacheUpdate = Date.now();
  
  return true;
}

// Obtener información detallada de quota
export async function getQuotaInfo(serviceName: ServiceName): Promise<{
  used: number;
  limit: number;
  available: number;
  percentage: number;
  resetIn: string;
} | null> {
  const quotas = await getQuotaStatus();
  const service = quotas[serviceName];
  
  if (!service) return null;
  
  const resetService = resetQuotaIfNeeded(service);
  const available = resetService.limit - resetService.used;
  const percentage = (resetService.used / resetService.limit) * 100;
  
  // Calcular tiempo hasta reset
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const msUntilReset = tomorrow.getTime() - now.getTime();
  const hoursUntilReset = Math.floor(msUntilReset / (1000 * 60 * 60));
  const minutesUntilReset = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    used: resetService.used,
    limit: resetService.limit,
    available,
    percentage,
    resetIn: `${hoursUntilReset}h ${minutesUntilReset}m`
  };
}

// Reset manual de todas las quotas (para testing)
export async function resetAllQuotas(): Promise<void> {
  quotaCache = initializeCache();
  await saveQuotasToStorage(quotaCache);
  lastCacheUpdate = Date.now();
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
  quotaCache = await loadQuotasFromStorage();
  quotaCache[serviceName].used = 0;
  quotaCache[serviceName].lastReset = new Date();
  await saveQuotasToStorage(quotaCache);
  lastCacheUpdate = Date.now();
}

// QuotaManager instance para importar en otros módulos
export const quotaManager = {
  canMakeRequest,
  incrementUsage,
  getQuotaInfo,
  getServiceStatus,
  getAllStatus,
  resetQuota,
  resetAllQuotas,
  getAllQuotasInfo
};