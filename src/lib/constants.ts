export const PAGINATION = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  DEFAULT_OFFSET: 0,
} as const;

export const BULK = {
  MAX_CLIENTS: 50,
  MAX_ENRICHMENT: 50,
  MAX_BULK_ACTION: 100,
} as const;

export const ENRICHMENT = {
  COOLDOWN_HOURS: 24,
  MAX_CONCURRENT: 3,
} as const;

export const SESSION = {
  EXPIRY_DAYS: 7,
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_MINUTES: 30,
} as const;
