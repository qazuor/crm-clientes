import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { isAdmin } from '@/lib/rbac';
import { ApiKeyService } from '@/lib/services/api-key-service';
import { createApiKeySchema } from '@/lib/validations/api-key';
import { logAudit } from '@/lib/audit';
import type { ApiKeyResponse, ApiKeyProvider } from '@/types/enrichment';
import type { ApiResponse } from '@/types';

// GET /api/admin/api-keys - List all API keys
export async function GET(): Promise<NextResponse<ApiResponse<ApiKeyResponse[]>>> {
  try {
    const session = await auth();

    if (!session || !isAdmin(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const keys = await ApiKeyService.getAll();

    return NextResponse.json({
      success: true,
      data: keys,
    });
  } catch (error) {
    logger.error('Error fetching API keys', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: 'Error al obtener las API keys' },
      { status: 500 }
    );
  }
}

// POST /api/admin/api-keys - Create a new API key
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ApiKeyResponse>>> {
  try {
    const session = await auth();

    if (!session || !isAdmin(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = createApiKeySchema.safeParse(body);
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

    // Check if provider already exists in database (not env vars)
    const existing = await ApiKeyService.existsInDatabase(validation.data.provider as ApiKeyProvider);
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Ya existe una API key para este proveedor' },
        { status: 409 }
      );
    }

    const key = await ApiKeyService.create({
      provider: validation.data.provider as ApiKeyProvider,
      apiKey: validation.data.apiKey,
      model: validation.data.model,
      enabled: validation.data.enabled,
    });

    await logAudit(
      'api_key.create',
      session.user.id,
      'ApiKey',
      key.id,
      `Provider: ${validation.data.provider}`
    );

    return NextResponse.json(
      {
        success: true,
        data: key,
        message: 'API key creada exitosamente',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating API key', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: 'Error al crear la API key' },
      { status: 500 }
    );
  }
}
