import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { EstadoClienteSchema, PrioridadClienteSchema } from '@/lib/validations/cliente'
import {
  successResponse,
  validationErrorResponse,
  errorResponse,
  unauthorizedResponse,
  handlePrismaError,
} from '@/lib/api-response'
import {
  registrarCambioEstado,
  registrarCambioPrioridad,
  registrarClienteEliminado,
} from '@/lib/actividades-automaticas'

const BulkActionSchema = z.discriminatedUnion('action', [
  z.object({
    ids: z.array(z.string()).min(1, 'Debe seleccionar al menos un cliente').max(100, 'Máximo 100 clientes por operación'),
    action: z.literal('delete'),
  }),
  z.object({
    ids: z.array(z.string()).min(1, 'Debe seleccionar al menos un cliente').max(100, 'Máximo 100 clientes por operación'),
    action: z.literal('changeEstado'),
    estado: EstadoClienteSchema,
  }),
  z.object({
    ids: z.array(z.string()).min(1, 'Debe seleccionar al menos un cliente').max(100, 'Máximo 100 clientes por operación'),
    action: z.literal('changePrioridad'),
    prioridad: PrioridadClienteSchema,
  }),
])

// POST /api/clientes/bulk - Operaciones masivas
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session) {
      return unauthorizedResponse()
    }

    const body = await request.json()

    const validationResult = BulkActionSchema.safeParse(body)
    if (!validationResult.success) {
      return validationErrorResponse(validationResult.error)
    }

    const data = validationResult.data

    // Verify all IDs exist and are not deleted
    const clientes = await prisma.cliente.findMany({
      where: {
        id: { in: data.ids },
        deletedAt: null,
      },
      select: { id: true, nombre: true, estado: true, prioridad: true },
    })

    if (clientes.length === 0) {
      return errorResponse('No se encontraron clientes válidos', { status: 400 })
    }

    const validIds = clientes.map(c => c.id)

    if (data.action === 'delete') {
      const now = new Date()

      await prisma.$transaction([
        prisma.actividad.updateMany({
          where: { clienteId: { in: validIds }, deletedAt: null },
          data: { deletedAt: now },
        }),
        prisma.cliente.updateMany({
          where: { id: { in: validIds } },
          data: { deletedAt: now },
        }),
      ])

      // Log activity for each client (non-critical, wrapped in try-catch)
      try {
        for (const cliente of clientes) {
          await registrarClienteEliminado(
            cliente.id,
            session.user.id,
            cliente.nombre
          )
        }
      } catch (activityError) {
        logger.warn('Failed to log bulk delete activities', {
          error: activityError instanceof Error ? activityError.message : String(activityError),
          clientCount: clientes.length,
        })
      }

      logger.info('Bulk delete', { count: validIds.length, userId: session.user.id })

      return successResponse(
        { affected: validIds.length },
        { message: `${validIds.length} cliente(s) eliminado(s) exitosamente` }
      )
    }

    if (data.action === 'changeEstado') {
      await prisma.cliente.updateMany({
        where: { id: { in: validIds } },
        data: { estado: data.estado, fechaModific: new Date() },
      })

      // Log activity for each changed client (non-critical)
      try {
        for (const cliente of clientes) {
          if (cliente.estado !== data.estado) {
            await registrarCambioEstado(
              cliente.id,
              session.user.id,
              cliente.nombre,
              cliente.estado,
              data.estado
            )
          }
        }
      } catch (activityError) {
        logger.warn('Failed to log bulk estado change activities', {
          error: activityError instanceof Error ? activityError.message : String(activityError),
          clientCount: clientes.length,
        })
      }

      logger.info('Bulk change estado', { count: validIds.length, estado: data.estado, userId: session.user.id })

      return successResponse(
        { affected: validIds.length },
        { message: `Estado actualizado a "${data.estado}" en ${validIds.length} cliente(s)` }
      )
    }

    if (data.action === 'changePrioridad') {
      await prisma.cliente.updateMany({
        where: { id: { in: validIds } },
        data: { prioridad: data.prioridad, fechaModific: new Date() },
      })

      // Log activity for each changed client (non-critical)
      try {
        for (const cliente of clientes) {
          if (cliente.prioridad !== data.prioridad) {
            await registrarCambioPrioridad(
              cliente.id,
              session.user.id,
              cliente.nombre,
              cliente.prioridad,
              data.prioridad
            )
          }
        }
      } catch (activityError) {
        logger.warn('Failed to log bulk prioridad change activities', {
          error: activityError instanceof Error ? activityError.message : String(activityError),
          clientCount: clientes.length,
        })
      }

      logger.info('Bulk change prioridad', { count: validIds.length, prioridad: data.prioridad, userId: session.user.id })

      return successResponse(
        { affected: validIds.length },
        { message: `Prioridad actualizada a "${data.prioridad}" en ${validIds.length} cliente(s)` }
      )
    }

  } catch (error) {
    logger.error('Error in bulk operation', error instanceof Error ? error : new Error(String(error)))
    return handlePrismaError(error)
  }
}
