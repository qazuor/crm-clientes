/**
 * Bulk Enrichment API Endpoint
 * POST /api/admin/bulk-enrich - Run bulk enrichment
 * GET /api/admin/bulk-enrich - Get enrichment stats and pending clients
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { isAdmin } from '@/lib/rbac';
import { BulkEnrichmentService } from '@/lib/services/bulk-enrichment-service';
import { AISdkService } from '@/lib/services/ai-sdk-service';
import { BULK } from '@/lib/constants';
import type { AIProvider } from '@/types/enrichment';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Solo administradores pueden ejecutar enriquecimiento masivo' }, { status: 403 });
    }

    const body = await request.json();
    const { clienteIds, includeAI = true, includeWebsiteAnalysis = true, provider: rawProvider } = body;

    if (!clienteIds || !Array.isArray(clienteIds) || clienteIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere una lista de IDs de clientes' },
        { status: 400 }
      );
    }

    if (clienteIds.length > BULK.MAX_CLIENTS) {
      return NextResponse.json(
        { error: `Maximo ${BULK.MAX_CLIENTS} clientes por operacion` },
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
    logger.error('[Bulk Enrich] Error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Error en enriquecimiento masivo' },
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

    if (!isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Solo administradores pueden confirmar/rechazar enriquecimiento masivo' }, { status: 403 });
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
    logger.error('[Bulk Enrich] Batch confirm/reject error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Error al procesar la accion' },
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

    if (!isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Solo administradores pueden ver estadisticas de enriquecimiento masivo' }, { status: 403 });
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
    logger.error('[Bulk Enrich] Get stats error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Error al obtener estadisticas' },
      { status: 500 }
    );
  }
}
