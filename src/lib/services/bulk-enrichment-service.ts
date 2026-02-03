/**
 * Bulk Enrichment Service
 * Handles batch enrichment of multiple clients (max 50)
 */

import { prisma } from '@/lib/prisma';
import { ConsensusService } from './consensus-service';
import { WebsiteAnalysisService } from './website-analysis-service';
import { logger } from '@/lib/logger';
import { pMap } from '@/lib/concurrency';
import type { ClientContext } from './enrichment-prompts';
import type { AIProvider, FieldReviewStatus, ReviewableField } from '@/types/enrichment';
import { REVIEWABLE_FIELDS } from '@/types/enrichment';

export interface BulkEnrichmentOptions {
  clienteIds: string[];
  includeAI?: boolean;
  includeWebsiteAnalysis?: boolean;
  provider?: AIProvider;
  userId: string;
}

export interface BulkEnrichmentProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  currentClientId?: string;
  currentClientName?: string;
}

export interface BulkEnrichmentResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    clienteId: string;
    clienteName: string;
    success: boolean;
    aiEnriched?: boolean;
    websiteAnalyzed?: boolean;
    error?: string;
  }>;
}

// Maximum clients per bulk operation
const MAX_BULK_SIZE = 50;

// Maximum concurrent enrichment operations to avoid overwhelming external APIs
const MAX_CONCURRENCY = 3;

// Progress callback type
type ProgressCallback = (progress: BulkEnrichmentProgress) => void;

/**
 * Bulk Enrichment Service
 */
export class BulkEnrichmentService {
  /**
   * Build fieldStatuses JSON from enrichment data.
   * Only includes fields that have non-null values, all set to PENDING.
   * Social profiles are split into individual network fields.
   */
  static buildFieldStatuses(enrichmentData: Record<string, unknown>): Record<string, FieldReviewStatus> {
    const statuses: Record<string, FieldReviewStatus> = {};

    // Basic fields mapping (excludes socialProfiles - handled separately)
    const basicFieldMapping: Record<string, string | string[]> = {
      website: 'website',
      industry: 'industry',
      description: 'description',
      companySize: 'companySize',
      address: 'address',
      emails: 'emails',
      phones: 'phones',
    };

    for (const [field, keys] of Object.entries(basicFieldMapping)) {
      const keyList = Array.isArray(keys) ? keys : [keys];
      const hasData = keyList.some((k) => {
        const val = enrichmentData[k];
        if (val == null) return false;
        if (typeof val === 'string') {
          // Check if it's a JSON array/object string
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) return parsed.length > 0;
            if (typeof parsed === 'object') return Object.keys(parsed).length > 0;
          } catch {
            // Not JSON, treat as regular string
          }
          return val.length > 0;
        }
        return true;
      });

      if (hasData) {
        statuses[field] = 'PENDING';
      }
    }

    // Handle socialProfiles - create individual entries for each network found
    const socialProfilesRaw = enrichmentData.socialProfiles;
    if (socialProfilesRaw) {
      let profiles: Record<string, string> | null = null;

      if (typeof socialProfilesRaw === 'string') {
        try {
          profiles = JSON.parse(socialProfilesRaw);
        } catch {
          profiles = null;
        }
      } else if (typeof socialProfilesRaw === 'object' && socialProfilesRaw !== null) {
        profiles = socialProfilesRaw as Record<string, string>;
      }

      if (profiles) {
        // Create individual status for each social network that has a value
        const networkFieldMap: Record<string, string> = {
          facebook: 'social_facebook',
          instagram: 'social_instagram',
          linkedin: 'social_linkedin',
          twitter: 'social_twitter',
          whatsapp: 'social_whatsapp',
          youtube: 'social_youtube',
          tiktok: 'social_tiktok',
        };

        for (const [network, fieldName] of Object.entries(networkFieldMap)) {
          if (profiles[network] && typeof profiles[network] === 'string' && profiles[network].length > 0) {
            statuses[fieldName] = 'PENDING';
          }
        }
      }
    }

    return statuses;
  }

  /**
   * Apply a single confirmed field to the client record.
   */
  static getFieldUpdateData(
    field: ReviewableField,
    enrichment: Record<string, unknown>
  ): Record<string, unknown> {
    const updateData: Record<string, unknown> = {};

    switch (field) {
      case 'website':
        if (enrichment.website) updateData.sitioWeb = enrichment.website;
        break;
      case 'industry':
        if (enrichment.industry) updateData.industria = enrichment.industry;
        break;
      case 'description':
        if (enrichment.description) updateData.notas = enrichment.description;
        break;
      case 'address':
        if (enrichment.address) updateData.direccion = enrichment.address;
        break;
      case 'socialProfiles':
        if (enrichment.socialProfiles) {
          const profiles =
            typeof enrichment.socialProfiles === 'string'
              ? JSON.parse(enrichment.socialProfiles)
              : enrichment.socialProfiles;
          if (profiles.facebook) updateData.facebook = profiles.facebook;
          if (profiles.instagram) updateData.instagram = profiles.instagram;
          if (profiles.linkedin) updateData.linkedin = profiles.linkedin;
          if (profiles.twitter) updateData.twitter = profiles.twitter;
          if (profiles.whatsapp) updateData.whatsapp = profiles.whatsapp;
        }
        break;
      case 'emails':
        if (enrichment.emails) {
          const emailsArray =
            typeof enrichment.emails === 'string'
              ? JSON.parse(enrichment.emails)
              : enrichment.emails;
          if (Array.isArray(emailsArray) && emailsArray.length > 0) {
            const firstEmail = emailsArray[0];
            const emailValue = firstEmail.value ?? firstEmail.email ?? firstEmail;
            if (typeof emailValue === 'string') updateData.email = emailValue;
          }
        }
        break;
      case 'phones':
        if (enrichment.phones) {
          const phonesArray =
            typeof enrichment.phones === 'string'
              ? JSON.parse(enrichment.phones)
              : enrichment.phones;
          if (Array.isArray(phonesArray) && phonesArray.length > 0) {
            const firstPhone = phonesArray[0];
            const phoneValue = firstPhone.value ?? firstPhone.number ?? firstPhone;
            if (typeof phoneValue === 'string') updateData.telefono = phoneValue;
          }
        }
        break;
      // companySize: no direct client mapping (no field in Cliente model)
      // Individual social network fields
      case 'social_facebook':
      case 'social_instagram':
      case 'social_linkedin':
      case 'social_twitter':
      case 'social_whatsapp':
      case 'social_youtube':
      case 'social_tiktok': {
        // Extract network name from field (e.g., 'social_facebook' -> 'facebook')
        const network = field.replace('social_', '');
        const profiles = enrichment.socialProfiles
          ? typeof enrichment.socialProfiles === 'string'
            ? JSON.parse(enrichment.socialProfiles)
            : enrichment.socialProfiles
          : null;
        if (profiles && profiles[network]) {
          // Map to client field name (facebook, instagram, linkedin, twitter, whatsapp)
          // Note: youtube and tiktok don't have dedicated fields in Cliente model
          if (['facebook', 'instagram', 'linkedin', 'twitter', 'whatsapp'].includes(network)) {
            updateData[network] = profiles[network];
          }
        }
        break;
      }
    }

    return updateData;
  }

  /**
   * Run bulk enrichment on multiple clients
   */
  static async enrichClients(
    options: BulkEnrichmentOptions,
    onProgress?: ProgressCallback
  ): Promise<BulkEnrichmentResult> {
    const { clienteIds, includeAI = true, includeWebsiteAnalysis = true, provider, userId } = options;

    // Validate input
    if (clienteIds.length === 0) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        results: [],
      };
    }

    if (clienteIds.length > MAX_BULK_SIZE) {
      throw new Error(`Maximum ${MAX_BULK_SIZE} clients per bulk operation`);
    }

    // Get clients
    const clientes = await prisma.cliente.findMany({
      where: {
        id: { in: clienteIds },
        deletedAt: null,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        direccion: true,
        ciudad: true,
        industria: true,
        sitioWeb: true,
        notas: true,
      },
    });

    if (clientes.length === 0) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        results: [],
      };
    }

    let successful = 0;
    let failed = 0;
    let completed = 0;

    // Process clients with limited concurrency (max MAX_CONCURRENCY at a time)
    const results = await pMap(clientes, MAX_CONCURRENCY, async (cliente) => {
      // Report progress
      if (onProgress) {
        onProgress({
          total: clientes.length,
          completed,
          successful,
          failed,
          currentClientId: cliente.id,
          currentClientName: cliente.nombre,
        });
      }

      const result: BulkEnrichmentResult['results'][0] = {
        clienteId: cliente.id,
        clienteName: cliente.nombre,
        success: false,
      };

      try {
        // AI Enrichment
        if (includeAI) {
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

          try {
            const enrichResult = await ConsensusService.quickEnrich(clientContext, provider);

            // Save enrichment data
            if (enrichResult.website?.value || enrichResult.description?.value) {
              const enrichData = {
                website: enrichResult.website?.value ?? null,
                websiteScore: enrichResult.website?.score ?? null,
                description: enrichResult.description?.value ?? null,
                descriptionScore: enrichResult.description?.score ?? null,
                industry: enrichResult.industry?.value ?? null,
                industryScore: enrichResult.industry?.score ?? null,
                aiProvidersUsed: enrichResult.providersUsed
                  ? JSON.stringify(enrichResult.providersUsed)
                  : null,
                enrichedAt: new Date(),
                status: 'PENDING',
                reviewedAt: null,
                reviewedBy: null,
              };

              // Build per-field statuses
              const fieldStatuses = BulkEnrichmentService.buildFieldStatuses(enrichData);
              const enrichDataWithFieldStatuses = {
                ...enrichData,
                fieldStatuses: JSON.stringify(fieldStatuses),
              };

              await prisma.clienteEnrichment.create({
                data: {
                  clienteId: cliente.id,
                  ...enrichDataWithFieldStatuses,
                },
              });

              // Update enrichmentStatus and ultimaIA on Cliente
              await prisma.cliente.update({
                where: { id: cliente.id },
                data: { enrichmentStatus: 'PENDING', ultimaIA: new Date() },
              });

              result.aiEnriched = true;
            }
          } catch (aiError) {
            logger.warn('AI enrichment failed for client', {
              clienteId: cliente.id,
              error: aiError instanceof Error ? aiError.message : String(aiError),
            });
          }
        }

        // Website Analysis
        if (includeWebsiteAnalysis && cliente.sitioWeb) {
          try {
            const analysisResult = await WebsiteAnalysisService.quickAnalysis(
              cliente.id,
              cliente.sitioWeb
            );

            if (analysisResult.success) {
              result.websiteAnalyzed = true;
            }
          } catch (analysisError) {
            logger.warn('Website analysis failed for client', {
              clienteId: cliente.id,
              error: analysisError instanceof Error ? analysisError.message : String(analysisError),
            });
          }
        }

        // Mark as successful if at least one enrichment worked
        result.success = result.aiEnriched || result.websiteAnalyzed || false;

        if (result.success) {
          successful++;

          // Log activity (non-critical -- don't fail the enrichment if this errors)
          try {
            await prisma.actividad.create({
              data: {
                tipo: 'IA_ENRIQUECIMIENTO',
                descripcion: `Enriquecimiento en bloque: ${[
                  result.aiEnriched ? 'IA' : null,
                  result.websiteAnalyzed ? 'Website' : null,
                ]
                  .filter(Boolean)
                  .join(', ')}`,
                clienteId: cliente.id,
                usuarioId: userId,
              },
            });
          } catch (activityError) {
            logger.warn('Failed to log enrichment activity', {
              clienteId: cliente.id,
              error: activityError instanceof Error ? activityError.message : String(activityError),
            });
          }
        } else {
          failed++;
          result.error = 'No enrichment data obtained';
        }
      } catch (error) {
        failed++;
        result.error = error instanceof Error ? error.message : 'Unknown error';
        logger.error(
          'Bulk enrichment failed for client',
          error instanceof Error ? error : new Error(result.error),
          { clienteId: cliente.id }
        );
      }

      completed++;
      return result;
    });

    // Final progress update
    if (onProgress) {
      onProgress({
        total: clientes.length,
        completed: clientes.length,
        successful,
        failed,
      });
    }

    logger.info('Bulk enrichment completed', {
      total: clientes.length,
      successful,
      failed,
    });

    return {
      total: clientes.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Get clients that need enrichment
   */
  static async getClientsNeedingEnrichment(limit: number = MAX_BULK_SIZE): Promise<
    Array<{
      id: string;
      nombre: string;
      sitioWeb: string | null;
      hasEnrichment: boolean;
      hasWebsiteAnalysis: boolean;
    }>
  > {
    const clients = await prisma.cliente.findMany({
      where: {
        OR: [
          { enrichmentStatus: 'NONE' },
          { websiteAnalysis: null, sitioWeb: { not: null } },
        ],
      },
      select: {
        id: true,
        nombre: true,
        sitioWeb: true,
        enrichmentStatus: true,
        websiteAnalysis: { select: { id: true } },
      },
      take: limit,
      orderBy: { fechaCreacion: 'desc' },
    });

    return clients.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      sitioWeb: c.sitioWeb,
      hasEnrichment: c.enrichmentStatus !== 'NONE',
      hasWebsiteAnalysis: !!c.websiteAnalysis,
    }));
  }

  /**
   * Get bulk enrichment statistics
   */
  static async getEnrichmentStats(): Promise<{
    totalClients: number;
    enrichedClients: number;
    analyzedWebsites: number;
    pendingEnrichment: number;
    pendingAnalysis: number;
    confirmedClients: number;
    pendingConfirmation: number;
  }> {
    const [
      totalClients,
      enrichedClients,
      analyzedWebsites,
      clientsWithWebsite,
      confirmedClients,
      pendingConfirmationCount,
    ] = await Promise.all([
      prisma.cliente.count(),
      prisma.cliente.count({ where: { enrichmentStatus: { not: 'NONE' } } }),
      prisma.websiteAnalysis.count(),
      prisma.cliente.count({ where: { sitioWeb: { not: null } } }),
      prisma.cliente.count({ where: { enrichmentStatus: 'COMPLETE' } }),
      prisma.cliente.count({ where: { enrichmentStatus: { in: ['PENDING', 'PARTIAL'] } } }),
    ]);

    return {
      totalClients,
      enrichedClients,
      analyzedWebsites,
      pendingEnrichment: totalClients - enrichedClients,
      pendingAnalysis: clientsWithWebsite - analyzedWebsites,
      confirmedClients,
      pendingConfirmation: pendingConfirmationCount,
    };
  }

  /**
   * Get clients with pending enrichment confirmation
   */
  static async getClientesPendingConfirmation(): Promise<
    Array<{
      id: string;
      clienteId: string;
      clienteName: string;
      website: string | null;
      industry: string | null;
      description: string | null;
      companySize: string | null;
      address: string | null;
      emails: Array<{ email: string; type?: string }> | null;
      phones: Array<{ number: string; type?: string }> | null;
      socialProfiles: Record<string, string> | null;
      websiteScore: number | null;
      industryScore: number | null;
      descriptionScore: number | null;
      companySizeScore: number | null;
      addressScore: number | null;
      aiProvidersUsed: string[] | null;
      enrichedAt: Date | null;
      currentWebsite: string | null;
      currentIndustry: string | null;
      currentDescription: string | null;
      fieldStatuses: Record<string, FieldReviewStatus> | null;
    }>
  > {
    // Get latest PENDING enrichment per client using distinct
    const enrichments = await prisma.clienteEnrichment.findMany({
      where: { status: 'PENDING' },
      include: {
        cliente: { select: { nombre: true, sitioWeb: true, industria: true, notas: true } },
      },
      orderBy: { enrichedAt: 'desc' },
      distinct: ['clienteId'],
    });

    const parseJson = <T>(val: string | null | undefined): T | null => {
      if (!val) return null;
      try {
        return JSON.parse(val) as T;
      } catch {
        return null;
      }
    };

    return enrichments.map((e) => ({
      id: e.id,
      clienteId: e.clienteId,
      clienteName: e.cliente.nombre,
      website: e.website,
      industry: e.industry,
      description: e.description,
      companySize: e.companySize,
      address: e.address,
      emails: parseJson<Array<{ email: string; type?: string }>>(e.emails),
      phones: parseJson<Array<{ number: string; type?: string }>>(e.phones),
      socialProfiles: parseJson<Record<string, string>>(e.socialProfiles),
      websiteScore: e.websiteScore,
      industryScore: e.industryScore,
      descriptionScore: e.descriptionScore,
      companySizeScore: e.companySizeScore,
      addressScore: e.addressScore,
      aiProvidersUsed: parseJson<string[]>(e.aiProvidersUsed),
      enrichedAt: e.enrichedAt,
      currentWebsite: e.cliente.sitioWeb,
      currentIndustry: e.cliente.industria,
      currentDescription: e.cliente.notas,
      fieldStatuses: e.fieldStatuses ? JSON.parse(e.fieldStatuses) : null,
    }));
  }

  /**
   * Confirm specific fields for a batch of clients — apply data to clients
   */
  static async confirmFields(
    items: Array<{ clienteId: string; fields: string[] }>,
    userId: string
  ): Promise<{ confirmed: number; errors: string[] }> {
    let confirmed = 0;
    const errors: string[] = [];

    for (const { clienteId, fields } of items) {
      try {
        // Find the latest PENDING enrichment for this client
        const enrichment = await prisma.clienteEnrichment.findFirst({
          where: { clienteId, status: 'PENDING' },
          orderBy: { enrichedAt: 'desc' },
        });

        if (!enrichment || enrichment.status !== 'PENDING') {
          errors.push(`${clienteId}: no tiene enriquecimiento pendiente`);
          continue;
        }

        const fieldStatuses: Record<string, FieldReviewStatus> = enrichment.fieldStatuses
          ? JSON.parse(enrichment.fieldStatuses)
          : BulkEnrichmentService.buildFieldStatuses(enrichment as unknown as Record<string, unknown>);

        // Validate fields
        const validFields = fields.filter(
          (f) => REVIEWABLE_FIELDS.includes(f as ReviewableField) && fieldStatuses[f] === 'PENDING'
        );

        if (validFields.length === 0) {
          errors.push(`${clienteId}: no hay campos validos pendientes para confirmar`);
          continue;
        }

        // Mark fields as CONFIRMED
        for (const field of validFields) {
          fieldStatuses[field] = 'CONFIRMED';
        }

        // Apply confirmed fields to the client
        const allUpdateData: Record<string, unknown> = {};
        for (const field of validFields) {
          const fieldUpdate = BulkEnrichmentService.getFieldUpdateData(
            field as ReviewableField,
            enrichment as unknown as Record<string, unknown>
          );
          Object.assign(allUpdateData, fieldUpdate);
        }

        if (Object.keys(allUpdateData).length > 0) {
          await prisma.cliente.update({
            where: { id: clienteId },
            data: allUpdateData,
          });
        }

        // Check if all fields are reviewed (none PENDING)
        const allReviewed = Object.values(fieldStatuses).every((s) => s !== 'PENDING');

        await prisma.clienteEnrichment.update({
          where: { id: enrichment.id },
          data: {
            fieldStatuses: JSON.stringify(fieldStatuses),
            ...(allReviewed
              ? { status: 'CONFIRMED', reviewedAt: new Date(), reviewedBy: userId }
              : {}),
          },
        });

        // Update enrichmentStatus on Cliente
        if (allReviewed) {
          await prisma.cliente.update({
            where: { id: clienteId },
            data: { enrichmentStatus: 'COMPLETE' },
          });
        } else {
          await prisma.cliente.update({
            where: { id: clienteId },
            data: { enrichmentStatus: 'PARTIAL' },
          });
        }

        // Log activity
        try {
          await prisma.actividad.create({
            data: {
              tipo: 'IA_ENRIQUECIMIENTO',
              descripcion: `Campos IA confirmados: ${validFields.join(', ')}`,
              clienteId,
              usuarioId: userId,
            },
          });
        } catch (activityError) {
          logger.warn('Failed to log confirm activity', {
            clienteId,
            error: activityError instanceof Error ? activityError.message : String(activityError),
          });
        }

        confirmed += validFields.length;
      } catch (error) {
        errors.push(
          `${clienteId}: ${error instanceof Error ? error.message : 'Error desconocido'}`
        );
      }
    }

    return { confirmed, errors };
  }

  /**
   * Reject specific fields for a batch of clients
   */
  static async rejectFields(
    items: Array<{ clienteId: string; fields: string[] }>,
    userId: string
  ): Promise<{ rejected: number; errors: string[] }> {
    let rejected = 0;
    const errors: string[] = [];

    for (const { clienteId, fields } of items) {
      try {
        // Find the latest PENDING enrichment for this client
        const enrichment = await prisma.clienteEnrichment.findFirst({
          where: { clienteId, status: 'PENDING' },
          orderBy: { enrichedAt: 'desc' },
        });

        if (!enrichment) {
          errors.push(`${clienteId}: no tiene enriquecimiento pendiente`);
          continue;
        }

        const fieldStatuses: Record<string, FieldReviewStatus> = enrichment.fieldStatuses
          ? JSON.parse(enrichment.fieldStatuses)
          : BulkEnrichmentService.buildFieldStatuses(enrichment as unknown as Record<string, unknown>);

        // Validate fields
        const validFields = fields.filter(
          (f) => REVIEWABLE_FIELDS.includes(f as ReviewableField) && fieldStatuses[f] === 'PENDING'
        );

        if (validFields.length === 0) {
          errors.push(`${clienteId}: no hay campos validos pendientes para rechazar`);
          continue;
        }

        // Mark fields as REJECTED
        for (const field of validFields) {
          fieldStatuses[field] = 'REJECTED';
        }

        // Check if all fields are reviewed (none PENDING)
        const allReviewed = Object.values(fieldStatuses).every((s) => s !== 'PENDING');

        await prisma.clienteEnrichment.update({
          where: { id: enrichment.id },
          data: {
            fieldStatuses: JSON.stringify(fieldStatuses),
            ...(allReviewed
              ? { status: 'CONFIRMED', reviewedAt: new Date(), reviewedBy: userId }
              : {}),
          },
        });

        // Update enrichmentStatus on Cliente
        if (allReviewed) {
          await prisma.cliente.update({
            where: { id: clienteId },
            data: { enrichmentStatus: 'COMPLETE' },
          });
        }

        // Log activity
        try {
          await prisma.actividad.create({
            data: {
              tipo: 'IA_ENRIQUECIMIENTO',
              descripcion: `Campos IA rechazados: ${validFields.join(', ')}`,
              clienteId,
              usuarioId: userId,
            },
          });
        } catch (activityError) {
          logger.warn('Failed to log reject activity', {
            clienteId,
            error: activityError instanceof Error ? activityError.message : String(activityError),
          });
        }

        rejected += validFields.length;
      } catch (error) {
        errors.push(
          `${clienteId}: ${error instanceof Error ? error.message : 'Error desconocido'}`
        );
      }
    }

    return { rejected, errors };
  }
}
