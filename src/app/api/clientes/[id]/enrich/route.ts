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

import type { ClientContext } from '@/lib/services/enrichment-prompts';
import type { EnrichmentMode, FieldReviewStatus, ReviewableField } from '@/types/enrichment';
import { enrichmentPostSchema, enrichmentPatchSchema } from '@/lib/validations/enrichment';
import { ENRICHMENT } from '@/lib/constants';

interface RouteContext {
  params: Promise<{ id: string }>;
}

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

    // Check for already in-progress enrichment to prevent race conditions
    if (cliente.enrichmentStatus === 'PENDING') {
      const inProgressEnrichment = await prisma.clienteEnrichment.findFirst({
        where: {
          clienteId: id,
          status: 'PENDING',
          // Consider enrichments started within the last 10 minutes as in-progress
          enrichedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
        },
        orderBy: { enrichedAt: 'desc' },
        select: { id: true, enrichedAt: true },
      });

      if (inProgressEnrichment) {
        logger.warn('[Enrich API] Enrichment already in progress', {
          clienteId: id,
          enrichmentId: inProgressEnrichment.id,
          enrichedAt: inProgressEnrichment.enrichedAt,
        });
        return NextResponse.json(
          { error: 'Ya hay un enriquecimiento en progreso para este cliente' },
          { status: 409 }
        );
      }
    }

    // Get request body for options (validated with Zod)
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

    const options = validation.data;
    const mode: EnrichmentMode = (options.mode === 'full' ? 'ai' : options.mode) || 'ai';

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
      if (hoursAgo < ENRICHMENT.COOLDOWN_HOURS) {
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

      // Update enrichmentStatus and ultimaIA on Cliente
      await prisma.cliente.update({
        where: { id },
        data: { enrichmentStatus: 'PENDING', ultimaIA: new Date() },
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
          logger.warn('[Enrich API] Could not log activity', { error: activityError instanceof Error ? activityError.message : String(activityError) });
        }
      }

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
      { error: 'Error en enriquecimiento' },
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

    return NextResponse.json({
      latestEnrichment,
      websiteAnalysis,
      history,
      enrichmentStatus: cliente.enrichmentStatus,
    });
  } catch (error) {
    logger.error('[Enrich API] Get enrichment error', error instanceof Error ? error : new Error(String(error)));
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
