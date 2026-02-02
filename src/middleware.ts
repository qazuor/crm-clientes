import { NextRequest, NextResponse } from 'next/server';
import { authRateLimit } from '@/lib/rate-limiter';

const publicPaths = ['/auth/login', '/auth/error', '/api/auth'];

function getClientIp(request: NextRequest): string {
  // Check common proxy headers
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; take the first
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Fallback -- in serverless environments this is usually available
  return request.headers.get('x-vercel-forwarded-for') || '127.0.0.1';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Rate limiting for auth endpoints ──────────────────────────────
  // Apply rate limiting to /api/auth paths (sign-in, sign-up, etc.)
  // to mitigate brute-force and credential-stuffing attacks.
  if (pathname.startsWith('/api/auth')) {
    const ip = getClientIp(request);
    const result = authRateLimit(`auth:${ip}`);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': String(result.reset),
          },
        },
      );
    }

    // Attach rate limit headers even on successful requests
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', '5');
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Reset', String(result.reset));
    return response;
  }

  // ── Public paths (no auth required) ───────────────────────────────
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ── Session check for protected routes ────────────────────────────
  const sessionCookie = request.cookies.get('better-auth.session_token');
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|screenshots).*)'],
};
