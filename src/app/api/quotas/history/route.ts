import { auth } from '@/lib/auth';
import { getAllQuotasHistory, checkQuotaAlerts, setAlertThreshold } from '@/lib/quota-manager';
import { logger } from '@/lib/logger';
import { hasPermission } from '@/lib/rbac';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { quotaHistoryDaysSchema } from '@/lib/validations/enrichment';

// GET /api/quotas/history - Get historical quota data
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return unauthorizedResponse();
    }

    if (!hasPermission(session.user.role, 'QUOTAS_VIEW')) {
      return errorResponse('Permisos insuficientes', { status: 403, code: 'FORBIDDEN' });
    }

    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days') || '7';
    const daysValidation = quotaHistoryDaysSchema.safeParse(daysParam);

    if (!daysValidation.success) {
      return errorResponse('Parametro "days" invalido. Debe ser un numero entero entre 1 y 30.', {
        status: 400,
        code: 'BAD_REQUEST',
      });
    }

    const days = daysValidation.data;

    const history = await getAllQuotasHistory(days);
    const alerts = await checkQuotaAlerts();

    logger.debug('Quota history fetched', { userId: session.user.id, days });

    return successResponse({
      history,
      alerts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching quota history', error instanceof Error ? error : new Error(String(error)));
    return serverErrorResponse(error instanceof Error ? error : undefined);
  }
}

// PUT /api/quotas/history - Update alert threshold
export async function PUT(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return unauthorizedResponse();
    }

    if (!hasPermission(session.user.role, 'QUOTAS_RESET')) {
      return errorResponse('Permisos insuficientes', { status: 403, code: 'FORBIDDEN' });
    }

    const body = await request.json();
    const { service, threshold } = body;

    if (!service || typeof threshold !== 'number') {
      return errorResponse('Servicio y threshold requeridos', { status: 400, code: 'BAD_REQUEST' });
    }

    await setAlertThreshold(service, threshold);

    logger.info('Alert threshold updated', { userId: session.user.id, service, threshold });

    return successResponse({
      message: 'Threshold actualizado',
      service,
      threshold,
    });
  } catch (error) {
    logger.error('Error updating alert threshold', error instanceof Error ? error : new Error(String(error)));
    return serverErrorResponse(error instanceof Error ? error : undefined);
  }
}
