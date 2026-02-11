import { logger } from '@/lib/logger';

/**
 * Reports an error with optional context for structured logging.
 * Uses the centralized logger in all environments.
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  logger.error(error.message, error, context);
}

/**
 * Reports a message at a given severity level.
 * Uses the centralized logger in all environments.
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): void {
  const levelMap = { info: 'info', warning: 'warn', error: 'error' } as const;
  const logLevel = levelMap[level];

  if (logLevel === 'error') {
    logger.error(message);
  } else if (logLevel === 'warn') {
    logger.warn(message);
  } else {
    logger.info(message);
  }
}
