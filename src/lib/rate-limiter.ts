/**
 * In-memory rate limiter using a token-bucket approach.
 *
 * This can be swapped for @upstash/ratelimit + @upstash/redis when
 * an Upstash Redis instance is available. The API surface is intentionally
 * kept identical so that the switch is a drop-in replacement.
 *
 * IMPORTANT: In-memory storage is per-process. When running multiple
 * instances (e.g. serverless functions), each instance keeps its own
 * counters. For production use, switch to Redis-backed rate limiting.
 */

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

// In-memory store keyed by identifier
const store = new Map<string, RateLimitEntry>();

// Track when we last ran cleanup to avoid doing it on every call
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000; // 1 minute

/**
 * Lazy cleanup: evict stale entries when enough time has passed.
 * This avoids the need for setInterval/unref which may behave
 * differently in Edge Runtime vs Node.js.
 */
function cleanupIfNeeded(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now - entry.lastRefill > windowMs * 2) {
      store.delete(key);
    }
  }
}

/**
 * Check and consume a rate limit token using a token-bucket algorithm.
 *
 * @param identifier - Unique key (e.g. IP address or user ID)
 * @param limit      - Maximum number of requests allowed in the window
 * @param windowMs   - Time window in milliseconds
 * @returns          - Result indicating success, remaining tokens, and reset time
 */
export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  cleanupIfNeeded(windowMs);

  let entry = store.get(identifier);

  if (!entry) {
    // First request from this identifier
    entry = { tokens: limit - 1, lastRefill: now };
    store.set(identifier, entry);
    return {
      success: true,
      remaining: entry.tokens,
      reset: now + windowMs,
    };
  }

  // Calculate how many tokens to refill based on elapsed time
  const elapsed = now - entry.lastRefill;

  if (elapsed >= windowMs) {
    // Full window has passed -- refill completely
    entry.tokens = limit - 1;
    entry.lastRefill = now;
    store.set(identifier, entry);
    return {
      success: true,
      remaining: entry.tokens,
      reset: now + windowMs,
    };
  }

  // Within the same window
  if (entry.tokens > 0) {
    entry.tokens -= 1;
    store.set(identifier, entry);
    return {
      success: true,
      remaining: entry.tokens,
      reset: entry.lastRefill + windowMs,
    };
  }

  // No tokens left -- rate limited
  return {
    success: false,
    remaining: 0,
    reset: entry.lastRefill + windowMs,
  };
}

/**
 * Pre-configured rate limiter for auth endpoints.
 * 5 requests per 15 minutes per IP.
 */
export function authRateLimit(identifier: string): RateLimitResult {
  const AUTH_LIMIT = 5;
  const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  return rateLimit(identifier, AUTH_LIMIT, AUTH_WINDOW_MS);
}

/**
 * Pre-configured rate limiter for general API endpoints.
 * 60 requests per minute per IP.
 */
export function apiRateLimit(identifier: string): RateLimitResult {
  const API_LIMIT = 60;
  const API_WINDOW_MS = 60 * 1000; // 1 minute
  return rateLimit(identifier, API_LIMIT, API_WINDOW_MS);
}
