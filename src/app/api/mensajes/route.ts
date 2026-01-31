import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { CanalContacto, EstadoMensaje, Prisma } from '@prisma/client';
import { MensajeFiltersSchema } from '@/lib/validations/mensaje';
import {
  successResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from '@/lib/api-response';

// GET /api/mensajes - Listar mensajes con filtros
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const rawFilters = {
      clienteId: searchParams.get('clienteId') || undefined,
      canal: searchParams.get('canal') || undefined,
      estado: searchParams.get('estado') || undefined,
      limit: searchParams.get('limit') || '20',
      offset: searchParams.get('offset') || '0',
    };

    const validation = MensajeFiltersSchema.safeParse(rawFilters);
    if (!validation.success) return validationErrorResponse(validation.error);

    const filters = validation.data;

    const where: Prisma.MensajeWhereInput = {};
    if (filters.clienteId) where.clienteId = filters.clienteId;
    if (filters.canal) where.canal = filters.canal as CanalContacto;
    if (filters.estado) where.estado = filters.estado as EstadoMensaje;

    const [mensajes, total] = await Promise.all([
      prisma.mensaje.findMany({
        where,
        include: {
          cliente: {
            select: { id: true, nombre: true, email: true, whatsapp: true },
          },
          usuario: {
            select: { id: true, name: true, email: true },
          },
          plantilla: {
            select: { id: true, nombre: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: filters.offset,
        take: filters.limit,
      }),
      prisma.mensaje.count({ where }),
    ]);

    return successResponse(mensajes, {
      pagination: {
        page: Math.floor(filters.offset / filters.limit) + 1,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching mensajes', error instanceof Error ? error : new Error(String(error)));
    return serverErrorResponse(error instanceof Error ? error : undefined);
  }
}
