import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { isAdmin } from '@/lib/rbac';
import { ApiKeyService } from '@/lib/services/api-key-service';
import { updateApiKeySchema } from '@/lib/validations/api-key';
import { logAudit } from '@/lib/audit';
import type { ApiKeyResponse } from '@/types/enrichment';
import type { ApiResponse } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/api-keys/[id] - Get a single API key
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<ApiKeyResponse>>> {
  try {
    const session = await auth();

    if (!session || !isAdmin(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const key = await ApiKeyService.getById(id);

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'API key no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: key,
    });
  } catch (error) {
    logger.error('Error fetching API key', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: 'Error al obtener la API key' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/api-keys/[id] - Update an API key
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<ApiKeyResponse>>> {
  try {
    const session = await auth();

    if (!session || !isAdmin(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validation = updateApiKeySchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues?.[0];
      return NextResponse.json(
        {
          success: false,
          error: firstError?.message ?? 'Datos invalidos',
        },
        { status: 400 }
      );
    }

    // Check if key exists
    const existing = await ApiKeyService.getById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'API key no encontrada' },
        { status: 404 }
      );
    }

    const key = await ApiKeyService.update(id, validation.data);

    await logAudit(
      'api_key.update',
      session.user.id,
      'ApiKey',
      id,
      `Provider: ${existing.provider}`
    );

    return NextResponse.json({
      success: true,
      data: key,
      message: 'API key actualizada exitosamente',
    });
  } catch (error) {
    logger.error('Error updating API key', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: 'Error al actualizar la API key' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/api-keys/[id] - Delete an API key
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<void>>> {
  try {
    const session = await auth();

    if (!session || !isAdmin(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if key exists
    const existing = await ApiKeyService.getById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'API key no encontrada' },
        { status: 404 }
      );
    }

    await ApiKeyService.delete(id);

    await logAudit(
      'api_key.delete',
      session.user.id,
      'ApiKey',
      id,
      `Provider: ${existing.provider}`
    );

    return NextResponse.json({
      success: true,
      message: 'API key eliminada exitosamente',
    });
  } catch (error) {
    logger.error('Error deleting API key', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: 'Error al eliminar la API key' },
      { status: 500 }
    );
  }
}
