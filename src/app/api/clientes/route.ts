import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { registrarClienteCreado } from '@/lib/actividades-automaticas'
import { logger } from '@/lib/logger'
import { Prisma, EstadoCliente, PrioridadCliente, FuenteCliente } from '@prisma/client'
import {
  ClienteFiltersSchema,
  CreateClienteDTOSchema,
} from '@/lib/validations/cliente'
import {
  successResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
  handlePrismaError,
} from '@/lib/api-response'

// GET /api/clientes - Obtener lista de clientes
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)

    // Parse and validate query params
    const rawFilters = {
      search: searchParams.get('search') || undefined,
      estado: searchParams.get('estado') || undefined,
      prioridad: searchParams.get('prioridad') || undefined,
      fuente: searchParams.get('fuente') || undefined,
      industria: searchParams.get('industria') || undefined,
      limit: searchParams.get('limit') || '10',
      offset: searchParams.get('offset') || '0',
      sortBy: searchParams.get('sortBy') || 'fechaCreacion',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    }

    const validationResult = ClienteFiltersSchema.safeParse(rawFilters)
    if (!validationResult.success) {
      return validationErrorResponse(validationResult.error)
    }

    const filters = validationResult.data

    // Build where clause with proper Prisma typing
    const where: Prisma.ClienteWhereInput = {
      deletedAt: null // Exclude soft-deleted clients
    }

    if (filters.search) {
      where.OR = [
        { nombre: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { telefono: { contains: filters.search } },
      ]
    }

    if (filters.estado) where.estado = filters.estado as EstadoCliente
    if (filters.prioridad) where.prioridad = filters.prioridad as PrioridadCliente
    if (filters.fuente) where.fuente = filters.fuente as FuenteCliente
    if (filters.industria) where.industria = filters.industria

    // Fetch clients
    const clientes = await prisma.cliente.findMany({
      where,
      include: {
        actividades: {
          where: { deletedAt: null },
          take: 3,
          orderBy: { fecha: 'desc' },
          select: {
            id: true,
            tipo: true,
            descripcion: true,
            fecha: true,
          }
        }
      },
      orderBy: {
        [filters.sortBy]: filters.sortOrder
      },
      skip: filters.offset,
      take: filters.limit,
    })

    // Count total
    const total = await prisma.cliente.count({ where })

    return successResponse(clientes, {
      pagination: {
        page: Math.floor(filters.offset / filters.limit) + 1,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      }
    })

  } catch (error) {
    logger.error('Error fetching clients', error instanceof Error ? error : new Error(String(error)))
    return serverErrorResponse(error instanceof Error ? error : undefined)
  }
}

// POST /api/clientes - Crear nuevo cliente
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session) {
      return unauthorizedResponse()
    }

    const body = await request.json()

    // Validate request body
    const validationResult = CreateClienteDTOSchema.safeParse(body)
    if (!validationResult.success) {
      return validationErrorResponse(validationResult.error)
    }

    const data = validationResult.data

    const cliente = await prisma.cliente.create({
      data: {
        ...data,
        fechaCreacion: new Date(),
        fechaModific: new Date(),
      },
    })

    // Registrar actividad automática
    await registrarClienteCreado(
      cliente.id,
      session.user.id,
      cliente.nombre
    )

    logger.info('Client created', { clienteId: cliente.id, nombre: cliente.nombre })

    return successResponse(cliente, {
      status: 201,
      message: 'Cliente creado exitosamente'
    })

  } catch (error) {
    logger.error('Error creating client', error instanceof Error ? error : new Error(String(error)))
    return handlePrismaError(error)
  }
}