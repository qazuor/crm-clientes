/**
 * Client Enrichment API Endpoint
 * POST /api/clientes/[id]/enrich
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ConsensusService, type EnrichmentResult } from '@/lib/services/consensus-service';
import { UrlVerificationService } from '@/lib/services/url-verification-service';
import { EnrichmentPostProcessor } from '@/lib/services/enrichment-post-processor';
import type { ClientContext } from '@/lib/services/enrichment-prompts';

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
      include: {
        enrichment: true,
      },
    });

    if (!cliente) {
      logger.warn('[Enrich API] Client not found', { clienteId: id });
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    logger.debug('[Enrich API] Client data loaded', {
      clienteId: id,
      nombre: cliente.nombre,
      hasExistingEnrichment: !!cliente.enrichment,
      lastEnrichment: cliente.enrichment?.enrichedAt,
    });

    // Get request body for options
    let options: {
      fields?: string[];
      quick?: boolean;
      useExternalApis?: boolean;
      verifyEmails?: boolean;
      searchGoogleMaps?: boolean;
    } = {};
    try {
      options = await request.json();
    } catch {
      // No body or invalid JSON - use defaults
    }

    logger.info('[Enrich API] Enrichment options', {
      clienteId: id,
      quick: options.quick || false,
      fields: options.fields || 'all',
      useExternalApis: options.useExternalApis || false,
      verifyEmails: options.verifyEmails || false,
      searchGoogleMaps: options.searchGoogleMaps || false,
    });

    // Build client context for enrichment
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

    logger.debug('[Enrich API] Client context for AI', {
      nombre: clientContext.nombre,
      hasEmail: !!clientContext.email,
      hasTelefono: !!clientContext.telefono,
      hasDireccion: !!clientContext.direccion,
      ciudad: clientContext.ciudad,
      industria: clientContext.industria,
      hasSitioWeb: !!clientContext.sitioWeb,
      hasNotas: !!clientContext.notas,
    });

    // Run enrichment
    let result: EnrichmentResult | Partial<EnrichmentResult>;

    logger.info('[Enrich API] Calling AI enrichment', {
      clienteId: id,
      mode: options.quick ? 'quick' : 'full',
    });

    if (options.quick) {
      result = await ConsensusService.quickEnrich(clientContext);
    } else {
      result = await ConsensusService.enrichClient(clientContext, options.fields);
    }

    logger.info('[Enrich API] AI enrichment completed', {
      clienteId: id,
      providersUsed: result.providersUsed,
      errorCount: (result as EnrichmentResult).errors?.length || 0,
    });

    // If we found a website, verify it
    if (result.website?.value) {
      const verification = await UrlVerificationService.verifyUrl(
        result.website.value,
        cliente.nombre
      );

      // Update website result with verification data
      if (verification.isAccessible) {
        result.website = {
          ...result.website,
          value: verification.url, // Use potentially corrected URL
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

    // Save enrichment results to database
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
    };

    // Upsert enrichment record
    const savedEnrichment = await prisma.clienteEnrichment.upsert({
      where: { clienteId: id },
      create: {
        clienteId: id,
        ...enrichmentData,
      },
      update: enrichmentData,
    });

    // Also update the main client record with key fields
    const updateData: Record<string, unknown> = {};

    if (result.website?.value && !cliente.sitioWeb) {
      updateData.sitioWeb = result.website.value;
    }
    if (result.industry?.value && !cliente.industria) {
      updateData.industria = result.industry.value;
    }
    if (result.description?.value && !cliente.notas) {
      updateData.notas = result.description.value;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.cliente.update({
        where: { id },
        data: updateData,
      });
    }

    // Log the enrichment activity (only if user exists in DB)
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
        // Log error but don't fail the request - enrichment was successful
        console.warn('Could not log activity:', activityError);
      }
    }

    const elapsed = Date.now() - startTime;
    const allErrors = [...((result as EnrichmentResult).errors || []), ...externalErrors.map(e => ({ provider: 'external' as const, error: e }))];

    logger.info('[Enrich API] Request completed successfully', {
      clienteId: id,
      elapsed,
      providersUsed: result.providersUsed,
      externalDataUsed,
      errorCount: allErrors.length,
      savedEnrichmentId: savedEnrichment.id,
    });

    return NextResponse.json({
      success: true,
      enrichment: savedEnrichment,
      result,
      externalDataUsed,
      errors: allErrors,
    });
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

    // Get enrichment data
    const enrichment = await prisma.clienteEnrichment.findUnique({
      where: { clienteId: id },
    });

    if (!enrichment) {
      return NextResponse.json({ enrichment: null });
    }

    // Parse JSON fields
    const parsed = {
      ...enrichment,
      emails: enrichment.emails ? JSON.parse(enrichment.emails) : null,
      phones: enrichment.phones ? JSON.parse(enrichment.phones) : null,
      socialProfiles: enrichment.socialProfiles
        ? JSON.parse(enrichment.socialProfiles)
        : null,
      aiProvidersUsed: enrichment.aiProvidersUsed
        ? JSON.parse(enrichment.aiProvidersUsed)
        : null,
    };

    return NextResponse.json({ enrichment: parsed });
  } catch (error) {
    console.error('Get enrichment error:', error);
    return NextResponse.json(
      { error: 'Error al obtener enriquecimiento' },
      { status: 500 }
    );
  }
}
