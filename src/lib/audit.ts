import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Log an audit event to the database.
 * Failures are caught and logged but never throw.
 */
export async function logAudit(
  action: string,
  userId: string,
  resource: string,
  resourceId?: string,
  details?: string,
  ipAddress?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId,
        resource,
        resourceId: resourceId ?? null,
        details: details ?? null,
        ipAddress: ipAddress ?? null,
      },
    });
  } catch (error) {
    logger.error(
      '[Audit] Failed to write audit log',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
