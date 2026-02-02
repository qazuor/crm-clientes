import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { isAdmin } from '@/lib/rbac';
import { CanalContacto } from '@prisma/client';
import {
  CreatePlantillaSchema,
  PlantillaFiltersSchema,
} from '@/lib/validations/plantilla';
import {
  successResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
  errorResponse,
} from '@/lib/api-response';

// GET /api/plantillas - Listar plantillas
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const rawFilters = {
      canal: searchParams.get('canal') || undefined,
      esActiva: searchParams.get('esActiva') || undefined,
    };

    const validation = PlantillaFiltersSchema.safeParse(rawFilters);
    if (!validation.success) return validationErrorResponse(validation.error);

    const filters = validation.data;

    const where: { canal?: CanalContacto; esActiva?: boolean } = {};
    if (filters.canal) where.canal = filters.canal as CanalContacto;
    if (filters.esActiva !== undefined) where.esActiva = filters.esActiva;

    const plantillas = await prisma.plantillaContacto.findMany({
      where,
      include: {
        creadoPor: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { mensajes: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(plantillas);
  } catch (error) {
    logger.error('Error fetching plantillas', error instanceof Error ? error : new Error(String(error)));
    return serverErrorResponse(error instanceof Error ? error : undefined);
  }
}

// POST /api/plantillas - Crear plantilla (solo ADMIN)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return unauthorizedResponse();

    if (!isAdmin(session.user.role)) {
      return errorResponse('Solo administradores pueden crear plantillas', { status: 403, code: 'FORBIDDEN' });
    }

    const body = await request.json();
    const validation = CreatePlantillaSchema.safeParse(body);
    if (!validation.success) return validationErrorResponse(validation.error);

    const data = validation.data;

    const plantilla = await prisma.plantillaContacto.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        canal: data.canal as CanalContacto,
        asunto: data.asunto || null,
        cuerpo: data.cuerpo,
        creadoPorId: session.user.id,
      },
      include: {
        creadoPor: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    logger.info('Plantilla created', { id: plantilla.id, nombre: plantilla.nombre });

    return successResponse(plantilla, {
      status: 201,
      message: 'Plantilla creada exitosamente',
    });
  } catch (error) {
    logger.error('Error creating plantilla', error instanceof Error ? error : new Error(String(error)));
    return serverErrorResponse(error instanceof Error ? error : undefined);
  }
}
