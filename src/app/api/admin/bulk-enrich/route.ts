/**
 * Bulk Enrichment API Endpoint
 * POST /api/admin/bulk-enrich - Run bulk enrichment
 * GET /api/admin/bulk-enrich - Get enrichment stats and pending clients
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { BulkEnrichmentService } from '@/lib/services/bulk-enrichment-service';
import { AISdkService } from '@/lib/services/ai-sdk-service';
import type { AIProvider } from '@/types/enrichment';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { clienteIds, includeAI = true, includeWebsiteAnalysis = true, provider: rawProvider } = body;

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

    // Validate and map provider: 'auto' or undefined means fallback mode
    const validProviders: AIProvider[] = ['openai', 'gemini', 'grok', 'deepseek'];
    let provider: AIProvider | undefined;
    if (rawProvider && rawProvider !== 'auto') {
      if (!validProviders.includes(rawProvider)) {
        return NextResponse.json(
          { error: `Provider invalido: ${rawProvider}. Validos: auto, ${validProviders.join(', ')}` },
          { status: 400 }
        );
      }
      provider = rawProvider as AIProvider;
    }

    const result = await BulkEnrichmentService.enrichClients({
      clienteIds,
      includeAI,
      includeWebsiteAnalysis,
      provider,
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

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action, items } = body;

    if (!action || !['confirm', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Accion invalida. Usar "confirm" o "reject"' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere una lista de items con clienteId y fields' },
        { status: 400 }
      );
    }

    // Validate items structure
    for (const item of items) {
      if (!item.clienteId || !Array.isArray(item.fields) || item.fields.length === 0) {
        return NextResponse.json(
          { error: 'Cada item debe tener clienteId y fields (array no vacio)' },
          { status: 400 }
        );
      }
    }

    if (action === 'confirm') {
      const result = await BulkEnrichmentService.confirmFields(items, session.user.id!);
      return NextResponse.json({ success: true, ...result });
    } else {
      const result = await BulkEnrichmentService.rejectFields(items, session.user.id!);
      return NextResponse.json({ success: true, ...result });
    }
  } catch (error) {
    console.error('Batch confirm/reject error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al procesar la accion' },
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

    // Get stats, pending clients, pending confirmation, and available AI providers
    const [stats, pendingClients, pendingConfirmation, availableAIProviders] = await Promise.all([
      BulkEnrichmentService.getEnrichmentStats(),
      BulkEnrichmentService.getClientsNeedingEnrichment(50),
      BulkEnrichmentService.getClientesPendingConfirmation(),
      AISdkService.getAvailableProviders(),
    ]);

    return NextResponse.json({
      stats,
      pendingClients,
      pendingConfirmation,
      availableAIProviders,
    });
  } catch (error) {
    console.error('Get bulk enrichment stats error:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadisticas' },
      { status: 500 }
    );
  }
}
