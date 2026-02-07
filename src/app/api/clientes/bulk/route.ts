import { NextRequest, NextResponse } from 'next/server'
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
import { BULK } from '@/lib/constants'

const bulkMaxMsg = `Máximo ${BULK.MAX_BULK_ACTION} clientes por operación`;

const BulkActionSchema = z.discriminatedUnion('action', [
  z.object({
    ids: z.array(z.string()).min(1, 'Debe seleccionar al menos un cliente').max(BULK.MAX_BULK_ACTION, bulkMaxMsg),
    action: z.literal('delete'),
  }),
  z.object({
    ids: z.array(z.string()).min(1, 'Debe seleccionar al menos un cliente').max(BULK.MAX_BULK_ACTION, bulkMaxMsg),
    action: z.literal('changeEstado'),
    estado: EstadoClienteSchema,
  }),
  z.object({
    ids: z.array(z.string()).min(1, 'Debe seleccionar al menos un cliente').max(BULK.MAX_BULK_ACTION, bulkMaxMsg),
    action: z.literal('changePrioridad'),
    prioridad: PrioridadClienteSchema,
  }),
])

// POST /api/clientes/bulk - Operaciones masivas
export async function POST(request: NextRequest): Promise<NextResponse> {
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

      await prisma.$transaction(async (tx) => {
        await tx.actividad.updateMany({
          where: { clienteId: { in: validIds }, deletedAt: null },
          data: { deletedAt: now },
        })
        await tx.cliente.updateMany({
          where: { id: { in: validIds } },
          data: { deletedAt: now },
        })
        // Activity logging inside transaction for atomicity
        for (const cliente of clientes) {
          await tx.actividad.create({
            data: {
              tipo: 'CLIENTE_ELIMINADO',
              descripcion: `Cliente "${cliente.nombre}" fue eliminado del sistema`,
              resultado: 'Cliente removido de la base de datos',
              clienteId: cliente.id,
              usuarioId: session.user.id,
              esAutomatica: true,
              fecha: now,
            },
          })
        }
      })

      logger.info('Bulk delete', { count: validIds.length, userId: session.user.id })

      return successResponse(
        { affected: validIds.length },
        { message: `${validIds.length} cliente(s) eliminado(s) exitosamente` }
      )
    }

    if (data.action === 'changeEstado') {
      const now = new Date()

      await prisma.$transaction(async (tx) => {
        await tx.cliente.updateMany({
          where: { id: { in: validIds } },
          data: { estado: data.estado, fechaModific: now },
        })
        for (const cliente of clientes) {
          if (cliente.estado !== data.estado) {
            await tx.actividad.create({
              data: {
                tipo: 'NOTA',
                descripcion: `Estado del cliente "${cliente.nombre}" cambió de "${cliente.estado}" a "${data.estado}"`,
                resultado: `Estado actualizado: ${data.estado}`,
                clienteId: cliente.id,
                usuarioId: session.user.id,
                esAutomatica: true,
                fecha: now,
              },
            })
          }
        }
      })

      logger.info('Bulk change estado', { count: validIds.length, estado: data.estado, userId: session.user.id })

      return successResponse(
        { affected: validIds.length },
        { message: `Estado actualizado a "${data.estado}" en ${validIds.length} cliente(s)` }
      )
    }

    if (data.action === 'changePrioridad') {
      const now = new Date()

      await prisma.$transaction(async (tx) => {
        await tx.cliente.updateMany({
          where: { id: { in: validIds } },
          data: { prioridad: data.prioridad, fechaModific: now },
        })
        for (const cliente of clientes) {
          if (cliente.prioridad !== data.prioridad) {
            await tx.actividad.create({
              data: {
                tipo: 'NOTA',
                descripcion: `Prioridad del cliente "${cliente.nombre}" cambió de "${cliente.prioridad}" a "${data.prioridad}"`,
                resultado: `Prioridad actualizada: ${data.prioridad}`,
                clienteId: cliente.id,
                usuarioId: session.user.id,
                esAutomatica: true,
                fecha: now,
              },
            })
          }
        }
      })

      logger.info('Bulk change prioridad', { count: validIds.length, prioridad: data.prioridad, userId: session.user.id })

      return successResponse(
        { affected: validIds.length },
        { message: `Prioridad actualizada a "${data.prioridad}" en ${validIds.length} cliente(s)` }
      )
    }

    // This should never be reached due to discriminated union validation
    return errorResponse('Accion invalida', { status: 400 })

  } catch (error) {
    logger.error('Error in bulk operation', error instanceof Error ? error : new Error(String(error)))
    return handlePrismaError(error)
  }
}
