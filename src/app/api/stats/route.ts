import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response'

// GET /api/stats - Obtener estadísticas del dashboard
export async function GET() {
  try {
    const session = await auth()

    if (!session) {
      return unauthorizedResponse()
    }

    // Dates for queries
    const hoy = new Date()
    const inicioDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
    const finDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1)
    const hace30Dias = new Date()
    hace30Dias.setDate(hace30Dias.getDate() - 30)

    // Execute all queries in parallel for better performance
    const [
      totalClientes,
      clientesPorEstado,
      clientesPorPrioridad,
      clientesPorFuente,
      actividadesHoy,
      llamadasHoy,
      emailsHoy,
      clientesActivos,
      actividadesRecientes
    ] = await Promise.all([
      // Total clients (excluding soft-deleted)
      prisma.cliente.count({
        where: { deletedAt: null }
      }),

      // Clients by status
      prisma.cliente.groupBy({
        by: ['estado'],
        where: { deletedAt: null },
        _count: { estado: true }
      }),

      // Clients by priority
      prisma.cliente.groupBy({
        by: ['prioridad'],
        where: { deletedAt: null },
        _count: { prioridad: true }
      }),

      // Clients by source
      prisma.cliente.groupBy({
        by: ['fuente'],
        where: { deletedAt: null },
        _count: { fuente: true }
      }),

      // Activities today
      prisma.actividad.count({
        where: {
          deletedAt: null,
          fecha: { gte: inicioDelDia, lt: finDelDia }
        }
      }),

      // Calls today
      prisma.actividad.count({
        where: {
          tipo: 'LLAMADA',
          deletedAt: null,
          fecha: { gte: inicioDelDia, lt: finDelDia }
        }
      }),

      // Emails today
      prisma.actividad.count({
        where: {
          tipo: 'EMAIL',
          deletedAt: null,
          fecha: { gte: inicioDelDia, lt: finDelDia }
        }
      }),

      // Active clients (with contact in last 30 days)
      prisma.cliente.count({
        where: {
          deletedAt: null,
          ultimoContacto: { gte: hace30Dias }
        }
      }),

      // Recent activities
      prisma.actividad.findMany({
        where: { deletedAt: null },
        take: 5,
        orderBy: { fecha: 'desc' },
        include: {
          cliente: {
            select: { nombre: true }
          },
          usuario: {
            select: { name: true }
          }
        }
      })
    ])

    // Format data for dashboard
    const porEstado: Record<string, number> = {}
    clientesPorEstado.forEach(item => {
      porEstado[item.estado] = item._count.estado
    })

    const porPrioridad: Record<string, number> = {}
    clientesPorPrioridad.forEach(item => {
      porPrioridad[item.prioridad] = item._count.prioridad
    })

    const porFuente: Record<string, number> = {}
    clientesPorFuente.forEach(item => {
      porFuente[item.fuente] = item._count.fuente
    })

    logger.debug('Stats fetched', { userId: session.user.id })

    return successResponse({
      resumen: {
        totalClientes,
        clientesActivos,
        actividadesHoy,
        llamadasHoy,
        emailsHoy,
      },
      distribucion: {
        porEstado,
        porPrioridad,
        porFuente
      },
      actividadesRecientes
    })

  } catch (error) {
    logger.error('Error fetching stats', error instanceof Error ? error : new Error(String(error)))
    return serverErrorResponse(error instanceof Error ? error : undefined)
  }
}
