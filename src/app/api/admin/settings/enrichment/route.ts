import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { isAdmin } from '@/lib/rbac';
import { SettingsService } from '@/lib/services/settings-service';
import { enrichmentSettingsSchema } from '@/lib/validations/enrichment-settings';
import type { EnrichmentSettings } from '@/types/enrichment';
import type { ApiResponse } from '@/types';

// GET /api/admin/settings/enrichment - Get enrichment settings
export async function GET(): Promise<NextResponse<ApiResponse<EnrichmentSettings>>> {
  try {
    const session = await auth();

    if (!session || !isAdmin(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const settings = await SettingsService.getEnrichmentSettings();

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('Error fetching enrichment settings', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: 'Error al obtener la configuracion' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings/enrichment - Update enrichment settings
export async function PUT(
  request: NextRequest
): Promise<NextResponse<ApiResponse<EnrichmentSettings>>> {
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
    const validation = enrichmentSettingsSchema.safeParse(body);
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

    const settings = await SettingsService.updateEnrichmentSettings(validation.data);

    return NextResponse.json({
      success: true,
      data: settings,
      message: 'Configuracion actualizada exitosamente',
    });
  } catch (error) {
    logger.error('Error updating enrichment settings', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: 'Error al actualizar la configuracion' },
      { status: 500 }
    );
  }
}

// POST /api/admin/settings/enrichment - Reset to defaults
export async function POST(): Promise<NextResponse<ApiResponse<EnrichmentSettings>>> {
  try {
    const session = await auth();

    if (!session || !isAdmin(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const settings = await SettingsService.resetEnrichmentSettings();

    return NextResponse.json({
      success: true,
      data: settings,
      message: 'Configuracion restaurada a valores por defecto',
    });
  } catch (error) {
    logger.error('Error resetting enrichment settings', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: 'Error al restaurar la configuracion' },
      { status: 500 }
    );
  }
}
