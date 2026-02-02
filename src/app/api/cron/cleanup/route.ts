import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  // Verify request comes from Vercel Cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const summary: Record<string, unknown> = {};
  const now = new Date();

  try {
    // 1. Clean up expired sessions
    const expiredSessions = await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });
    summary.expiredSessionsDeleted = expiredSessions.count;

    // 2. Clean up old notifications (older than 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oldNotifications = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        read: true,
      },
    });
    summary.oldNotificationsDeleted = oldNotifications.count;

    // 3. Reset daily quotas if they haven't been reset today
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const quotasToReset = await prisma.quota.findMany({
      where: {
        lastReset: { lt: startOfToday },
      },
    });

    if (quotasToReset.length > 0) {
      await prisma.quota.updateMany({
        where: {
          lastReset: { lt: startOfToday },
        },
        data: {
          used: 0,
          lastReset: now,
          alertSent: false,
        },
      });
    }
    summary.quotasReset = quotasToReset.length;

    // 4. Clean up expired verifications
    const expiredVerifications = await prisma.verification.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });
    summary.expiredVerificationsDeleted = expiredVerifications.count;

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Cleanup failed',
        timestamp: now.toISOString(),
        summary,
      },
      { status: 500 }
    );
  }
}
