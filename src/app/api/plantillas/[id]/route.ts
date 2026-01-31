import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { UpdatePlantillaSchema } from '@/lib/validations/plantilla';
import {
  successResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
  notFoundResponse,
  errorResponse,
} from '@/lib/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/plantillas/[id] - Obtener plantilla
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) return unauthorizedResponse();

    const { id } = await params;

    const plantilla = await prisma.plantillaContacto.findUnique({
      where: { id },
      include: {
        creadoPor: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { mensajes: true },
        },
      },
    });

    if (!plantilla) return notFoundResponse('Plantilla');

    return successResponse(plantilla);
  } catch (error) {
    logger.error('Error fetching plantilla', error instanceof Error ? error : new Error(String(error)));
    return serverErrorResponse(error instanceof Error ? error : undefined);
  }
}

// PUT /api/plantillas/[id] - Editar plantilla (solo ADMIN)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) return unauthorizedResponse();

    if (session.user.role !== 'ADMIN') {
      return errorResponse('Solo administradores pueden editar plantillas', { status: 403, code: 'FORBIDDEN' });
    }

    const { id } = await params;

    const existing = await prisma.plantillaContacto.findUnique({ where: { id } });
    if (!existing) return notFoundResponse('Plantilla');

    const body = await request.json();
    const validation = UpdatePlantillaSchema.safeParse(body);
    if (!validation.success) return validationErrorResponse(validation.error);

    const data = validation.data;

    // If changing to EMAIL, asunto must be present
    const finalCanal = data.canal || existing.canal;
    if (finalCanal === 'EMAIL') {
      const finalAsunto = data.asunto !== undefined ? data.asunto : existing.asunto;
      if (!finalAsunto || finalAsunto.trim() === '') {
        return errorResponse('El asunto es requerido para plantillas de email', {
          status: 400,
          code: 'VALIDATION_ERROR',
        });
      }
    }

    const plantilla = await prisma.plantillaContacto.update({
      where: { id },
      data: {
        ...data,
        canal: data.canal as import('@prisma/client').CanalContacto | undefined,
      },
      include: {
        creadoPor: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    logger.info('Plantilla updated', { id: plantilla.id });

    return successResponse(plantilla, { message: 'Plantilla actualizada exitosamente' });
  } catch (error) {
    logger.error('Error updating plantilla', error instanceof Error ? error : new Error(String(error)));
    return serverErrorResponse(error instanceof Error ? error : undefined);
  }
}

// DELETE /api/plantillas/[id] - Eliminar plantilla (solo ADMIN, soft via esActiva=false)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) return unauthorizedResponse();

    if (session.user.role !== 'ADMIN') {
      return errorResponse('Solo administradores pueden eliminar plantillas', { status: 403, code: 'FORBIDDEN' });
    }

    const { id } = await params;

    const existing = await prisma.plantillaContacto.findUnique({ where: { id } });
    if (!existing) return notFoundResponse('Plantilla');

    await prisma.plantillaContacto.update({
      where: { id },
      data: { esActiva: false },
    });

    logger.info('Plantilla deactivated', { id });

    return successResponse(null, { message: 'Plantilla eliminada exitosamente' });
  } catch (error) {
    logger.error('Error deleting plantilla', error instanceof Error ? error : new Error(String(error)));
    return serverErrorResponse(error instanceof Error ? error : undefined);
  }
}
