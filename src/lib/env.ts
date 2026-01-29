// Environment variable validation and access
// Validates required variables and provides type-safe access

import { z } from 'zod';

// Define environment schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),

  // Authentication
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url().optional(),

  // Vercel Blob (optional in dev)
  BLOB_READ_WRITE_TOKEN: z.string().optional(),

  // OpenAI (optional)
  OPENAI_API_KEY: z.string().optional(),

  // Google APIs (optional)
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  GOOGLE_CSE_ID: z.string().optional(),

  // Quota limits (with defaults)
  QUOTA_SCREENSHOTS_DAILY: z.coerce.number().positive().default(33),
  QUOTA_PAGESPEED_DAILY: z.coerce.number().positive().default(800),
  QUOTA_SERPAPI_DAILY: z.coerce.number().positive().default(3),
  QUOTA_BUILTWITH_DAILY: z.coerce.number().positive().default(166),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Vercel specific
  VERCEL: z.string().optional(),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
  VERCEL_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

// Validate and export environment
let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const missingVars = error.issues.map(e => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
    console.error(`\n❌ Environment validation failed:\n${missingVars}\n`);

    // In development, provide helpful instructions
    if (process.env.NODE_ENV === 'development') {
      console.error('💡 Make sure you have a .env.local file with the required variables.');
      console.error('   Copy .env.example to .env.local and fill in the values.\n');
    }

    // Don't throw in build time (Vercel might not have all env vars during build)
    if (process.env.VERCEL && process.env.VERCEL_ENV === 'production') {
      // Use defaults for non-critical vars in Vercel build
      env = {
        DATABASE_URL: process.env.DATABASE_URL || '',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'build-time-placeholder-will-be-replaced',
        QUOTA_SCREENSHOTS_DAILY: 33,
        QUOTA_PAGESPEED_DAILY: 800,
        QUOTA_SERPAPI_DAILY: 3,
        QUOTA_BUILTWITH_DAILY: 166,
        LOG_LEVEL: 'info',
        NODE_ENV: 'production',
      } as Env;
    } else {
      throw new Error('Environment validation failed. Check the console for details.');
    }
  } else {
    throw error;
  }
}

export { env };

// Helper functions for checking environment
export function isProduction(): boolean {
  return env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production';
}

export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development' && !env.VERCEL;
}

export function isVercel(): boolean {
  return !!env.VERCEL;
}

export function hasOpenAI(): boolean {
  return !!env.OPENAI_API_KEY;
}

export function hasVercelBlob(): boolean {
  return !!env.BLOB_READ_WRITE_TOKEN;
}

export function getBaseUrl(): string {
  if (env.NEXTAUTH_URL) {
    return env.NEXTAUTH_URL;
  }
  if (env.VERCEL_URL) {
    return `https://${env.VERCEL_URL}`;
  }
  return 'http://localhost:4500';
}

// Export individual env vars for convenience
export const DATABASE_URL = env.DATABASE_URL;
export const NEXTAUTH_SECRET = env.NEXTAUTH_SECRET;
export const OPENAI_API_KEY = env.OPENAI_API_KEY;
