/**
 * Bulk Enrichment API Endpoint
 * POST /api/admin/bulk-enrich - Run bulk enrichment
 * GET /api/admin/bulk-enrich - Get enrichment stats and pending clients
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { BulkEnrichmentService } from '@/lib/services/bulk-enrichment-service';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Only admins can run bulk enrichment
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo administradores pueden ejecutar enriquecimiento en bloque' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { clienteIds, includeAI = true, includeWebsiteAnalysis = true } = body;

    if (!clienteIds || !Array.isArray(clienteIds) || clienteIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere una lista de IDs de clientes' },
        { status: 400 }
      );
    }

    if (clienteIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximo 50 clientes por operacion' },
        { status: 400 }
      );
    }

    const result = await BulkEnrichmentService.enrichClients({
      clienteIds,
      includeAI,
      includeWebsiteAnalysis,
      userId: session.user.id!,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Bulk enrichment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error en enriquecimiento' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Get stats and pending clients
    const [stats, pendingClients] = await Promise.all([
      BulkEnrichmentService.getEnrichmentStats(),
      BulkEnrichmentService.getClientsNeedingEnrichment(50),
    ]);

    return NextResponse.json({
      stats,
      pendingClients,
    });
  } catch (error) {
    console.error('Get bulk enrichment stats error:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadisticas' },
      { status: 500 }
    );
  }
}
