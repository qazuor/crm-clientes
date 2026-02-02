type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevel = (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'debug')) as LogLevel;

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'apiKey', 'key', 'credentials', 'authorization', 'cookie', 'session', 'bearer'];

function sanitize(data?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!data) return undefined;

  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk))) {
        return [key, '[REDACTED]'];
      }
      // Recursively sanitize nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return [key, sanitize(value as Record<string, unknown>)];
      }
      return [key, value];
    })
  );
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => {
    if (shouldLog('debug')) {
      console.log(`[DEBUG] ${msg}`, data ? sanitize(data) : '');
    }
  },

  info: (msg: string, data?: Record<string, unknown>) => {
    if (shouldLog('info')) {
      console.log(`[INFO] ${msg}`, data ? sanitize(data) : '');
    }
  },

  warn: (msg: string, data?: Record<string, unknown>) => {
    if (shouldLog('warn')) {
      console.warn(`[WARN] ${msg}`, data ? sanitize(data) : '');
    }
  },

  error: (msg: string, error?: Error, data?: Record<string, unknown>) => {
    if (shouldLog('error')) {
      console.error(`[ERROR] ${msg}`, error?.message || '', data ? sanitize(data) : '');
    }
  }
};

export default logger;
