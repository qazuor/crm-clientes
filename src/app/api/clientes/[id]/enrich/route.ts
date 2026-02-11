/**
 * Client Enrichment API Endpoint
 * POST /api/clientes/[id]/enrich - Launch enrichment (AI or Web)
 * GET /api/clientes/[id]/enrich - Get enrichment state, history, and website analysis
 * PATCH /api/clientes/[id]/enrich - Confirm/reject/edit fields
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { BulkEnrichmentService } from '@/lib/services/bulk-enrichment-service';
import type { FieldReviewStatus, ReviewableField } from '@/types/enrichment';
import { enrichmentPostSchema, enrichmentPatchSchema } from '@/lib/validations/enrichment';
import { enrichmentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limiter';
import { handleEnrichPost } from './post-handler';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const ip = getClientIp(request);
  const rl = enrichmentRateLimit(`enrich:${ip}`);
  if (!rl.success) return rateLimitResponse({ reset: rl.reset }) as unknown as NextResponse;

  try {
    const session = await auth();
    if (!session?.user) {
      logger.warn('[Enrich API] Unauthorized request');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;

    // Parse and validate request body
    let rawBody: unknown = {};
    try {
      rawBody = await request.json();
    } catch {
      // No body or invalid JSON - use defaults
    }

    const validation = enrichmentPostSchema.safeParse(rawBody);
    if (!validation.success) {
      const firstError = validation.error.issues?.[0];
      return NextResponse.json(
        { error: firstError?.message ?? 'Opciones de enriquecimiento invalidas' },
        { status: 400 }
      );
    }

    return handleEnrichPost({
      clienteId: id,
      userId: session.user.id,
      userName: session.user.name,
      options: validation.data,
    });
  } catch (error) {
    logger.error('[Enrich API] POST request failed', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Error en enriquecimiento' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;

    // Get client with enrichmentStatus and current field values
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      select: {
        enrichmentStatus: true,
        // Current values for comparison in review UI
        sitioWeb: true,
        industria: true,
        notas: true, // Used as description
        direccion: true,
        email: true,
        telefono: true,
        facebook: true,
        instagram: true,
        linkedin: true,
        twitter: true,
        whatsapp: true,
      },
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Get latest enrichment (most recent by enrichedAt)
    const latestEnrichmentRaw = await prisma.clienteEnrichment.findFirst({
      where: { clienteId: id },
      orderBy: { enrichedAt: 'desc' },
    });

    // Get website analysis
    const websiteAnalysis = await prisma.websiteAnalysis.findUnique({
      where: { clienteId: id },
    });

    // Get enrichment history (all records, ordered by enrichedAt desc)
    const allEnrichments = await prisma.clienteEnrichment.findMany({
      where: { clienteId: id },
      orderBy: { enrichedAt: 'desc' },
      select: {
        id: true,
        enrichedAt: true,
        aiProvidersUsed: true,
        fieldStatuses: true,
        status: true,
      },
    });

    // Build history entries
    const history = allEnrichments.map((e) => {
      let providers: string[] = [];
      try {
        providers = e.aiProvidersUsed ? JSON.parse(e.aiProvidersUsed) : [];
      } catch {
        logger.warn('[Enrich API] Failed to parse aiProvidersUsed', { enrichmentId: e.id });
      }
      let statuses: Record<string, FieldReviewStatus> = {};
      try {
        statuses = e.fieldStatuses ? JSON.parse(e.fieldStatuses) : {};
      } catch {
        logger.warn('[Enrich API] Failed to parse fieldStatuses', { enrichmentId: e.id });
      }
      const statusValues = Object.values(statuses);

      return {
        id: e.id,
        type: 'ai' as const,
        enrichedAt: e.enrichedAt,
        providers,
        fieldsFound: statusValues.length,
        fieldsConfirmed: statusValues.filter((s) => s === 'CONFIRMED').length,
        fieldsRejected: statusValues.filter((s) => s === 'REJECTED').length,
        status: e.status,
      };
    });

    // Parse latest enrichment JSON fields (with safe parsing)
    let latestEnrichment = null;
    if (latestEnrichmentRaw) {
      const safeJsonParse = (value: string | null, fieldName: string) => {
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          logger.warn('[Enrich API] Failed to parse JSON field', { fieldName, enrichmentId: latestEnrichmentRaw.id });
          return null;
        }
      };

      latestEnrichment = {
        ...latestEnrichmentRaw,
        emails: safeJsonParse(latestEnrichmentRaw.emails, 'emails'),
        phones: safeJsonParse(latestEnrichmentRaw.phones, 'phones'),
        socialProfiles: safeJsonParse(latestEnrichmentRaw.socialProfiles, 'socialProfiles'),
        aiProvidersUsed: safeJsonParse(latestEnrichmentRaw.aiProvidersUsed, 'aiProvidersUsed'),
        fieldStatuses: safeJsonParse(latestEnrichmentRaw.fieldStatuses, 'fieldStatuses'),
      };
    }

    // Build current client values for comparison in review UI
    const currentClientValues = {
      website: cliente.sitioWeb,
      industry: cliente.industria,
      description: cliente.notas, // notas field is used as description
      address: cliente.direccion,
      email: cliente.email,
      phone: cliente.telefono,
      socialProfiles: {
        facebook: cliente.facebook,
        instagram: cliente.instagram,
        linkedin: cliente.linkedin,
        twitter: cliente.twitter,
        whatsapp: cliente.whatsapp,
      },
    };

    return NextResponse.json({
      latestEnrichment,
      websiteAnalysis,
      history,
      enrichmentStatus: cliente.enrichmentStatus,
      currentClientValues,
    });
  } catch (error) {
    logger.error('[Enrich API] Get enrichment error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Error al obtener enriquecimiento' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    // Validate with Zod
    const validation = enrichmentPatchSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues?.[0];
      return NextResponse.json(
        { error: firstError?.message ?? 'Datos invalidos' },
        { status: 400 }
      );
    }

    const { action, fields, editedValues, enrichmentId } = validation.data;

    // Get enrichment by ID or find latest PENDING for this client
    let enrichment;
    if (enrichmentId) {
      enrichment = await prisma.clienteEnrichment.findUnique({
        where: { id: enrichmentId },
      });
    } else {
      enrichment = await prisma.clienteEnrichment.findFirst({
        where: { clienteId: id, status: 'PENDING' },
        orderBy: { enrichedAt: 'desc' },
      });
    }

    if (!enrichment) {
      return NextResponse.json(
        { error: 'No hay datos de enriquecimiento pendientes para este cliente' },
        { status: 404 }
      );
    }

    if (enrichment.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'El enriquecimiento ya fue procesado' },
        { status: 409 }
      );
    }

    // Initialize fieldStatuses from DB or derive from enrichment data
    const fieldStatuses: Record<string, FieldReviewStatus> = enrichment.fieldStatuses
      ? JSON.parse(enrichment.fieldStatuses)
      : BulkEnrichmentService.buildFieldStatuses(enrichment as unknown as Record<string, unknown>);

    // Filter to only PENDING fields
    const pendingFields = fields.filter((f: string) => fieldStatuses[f] === 'PENDING');
    if (pendingFields.length === 0) {
      return NextResponse.json(
        { error: 'Ninguno de los campos indicados esta pendiente' },
        { status: 409 }
      );
    }

    // Process action
    if (action === 'confirm' || action === 'edit') {
      for (const field of pendingFields) {
        fieldStatuses[field] = 'CONFIRMED';
      }

      // Build update data for Cliente
      const allUpdateData: Record<string, unknown> = {};

      if (action === 'edit' && editedValues) {
        // Use edited values instead of AI-suggested values
        for (const field of pendingFields) {
          if (editedValues[field] !== undefined) {
            const fieldUpdate = BulkEnrichmentService.getFieldUpdateData(
              field as ReviewableField,
              { [field]: editedValues[field] }
            );
            Object.assign(allUpdateData, fieldUpdate);
          }
        }

        // Also update the enrichment record with edited values
        const enrichmentUpdateData: Record<string, unknown> = {};
        for (const field of pendingFields) {
          if (editedValues[field] !== undefined) {
            enrichmentUpdateData[field] = editedValues[field];
          }
        }
        if (Object.keys(enrichmentUpdateData).length > 0) {
          await prisma.clienteEnrichment.update({
            where: { id: enrichment.id },
            data: enrichmentUpdateData,
          });
        }
      } else {
        // Use AI-suggested values
        for (const field of pendingFields) {
          const fieldUpdate = BulkEnrichmentService.getFieldUpdateData(
            field as ReviewableField,
            enrichment as unknown as Record<string, unknown>
          );
          Object.assign(allUpdateData, fieldUpdate);
        }
      }

      if (Object.keys(allUpdateData).length > 0) {
        await prisma.cliente.update({
          where: { id },
          data: allUpdateData,
        });
      }
    } else {
      // Reject
      for (const field of pendingFields) {
        fieldStatuses[field] = 'REJECTED';
      }
    }

    // Check if all fields are now reviewed
    const allReviewed = Object.values(fieldStatuses).every((s) => s !== 'PENDING');

    const updatedEnrichment = await prisma.clienteEnrichment.update({
      where: { id: enrichment.id },
      data: {
        fieldStatuses: JSON.stringify(fieldStatuses),
        ...(allReviewed
          ? { status: 'CONFIRMED', reviewedAt: new Date(), reviewedBy: session.user.id }
          : {}),
      },
    });

    // Update enrichmentStatus on Cliente
    if (allReviewed) {
      await prisma.cliente.update({
        where: { id },
        data: { enrichmentStatus: 'COMPLETE' },
      });
    } else {
      await prisma.cliente.update({
        where: { id },
        data: { enrichmentStatus: 'PARTIAL' },
      });
    }

    // Log activity
    try {
      if (session.user.id) {
        const actionLabel = action === 'edit' ? 'editados' : action === 'confirm' ? 'confirmados' : 'rechazados';
        await prisma.actividad.create({
          data: {
            tipo: 'IA_ENRIQUECIMIENTO',
            descripcion: `Campos IA ${actionLabel}: ${pendingFields.join(', ')}`,
            clienteId: id,
            usuarioId: session.user.id,
          },
        });
      }
    } catch (activityError) {
      logger.warn('[Enrich API] Could not log field review activity', { error: activityError instanceof Error ? activityError.message : String(activityError) });
    }

    return NextResponse.json({
      success: true,
      action,
      fields: pendingFields,
      fieldStatuses,
      allReviewed,
      enrichmentStatus: updatedEnrichment.status,
    });
  } catch (error) {
    logger.error('[Enrich API] Patch enrichment error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Error al procesar la accion' },
      { status: 500 }
    );
  }
}
