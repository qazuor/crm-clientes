/**
 * Mark Notifications as Read API Endpoint
 * POST /api/notifications/read - Mark notification(s) as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification-service';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      const count = await NotificationService.markAllAsRead(session.user.id);
      return NextResponse.json({ success: true, markedCount: count });
    }

    if (notificationId) {
      await NotificationService.markAsRead(notificationId, session.user.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Se requiere notificationId o markAll' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Mark notification read error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Error al marcar notificacion' },
      { status: 500 }
    );
  }
}
