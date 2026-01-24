import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import {
  ActividadFiltersSchema,
  CreateActividadDTOSchema,
} from '@/lib/validations/actividad'
import {
  successResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/api-response'

// GET /api/actividades - Obtener lista de actividades
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse and validate query params
    const rawFilters = {
      clienteId: searchParams.get('clienteId') || undefined,
      usuarioId: searchParams.get('usuarioId') || undefined,
      tipo: searchParams.get('tipo') || undefined,
      limit: searchParams.get('limit') || '20',
      offset: searchParams.get('offset') || '0',
    }

    const validationResult = ActividadFiltersSchema.safeParse(rawFilters)
    if (!validationResult.success) {
      return validationErrorResponse(validationResult.error)
    }

    const filters = validationResult.data

    // Build where clause with proper typing
    const where: {
      clienteId?: string;
      usuarioId?: string;
      tipo?: string;
    } = {}

    if (filters.clienteId) where.clienteId = filters.clienteId
    if (filters.usuarioId) where.usuarioId = filters.usuarioId
    if (filters.tipo) where.tipo = filters.tipo

    // Fetch activities
    const actividades = await prisma.actividad.findMany({
      where,
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            email: true,
          }
        },
        usuario: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: { fecha: 'desc' },
      skip: filters.offset,
      take: filters.limit,
    })

    // Count total
    const total = await prisma.actividad.count({ where })

    return successResponse(actividades, {
      pagination: {
        page: Math.floor(filters.offset / filters.limit) + 1,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      }
    })

  } catch (error) {
    logger.error('Error fetching activities', error instanceof Error ? error : new Error(String(error)))
    return serverErrorResponse(error instanceof Error ? error : undefined)
  }
}

// POST /api/actividades - Crear nueva actividad
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return unauthorizedResponse()
    }

    const body = await request.json()

    // Validate request body
    const validationResult = CreateActividadDTOSchema.safeParse(body)
    if (!validationResult.success) {
      return validationErrorResponse(validationResult.error)
    }

    const data = validationResult.data

    // Verify client exists
    const cliente = await prisma.cliente.findUnique({
      where: { id: data.clienteId }
    })

    if (!cliente) {
      return notFoundResponse('Cliente')
    }

    const actividad = await prisma.actividad.create({
      data: {
        ...data,
        fecha: new Date(),
        usuarioId: session.user.id,
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            email: true,
          }
        },
        usuario: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    // Update client's last contact date
    await prisma.cliente.update({
      where: { id: data.clienteId },
      data: {
        ultimoContacto: new Date(),
        fechaModific: new Date(),
      }
    })

    logger.info('Activity created', { actividadId: actividad.id, clienteId: data.clienteId })

    return successResponse(actividad, {
      status: 201,
      message: 'Actividad creada exitosamente'
    })

  } catch (error) {
    logger.error('Error creating activity', error instanceof Error ? error : new Error(String(error)))
    return serverErrorResponse(error instanceof Error ? error : undefined)
  }
}