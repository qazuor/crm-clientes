/**
 * Retry Logic with Exponential Backoff and Jitter
 *
 * Retries failed async operations with increasing delays to avoid
 * thundering herd problems when services recover.
 */

import { logger } from './logger';

export interface RetryOptions {
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
  /** Base delay in ms before first retry (default: 200) */
  baseDelay?: number;
  /** Predicate to decide if error is retryable (default: network errors and 5xx) */
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Default shouldRetry predicate.
 * Retries on network errors (TypeError from fetch) and 5xx HTTP status codes.
 */
function defaultShouldRetry(error: unknown): boolean {
  // Network errors from fetch (e.g., ECONNREFUSED, DNS failure)
  if (error instanceof TypeError) {
    return true;
  }

  // Errors with status codes (e.g., from response handling)
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Match patterns like "API error: 500", "HTTP 502", "status 503"
    const statusMatch = message.match(/(?:status|error:?)\s*(\d{3})/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1], 10);
      return status >= 500 && status < 600;
    }
    // Retry on abort/timeout
    if (message.includes('abort') || message.includes('timeout')) {
      return true;
    }
    // Retry on network-like errors
    if (message.includes('econnrefused') || message.includes('enotfound') || message.includes('fetch failed')) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and jitter.
 * delay = baseDelay * 2^attempt + random jitter
 */
function calculateDelay(attempt: number, baseDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  // Add jitter: random value between 0 and exponentialDelay
  const jitter = Math.random() * exponentialDelay;
  return exponentialDelay + jitter;
}

/**
 * Execute an async function with retry logic using exponential backoff and jitter.
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration
 * @returns The result of the function
 * @throws The last error if all retries are exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelay = options?.baseDelay ?? 200;
  const shouldRetry = options?.shouldRetry ?? defaultShouldRetry;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const delay = calculateDelay(attempt, baseDelay);
      logger.debug(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${Math.round(delay)}ms`, {
        error: error instanceof Error ? error.message : String(error),
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}
