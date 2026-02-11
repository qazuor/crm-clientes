export const PAGINATION = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  DEFAULT_OFFSET: 0,
  /** Default limit for notification queries */
  NOTIFICATIONS_LIMIT: 50,
  /** Number of recent activities shown on the dashboard */
  DASHBOARD_RECENT_ACTIVITIES: 5,
  /** Max nested activities returned with each client in list responses */
  CLIENT_NESTED_ACTIVITIES: 3,
} as const;

export const BULK = {
  MAX_CLIENTS: 50,
  MAX_ENRICHMENT: 50,
  MAX_BULK_ACTION: 100,
} as const;

export const ENRICHMENT = {
  COOLDOWN_HOURS: 24,
  MAX_CONCURRENT: 3,
  /** Time window (ms) to consider an enrichment as still in-progress */
  IN_PROGRESS_WINDOW_MS: 10 * 60 * 1000,
} as const;

export const SESSION = {
  EXPIRY_DAYS: 7,
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_MINUTES: 30,
} as const;

export const CLEANUP = {
  /** Days to retain read notifications before cron cleanup */
  NOTIFICATION_RETENTION_DAYS: 30,
} as const;

export const TIMEOUTS = {
  /** Timeout for AI enrichment operations (2 minutes) */
  AI_OPERATION_MS: 120_000,
  /** Timeout for website analysis operations (30 seconds) */
  WEBSITE_ANALYSIS_MS: 30_000,
} as const;
