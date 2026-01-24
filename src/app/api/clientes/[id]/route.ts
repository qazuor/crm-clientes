import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { UpdateClienteDTOSchema } from '@/lib/validations/cliente'
import {
  successResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/api-response'
import {
  registrarClienteEditado,
  registrarCambioEstado,
  registrarCambioPrioridad,
  registrarCambioAgente
} from '@/lib/actividades-automaticas'

// GET /api/clientes/[id] - Obtener cliente por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cliente = await prisma.cliente.findUnique({
      where: { id, deletedAt: null },
      include: {
        agente: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        actividades: {
          where: { deletedAt: null },
          orderBy: { fecha: 'desc' },
          include: {
            usuario: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
    })

    if (!cliente) {
      return notFoundResponse('Cliente')
    }

    return successResponse(cliente)

  } catch (error) {
    logger.error('Error fetching client', error instanceof Error ? error : new Error(String(error)))
    return serverErrorResponse(error instanceof Error ? error : undefined)
  }
}

// PUT /api/clientes/[id] - Actualizar cliente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session) {
      return unauthorizedResponse()
    }

    const { id } = await params;
    const body = await request.json()

    // Validate request body
    const validationResult = UpdateClienteDTOSchema.safeParse(body)
    if (!validationResult.success) {
      return validationErrorResponse(validationResult.error)
    }

    const data = validationResult.data

    // Verify client exists
    const clienteExistente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        agente: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    if (!clienteExistente) {
      return notFoundResponse('Cliente')
    }

    // Detect specific changes for logging
    const cambiosDetectados: string[] = [];
    const cambiosEspeciales: Array<() => Promise<void>> = [];

    // Detect state change
    if (data.estado && data.estado !== clienteExistente.estado) {
      cambiosEspeciales.push(() =>
        registrarCambioEstado(
          id,
          session.user.id,
          clienteExistente.nombre,
          clienteExistente.estado,
          data.estado!
        )
      );
    }

    // Detect priority change
    if (data.prioridad && data.prioridad !== clienteExistente.prioridad) {
      cambiosEspeciales.push(() =>
        registrarCambioPrioridad(
          id,
          session.user.id,
          clienteExistente.nombre,
          clienteExistente.prioridad,
          data.prioridad!
        )
      );
    }

    // Detect agent change
    if (data.agentId !== undefined && data.agentId !== clienteExistente.agentId) {
      const agenteAnterior = clienteExistente.agente?.name || null;
      let agenteNuevo: string | null = null;
      if (data.agentId) {
        const nuevoAgente = await prisma.user.findUnique({
          where: { id: data.agentId },
          select: { name: true, email: true }
        });
        agenteNuevo = nuevoAgente?.name || nuevoAgente?.email || null;
      }

      cambiosEspeciales.push(() =>
        registrarCambioAgente(
          id,
          session.user.id,
          clienteExistente.nombre,
          agenteAnterior,
          agenteNuevo
        )
      );
    }

    // Detect other general changes - using typed approach
    const fieldsToCheck = [
      'nombre', 'email', 'telefono', 'whatsapp', 'instagram', 'facebook',
      'linkedin', 'twitter', 'direccion', 'ciudad', 'provincia', 'codigoPostal',
      'industria', 'sitioWeb', 'tieneSSL', 'esResponsive', 'fuente', 'notas'
    ] as const;

    fieldsToCheck.forEach(key => {
      const currentValue = clienteExistente[key as keyof typeof clienteExistente];
      const newValue = data[key as keyof typeof data];

      if (newValue !== undefined && newValue !== currentValue &&
          !['estado', 'prioridad', 'agentId'].includes(key)) {
        cambiosDetectados.push(key);
      }
    });

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        ...data,
        fechaModific: new Date(),
      },
      include: {
        agente: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    // Execute specific change logging
    for (const logFunction of cambiosEspeciales) {
      await logFunction();
    }

    // Log general edit activity if there are other changes
    if (cambiosDetectados.length > 0) {
      await registrarClienteEditado(
        id,
        session.user.id,
        clienteExistente.nombre,
        cambiosDetectados
      );
    }

    logger.info('Client updated', { clienteId: id, changes: cambiosDetectados })

    return successResponse(cliente, {
      message: 'Cliente actualizado exitosamente'
    })

  } catch (error) {
    logger.error('Error updating client', error instanceof Error ? error : new Error(String(error)))
    return serverErrorResponse(error instanceof Error ? error : undefined)
  }
}

// DELETE /api/clientes/[id] - Soft delete cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session) {
      return unauthorizedResponse()
    }

    const { id } = await params;

    // Verify client exists and is not already deleted
    const cliente = await prisma.cliente.findUnique({
      where: { id }
    })

    if (!cliente) {
      return notFoundResponse('Cliente')
    }

    if (cliente.deletedAt) {
      return notFoundResponse('Cliente')
    }

    const now = new Date()

    // Soft delete related activities
    await prisma.actividad.updateMany({
      where: { clienteId: id, deletedAt: null },
      data: { deletedAt: now }
    })

    // Soft delete client
    await prisma.cliente.update({
      where: { id },
      data: { deletedAt: now }
    })

    logger.info('Client soft deleted', { clienteId: id, nombre: cliente.nombre })

    return successResponse(null, {
      message: 'Cliente eliminado exitosamente'
    })

  } catch (error) {
    logger.error('Error deleting client', error instanceof Error ? error : new Error(String(error)))
    return serverErrorResponse(error instanceof Error ? error : undefined)
  }
}
