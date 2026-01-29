import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SettingsService } from '@/lib/services/settings-service';
import { enrichmentSettingsSchema } from '@/lib/validations/enrichment-settings';
import type { EnrichmentSettings } from '@/types/enrichment';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// GET /api/admin/settings/enrichment - Get enrichment settings
export async function GET(): Promise<NextResponse<ApiResponse<EnrichmentSettings>>> {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'ADMIN') {
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
    console.error('Error fetching enrichment settings:', error);
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

    if (!session || session.user.role !== 'ADMIN') {
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
    console.error('Error updating enrichment settings:', error);
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

    if (!session || session.user.role !== 'ADMIN') {
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
    console.error('Error resetting enrichment settings:', error);
    return NextResponse.json(
      { success: false, error: 'Error al restaurar la configuracion' },
      { status: 500 }
    );
  }
}
