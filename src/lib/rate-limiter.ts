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

/**
 * Pre-configured rate limiter for AI enrichment endpoints.
 * 10 requests per minute per IP.
 */
export function enrichmentRateLimit(identifier: string): RateLimitResult {
  const ENRICHMENT_LIMIT = 10;
  const ENRICHMENT_WINDOW_MS = 60 * 1000; // 1 minute
  return rateLimit(identifier, ENRICHMENT_LIMIT, ENRICHMENT_WINDOW_MS);
}

/**
 * Pre-configured rate limiter for bulk enrichment endpoints.
 * 3 requests per 5 minutes per IP.
 */
export function bulkEnrichmentRateLimit(identifier: string): RateLimitResult {
  const BULK_LIMIT = 3;
  const BULK_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  return rateLimit(identifier, BULK_LIMIT, BULK_WINDOW_MS);
}

/**
 * Pre-configured rate limiter for messaging endpoints.
 * 20 requests per minute per IP.
 */
export function messagingRateLimit(identifier: string): RateLimitResult {
  const MSG_LIMIT = 20;
  const MSG_WINDOW_MS = 60 * 1000; // 1 minute
  return rateLimit(identifier, MSG_LIMIT, MSG_WINDOW_MS);
}

/**
 * Pre-configured rate limiter for bulk messaging endpoints.
 * 5 requests per 5 minutes per IP.
 */
export function bulkMessagingRateLimit(identifier: string): RateLimitResult {
  const BULK_MSG_LIMIT = 5;
  const BULK_MSG_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  return rateLimit(identifier, BULK_MSG_LIMIT, BULK_MSG_WINDOW_MS);
}

/**
 * Pre-configured rate limiter for admin endpoints.
 * 30 requests per minute per IP.
 */
export function adminRateLimit(identifier: string): RateLimitResult {
  const ADMIN_LIMIT = 30;
  const ADMIN_WINDOW_MS = 60 * 1000; // 1 minute
  return rateLimit(identifier, ADMIN_LIMIT, ADMIN_WINDOW_MS);
}

/**
 * Extract client IP from request headers.
 * Falls back to 'unknown' if no IP can be determined.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

/**
 * Create a standard 429 Too Many Requests response.
 */
export function rateLimitResponse({ reset }: { reset: number }): Response {
  return Response.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
      },
    },
  );
}
