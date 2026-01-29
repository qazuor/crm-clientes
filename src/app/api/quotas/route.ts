import { auth } from '@/lib/auth'
import { getAllQuotasInfo, getAllExtendedQuotasInfo, resetAllQuotas } from '@/lib/quota-manager'
import { logger } from '@/lib/logger'
import { hasPermission } from '@/lib/rbac'
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response'

// GET /api/quotas - Obtener estado actual de todas las quotas
export async function GET() {
  try {
    const session = await auth()

    if (!session) {
      return unauthorizedResponse()
    }

    if (!hasPermission(session.user.role, 'QUOTAS_VIEW')) {
      return errorResponse('Permisos insuficientes', { status: 403, code: 'FORBIDDEN' })
    }

    // Use extended info for admin settings dashboard
    const quotasInfo = await getAllExtendedQuotasInfo()

    logger.debug('Quotas fetched', { userId: session.user.id })

    return successResponse(quotasInfo)

  } catch (error) {
    logger.error('Error fetching quotas', error instanceof Error ? error : new Error(String(error)))
    return serverErrorResponse(error instanceof Error ? error : undefined)
  }
}

// POST /api/quotas - Reset manual de quotas (solo admin)
export async function POST() {
  try {
    const session = await auth()

    if (!session) {
      return unauthorizedResponse()
    }

    // Only admins can reset quotas
    if (!hasPermission(session.user.role, 'QUOTAS_RESET')) {
      logger.warn('Unauthorized quota reset attempt', { userId: session.user.id, role: session.user.role })
      return errorResponse('Solo administradores pueden resetear quotas', { status: 403, code: 'FORBIDDEN' })
    }

    await resetAllQuotas()

    logger.info('Quotas reset', { userId: session.user.id, adminName: session.user.name })

    return successResponse({
      message: 'Quotas reseteadas exitosamente',
      resetAt: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Error resetting quotas', error instanceof Error ? error : new Error(String(error)))
    return serverErrorResponse(error instanceof Error ? error : undefined)
  }
}
