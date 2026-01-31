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
import { ConsensusService, type EnrichmentResult } from '@/lib/services/consensus-service';
import { UrlVerificationService } from '@/lib/services/url-verification-service';
import { EnrichmentPostProcessor } from '@/lib/services/enrichment-post-processor';
import { BulkEnrichmentService } from '@/lib/services/bulk-enrichment-service';
import { WebsiteAnalysisService } from '@/lib/services/website-analysis-service';
import { REVIEWABLE_FIELDS } from '@/types/enrichment';
import type { ClientContext } from '@/lib/services/enrichment-prompts';
import type { EnrichmentMode, FieldReviewStatus, ReviewableField } from '@/types/enrichment';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Cooldown threshold in hours (default 24h)
const COOLDOWN_HOURS = 24;

export async function POST(request: NextRequest, context: RouteContext) {
  const startTime = Date.now();

  try {
    const session = await auth();

    if (!session?.user) {
      logger.warn('[Enrich API] Unauthorized request');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;

    logger.info('[Enrich API] Starting enrichment request', {
      clienteId: id,
      userId: session.user.id,
      userName: session.user.name,
    });

    // Get client
    const cliente = await prisma.cliente.findUnique({
      where: { id },
    });

    if (!cliente) {
      logger.warn('[Enrich API] Client not found', { clienteId: id });
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Get request body for options
    let options: {
      mode?: EnrichmentMode;
      fields?: string[];
      quick?: boolean;
      provider?: string;
      useExternalApis?: boolean;
      verifyEmails?: boolean;
      searchGoogleMaps?: boolean;
      confidenceThreshold?: number;
    } = {};
    try {
      options = await request.json();
    } catch {
      // No body or invalid JSON - use defaults
    }

    const mode: EnrichmentMode = options.mode || 'ai';

    logger.info('[Enrich API] Enrichment options', {
      clienteId: id,
      mode,
      quick: options.quick || false,
      fields: options.fields || 'all',
      useExternalApis: options.useExternalApis || false,
    });

    // Check cooldown - find latest enrichment for this client
    const latestEnrichment = await prisma.clienteEnrichment.findFirst({
      where: { clienteId: id },
      orderBy: { enrichedAt: 'desc' },
      select: { enrichedAt: true },
    });

    let cooldownWarning = false;
    let hoursAgo: number | null = null;
    if (latestEnrichment?.enrichedAt) {
      hoursAgo = (Date.now() - latestEnrichment.enrichedAt.getTime()) / (1000 * 60 * 60);
      if (hoursAgo < COOLDOWN_HOURS) {
        cooldownWarning = true;
      }
    }

    // Handle AI enrichment mode
    if (mode === 'ai') {
      const clientContext: ClientContext = {
        nombre: cliente.nombre,
        email: cliente.email,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
        ciudad: cliente.ciudad,
        industria: cliente.industria,
        sitioWeb: cliente.sitioWeb,
        notas: cliente.notas,
      };

      // Run enrichment
      let result: EnrichmentResult | Partial<EnrichmentResult>;

      if (options.quick) {
        result = await ConsensusService.quickEnrich(clientContext);
      } else {
        result = await ConsensusService.enrichClient(clientContext, options.fields);
      }

      // If we found a website, verify it
      if (result.website?.value) {
        const verification = await UrlVerificationService.verifyUrl(
          result.website.value,
          cliente.nombre
        );

        if (verification.isAccessible) {
          result.website = {
            ...result.website,
            value: verification.url,
            score: Math.min(
              (result.website.score + (verification.confidence ?? 0.5)) / 2 * 1.1,
              1.0
            ),
          };
        }
      }

      // Post-process with external APIs if requested
      let externalDataUsed: string[] = [];
      let externalErrors: string[] = [];

      if (options.useExternalApis) {
        const postProcessResult = await EnrichmentPostProcessor.process(
          result as EnrichmentResult,
          {
            companyName: cliente.nombre,
            location: cliente.ciudad || cliente.provincia || undefined,
            verifyEmails: options.verifyEmails,
            searchGoogleMaps: options.searchGoogleMaps,
          }
        );

        result = postProcessResult.enhancedResult;
        externalDataUsed = postProcessResult.externalDataUsed;
        externalErrors = postProcessResult.errors;
      }

      // Save enrichment results as NEW record (1:N history)
      const enrichmentData = {
        website: result.website?.value ?? null,
        websiteScore: result.website?.score ?? null,
        emails: result.emails?.value ? JSON.stringify(result.emails.value) : null,
        phones: result.phones?.value ? JSON.stringify(result.phones.value) : null,
        address: result.address?.value ?? null,
        addressScore: result.address?.score ?? null,
        description: result.description?.value ?? null,
        descriptionScore: result.description?.score ?? null,
        industry: result.industry?.value ?? null,
        industryScore: result.industry?.score ?? null,
        companySize: result.companySize?.value ?? null,
        companySizeScore: result.companySize?.score ?? null,
        socialProfiles: result.socialProfiles?.value
          ? JSON.stringify(result.socialProfiles.value)
          : null,
        aiProvidersUsed: result.providersUsed
          ? JSON.stringify(result.providersUsed)
          : null,
        enrichedAt: new Date(),
        status: 'PENDING',
        reviewedAt: null,
        reviewedBy: null,
      };

      const fieldStatuses = BulkEnrichmentService.buildFieldStatuses(enrichmentData);
      const enrichmentDataWithFieldStatuses = {
        ...enrichmentData,
        fieldStatuses: JSON.stringify(fieldStatuses),
      };

      // Create new record (not upsert)
      const savedEnrichment = await prisma.clienteEnrichment.create({
        data: {
          clienteId: id,
          ...enrichmentDataWithFieldStatuses,
        },
      });

      // Update enrichmentStatus on Cliente
      await prisma.cliente.update({
        where: { id },
        data: { enrichmentStatus: 'PENDING' },
      });

      // Log activity
      const externalApisInfo = externalDataUsed.length > 0
        ? ` | APIs externas: ${externalDataUsed.join(', ')}`
        : '';

      if (session.user.id) {
        try {
          const userExists = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true },
          });

          if (userExists) {
            await prisma.actividad.create({
              data: {
                tipo: 'IA_ENRIQUECIMIENTO',
                descripcion: `Enriquecimiento IA completado. Providers: ${result.providersUsed?.join(', ') || 'ninguno'}${externalApisInfo}`,
                clienteId: id,
                usuarioId: session.user.id,
              },
            });
          }
        } catch (activityError) {
          console.warn('Could not log activity:', activityError);
        }
      }

      const elapsed = Date.now() - startTime;
      const allErrors = [...((result as EnrichmentResult).errors || []), ...externalErrors.map(e => ({ provider: 'external' as const, error: e }))];

      return NextResponse.json({
        success: true,
        enrichment: savedEnrichment,
        result,
        externalDataUsed,
        errors: allErrors,
        cooldownWarning,
        hoursAgo: hoursAgo !== null ? Math.round(hoursAgo * 10) / 10 : null,
      });
    }

    // Handle Web analysis mode
    if (mode === 'web') {
      if (!cliente.sitioWeb) {
        return NextResponse.json(
          { error: 'El cliente no tiene sitio web configurado' },
          { status: 400 }
        );
      }

      const analysisResult = await WebsiteAnalysisService.quickAnalysis(
        id,
        cliente.sitioWeb
      );

      const elapsed = Date.now() - startTime;

      // Log activity
      if (session.user.id) {
        try {
          await prisma.actividad.create({
            data: {
              tipo: 'IA_ENRIQUECIMIENTO',
              descripcion: `Analisis web completado para ${cliente.sitioWeb}`,
              clienteId: id,
              usuarioId: session.user.id,
            },
          });
        } catch {
          // Non-critical
        }
      }

      return NextResponse.json({
        success: true,
        websiteAnalysis: analysisResult,
        cooldownWarning,
        hoursAgo: hoursAgo !== null ? Math.round(hoursAgo * 10) / 10 : null,
      });
    }

    return NextResponse.json(
      { error: 'Modo invalido. Usar "ai" o "web"' },
      { status: 400 }
    );
  } catch (error) {
    const elapsed = Date.now() - startTime;
    logger.error('[Enrich API] Request failed', error instanceof Error ? error : new Error(String(error)), {
      elapsed,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error en enriquecimiento' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;

    // Get client with enrichmentStatus
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      select: { enrichmentStatus: true },
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
      const providers = e.aiProvidersUsed ? JSON.parse(e.aiProvidersUsed) : [];
      const statuses: Record<string, FieldReviewStatus> = e.fieldStatuses
        ? JSON.parse(e.fieldStatuses)
        : {};
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

    // Parse latest enrichment JSON fields
    let latestEnrichment = null;
    if (latestEnrichmentRaw) {
      latestEnrichment = {
        ...latestEnrichmentRaw,
        emails: latestEnrichmentRaw.emails ? JSON.parse(latestEnrichmentRaw.emails) : null,
        phones: latestEnrichmentRaw.phones ? JSON.parse(latestEnrichmentRaw.phones) : null,
        socialProfiles: latestEnrichmentRaw.socialProfiles
          ? JSON.parse(latestEnrichmentRaw.socialProfiles)
          : null,
        aiProvidersUsed: latestEnrichmentRaw.aiProvidersUsed
          ? JSON.parse(latestEnrichmentRaw.aiProvidersUsed)
          : null,
        fieldStatuses: latestEnrichmentRaw.fieldStatuses
          ? JSON.parse(latestEnrichmentRaw.fieldStatuses)
          : null,
      };
    }

    return NextResponse.json({
      latestEnrichment,
      websiteAnalysis,
      history,
      enrichmentStatus: cliente.enrichmentStatus,
    });
  } catch (error) {
    console.error('Get enrichment error:', error);
    return NextResponse.json(
      { error: 'Error al obtener enriquecimiento' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { action, fields, editedValues, enrichmentId } = body;

    if (!action || !['confirm', 'reject', 'edit'].includes(action)) {
      return NextResponse.json(
        { error: 'Accion invalida. Usar "confirm", "reject" o "edit"' },
        { status: 400 }
      );
    }

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere una lista de campos (fields)' },
        { status: 400 }
      );
    }

    // Validate edited values for edit action
    if (action === 'edit' && (!editedValues || typeof editedValues !== 'object')) {
      return NextResponse.json(
        { error: 'Se requiere editedValues para la accion "edit"' },
        { status: 400 }
      );
    }

    // Validate field names
    const invalidFields = fields.filter((f: string) => !REVIEWABLE_FIELDS.includes(f as ReviewableField));
    if (invalidFields.length > 0) {
      return NextResponse.json(
        { error: `Campos invalidos: ${invalidFields.join(', ')}` },
        { status: 400 }
      );
    }

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

      if (action === 'edit') {
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
      console.warn('Could not log field review activity:', activityError);
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
    console.error('Patch enrichment error:', error);
    return NextResponse.json(
      { error: 'Error al procesar la accion' },
      { status: 500 }
    );
  }
}
