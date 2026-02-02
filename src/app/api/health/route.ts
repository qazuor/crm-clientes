import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET() {
  let databaseStatus: 'connected' | 'error' = 'error';

  try {
    await prisma.$queryRaw(Prisma.sql`SELECT 1`);
    databaseStatus = 'connected';
  } catch {
    // Database is unreachable
  }

  const body = {
    status: databaseStatus === 'connected' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: databaseStatus,
    version: process.env.npm_package_version ?? '0.1.0',
  };

  const statusCode = databaseStatus === 'connected' ? 200 : 503;

  return NextResponse.json(body, { status: statusCode });
}
