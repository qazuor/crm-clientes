import { betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import type { UserRole } from '@/types';

const VALID_ROLES: readonly string[] = ['ADMIN', 'MANAGER', 'AGENT'] satisfies readonly UserRole[];

function isValidRole(value: unknown): value is UserRole {
  return typeof value === 'string' && VALID_ROLES.includes(value);
}

// ── Account lockout constants ───────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// ── Lockout DB helpers (use raw SQL to avoid Prisma client regeneration issues) ──
interface LockoutRow {
  id: string;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

async function getLockoutInfo(email: string): Promise<LockoutRow | null> {
  const rows = await prisma.$queryRaw<LockoutRow[]>`
    SELECT id, "failedLoginAttempts", "lockedUntil"
    FROM "users"
    WHERE email = ${email}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function resetLockout(userId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "users"
    SET "failedLoginAttempts" = 0, "lockedUntil" = NULL
    WHERE id = ${userId}
  `;
}

async function incrementFailedAttempts(userId: string, currentAttempts: number): Promise<void> {
  const newAttempts = currentAttempts + 1;
  const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;

  if (shouldLock) {
    const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    await prisma.$executeRaw`
      UPDATE "users"
      SET "failedLoginAttempts" = ${newAttempts}, "lockedUntil" = ${lockUntil}
      WHERE id = ${userId}
    `;
  } else {
    await prisma.$executeRaw`
      UPDATE "users"
      SET "failedLoginAttempts" = ${newAttempts}
      WHERE id = ${userId}
    `;
  }
}

export const betterAuthInstance = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  emailAndPassword: {
    enabled: true,
    password: {
      hash: async (password) => {
        const bcrypt = await import('bcryptjs');
        return bcrypt.hash(password, 12);
      },
      verify: async ({ hash, password }) => {
        const bcrypt = await import('bcryptjs');
        return bcrypt.compare(password, hash);
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days (reduced from 30 for security)
    updateAge: 60 * 60 * 24, // refresh every day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 min cache
    },
  },
  rateLimit: {
    window: 60,
    max: 30,
    customRules: {
      '/sign-in/social': { window: 60, max: 10 },
      '/callback/*': { window: 60, max: 10 },
    },
  },
  advanced: {
    cookiePrefix: 'better-auth',
    // Better Auth sets SameSite=Lax, HttpOnly, and Secure (in production)
    // by default. This provides CSRF protection without a separate token.
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'AGENT',
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const allowedEmails = process.env.OAUTH_ALLOWED_EMAILS;
          if (allowedEmails) {
            const whitelist = allowedEmails
              .split(',')
              .map((e) => e.trim().toLowerCase());
            if (!whitelist.includes(user.email.toLowerCase())) {
              throw new Error('Email not authorized for sign-up.');
            }
            return { data: { ...user, role: 'ADMIN' } };
          }
          return { data: user };
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { role: true },
          });
          return {
            data: { ...session, role: user?.role || 'AGENT' },
          };
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Only apply lockout logic to email sign-in
      if (ctx.path !== '/sign-in/email') return;

      const body = ctx.body as { email?: string } | undefined;
      const email = body?.email;
      if (!email) return;

      const user = await getLockoutInfo(email);
      if (!user) return; // Let Better Auth handle unknown users

      // Check if the account is currently locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const minutesLeft = Math.ceil(
          (user.lockedUntil.getTime() - Date.now()) / 60_000,
        );
        throw new Error(
          `Account is locked. Try again in ${minutesLeft} minute(s).`,
        );
      }

      // If the lockout has expired, reset the counter
      if (user.lockedUntil && user.lockedUntil <= new Date()) {
        await resetLockout(user.id);
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      // Only apply lockout logic to email sign-in
      if (ctx.path !== '/sign-in/email') return;

      const body = ctx.body as { email?: string } | undefined;
      const email = body?.email;
      if (!email) return;

      // Determine success or failure from the returned response
      const returned = ctx.context.returned as Response | undefined;
      const isError = returned && typeof returned.status === 'number' && returned.status >= 400;

      if (isError) {
        // Failed login -- increment attempts, possibly lock
        const user = await getLockoutInfo(email);
        if (user) {
          await incrementFailedAttempts(user.id, user.failedLoginAttempts ?? 0);
        }
      } else {
        // Successful login -- reset failed attempts counter
        const user = await getLockoutInfo(email);
        if (user && (user.failedLoginAttempts ?? 0) > 0) {
          await resetLockout(user.id);
        }
      }
    }),
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL || 'http://localhost:4500'],
});

// ── Wrapper to maintain compatibility with the 30+ files that use auth() ──
export async function auth() {
  const session = await betterAuthInstance.api.getSession({
    headers: await headers(),
  });
  if (!session) return null;

  const userRecord = session.user as Record<string, unknown>;
  const rawRole = userRecord.role;
  const role: UserRole = isValidRole(rawRole) ? rawRole : 'AGENT';

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role,
    },
  };
}
