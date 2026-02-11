/**
 * POST handler logic for client enrichment.
 * Handles AI enrichment and website analysis modes.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ConsensusService } from '@/lib/services/consensus-service';
import type { EnrichmentResult } from '@/lib/services/consensus-service';
import { UrlVerificationService } from '@/lib/services/url-verification-service';
import { SocialUrlValidatorService } from '@/lib/services/social-url-validator-service';
import { EnrichmentPostProcessor } from '@/lib/services/enrichment-post-processor';
import { BulkEnrichmentService } from '@/lib/services/bulk-enrichment-service';
import { WebsiteAnalysisService } from '@/lib/services/website-analysis-service';
import { withTimeout } from '@/lib/timeout';
import { TIMEOUTS } from '@/lib/constants';
import type { ClientContext } from '@/lib/services/enrichment-prompts';
import type { EnrichmentMode } from '@/types/enrichment';
import { ENRICHMENT } from '@/lib/constants';

interface EnrichPostParams {
  readonly clienteId: string;
  readonly userId: string;
  readonly userName?: string | null;
  readonly options: {
    readonly mode?: string;
    readonly quick?: boolean;
    readonly fields?: string[];
    readonly useExternalApis?: boolean;
    readonly verifyEmails?: boolean;
    readonly searchGoogleMaps?: boolean;
    readonly confidenceThreshold?: number;
    readonly provider?: string;
  };
}

/** Execute the enrichment POST logic after auth and validation. */
export async function handleEnrichPost({ clienteId, userId, userName, options }: EnrichPostParams): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    logger.info('[Enrich API] Starting enrichment request', {
      clienteId,
      userId,
      userName,
    });

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
    });

    if (!cliente) {
      logger.warn('[Enrich API] Client not found', { clienteId });
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Check for already in-progress enrichment
    if (cliente.enrichmentStatus === 'PENDING') {
      const inProgressEnrichment = await prisma.clienteEnrichment.findFirst({
        where: {
          clienteId,
          status: 'PENDING',
          enrichedAt: { gte: new Date(Date.now() - ENRICHMENT.IN_PROGRESS_WINDOW_MS) },
        },
        orderBy: { enrichedAt: 'desc' },
        select: { id: true, enrichedAt: true },
      });

      if (inProgressEnrichment) {
        logger.warn('[Enrich API] Enrichment already in progress', {
          clienteId,
          enrichmentId: inProgressEnrichment.id,
          enrichedAt: inProgressEnrichment.enrichedAt,
        });
        return NextResponse.json(
          { error: 'Ya hay un enriquecimiento en progreso para este cliente' },
          { status: 409 }
        );
      }
    }

    const mode: EnrichmentMode = (options.mode === 'full' ? 'ai' : options.mode as EnrichmentMode) || 'ai';

    logger.info('[Enrich API] Enrichment options', {
      clienteId,
      mode,
      quick: options.quick || false,
      fields: options.fields || 'all',
      useExternalApis: options.useExternalApis || false,
    });

    // Check cooldown
    const latestEnrichment = await prisma.clienteEnrichment.findFirst({
      where: { clienteId },
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

    if (mode === 'ai') {
      return handleAIEnrichment({ cliente, clienteId, userId, options, cooldownWarning, hoursAgo });
    }

    if (mode === 'web') {
      return handleWebEnrichment({ cliente, clienteId, userId, cooldownWarning, hoursAgo });
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleAIEnrichment({ cliente, clienteId, userId, options, cooldownWarning, hoursAgo }: { cliente: any; clienteId: string; userId: string; options: EnrichPostParams['options']; cooldownWarning: boolean; hoursAgo: number | null }): Promise<NextResponse> {
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

  let result: EnrichmentResult | Partial<EnrichmentResult>;

  if (options.quick) {
    result = await withTimeout({
      promise: ConsensusService.quickEnrich(clientContext),
      timeoutMs: TIMEOUTS.AI_OPERATION_MS,
      operation: 'quickEnrich',
    });
  } else {
    result = await withTimeout({
      promise: ConsensusService.enrichClient(clientContext, options.fields),
      timeoutMs: TIMEOUTS.AI_OPERATION_MS,
      operation: 'enrichClient',
    });
  }

  // Verify website URL
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

  // Validate social profile URLs
  if (result.socialProfiles?.value && typeof result.socialProfiles.value === 'object') {
    const socialValidation = await SocialUrlValidatorService.validateSocialUrls(
      result.socialProfiles.value as Record<string, string>
    );

    if (Object.keys(socialValidation.validatedProfiles).length > 0) {
      result.socialProfiles = {
        ...result.socialProfiles,
        value: socialValidation.validatedProfiles,
      };
    } else {
      result.socialProfiles = undefined;
    }

    logger.info('[Enrich API] Social profiles validation complete', {
      clienteId,
      totalUrls: socialValidation.totalCount,
      accessibleUrls: socialValidation.accessibleCount,
      removedUrls: socialValidation.totalCount - socialValidation.accessibleCount,
    });
  }

  // Validate individual social fields
  const socialFields = [
    'social_facebook', 'social_instagram', 'social_linkedin',
    'social_twitter', 'social_whatsapp', 'social_youtube', 'social_tiktok',
  ] as const;

  const fieldsToValidate: Record<string, { value?: string | null }> = {};
  for (const fieldName of socialFields) {
    const field = result[fieldName as keyof typeof result] as { value?: string | null } | undefined;
    if (field?.value) {
      fieldsToValidate[fieldName] = field;
    }
  }

  if (Object.keys(fieldsToValidate).length > 0) {
    const individualValidation = await SocialUrlValidatorService.validateIndividualSocialFields(
      fieldsToValidate
    );

    for (const fieldName of socialFields) {
      const validatedUrl = individualValidation[fieldName];
      if (validatedUrl === null) {
        (result as Record<string, unknown>)[fieldName] = undefined;
      } else if (validatedUrl) {
        const existingField = result[fieldName as keyof typeof result] as { value?: string; score?: number } | undefined;
        if (existingField) {
          (result as Record<string, unknown>)[fieldName] = {
            ...existingField,
            value: validatedUrl,
          };
        }
      }
    }
  }

  // Post-process with external APIs
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

  // Save enrichment results
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

  const [savedEnrichment] = await prisma.$transaction([
    prisma.clienteEnrichment.create({
      data: {
        clienteId,
        ...enrichmentDataWithFieldStatuses,
      },
    }),
    prisma.cliente.update({
      where: { id: clienteId },
      data: { enrichmentStatus: 'PENDING', ultimaIA: new Date() },
    }),
  ]);

  // Log activity
  const externalApisInfo = externalDataUsed.length > 0
    ? ` | APIs externas: ${externalDataUsed.join(', ')}`
    : '';

  if (userId) {
    try {
      const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (userExists) {
        await prisma.actividad.create({
          data: {
            tipo: 'IA_ENRIQUECIMIENTO',
            descripcion: `Enriquecimiento IA completado. Providers: ${result.providersUsed?.join(', ') || 'ninguno'}${externalApisInfo}`,
            clienteId,
            usuarioId: userId,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleWebEnrichment({ cliente, clienteId, userId, cooldownWarning, hoursAgo }: { cliente: any; clienteId: string; userId: string; cooldownWarning: boolean; hoursAgo: number | null }): Promise<NextResponse> {
  if (!cliente.sitioWeb) {
    return NextResponse.json(
      { error: 'El cliente no tiene sitio web configurado' },
      { status: 400 }
    );
  }

  const analysisResult = await WebsiteAnalysisService.analyzeWebsite({
    clienteId,
    url: cliente.sitioWeb,
  });

  if (userId) {
    try {
      await prisma.actividad.create({
        data: {
          tipo: 'IA_ENRIQUECIMIENTO',
          descripcion: `Analisis web completado para ${cliente.sitioWeb}`,
          clienteId,
          usuarioId: userId,
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
