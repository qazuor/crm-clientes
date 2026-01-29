/**
 * Bulk Enrichment Service
 * Handles batch enrichment of multiple clients (max 50)
 */

import { prisma } from '@/lib/prisma';
import { ConsensusService } from './consensus-service';
import { WebsiteAnalysisService } from './website-analysis-service';
import { SettingsService } from './settings-service';
import { logger } from '@/lib/logger';
import type { ClientContext } from './enrichment-prompts';

export interface BulkEnrichmentOptions {
  clienteIds: string[];
  includeAI?: boolean;
  includeWebsiteAnalysis?: boolean;
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

// Progress callback type
type ProgressCallback = (progress: BulkEnrichmentProgress) => void;

/**
 * Bulk Enrichment Service
 */
export class BulkEnrichmentService {
  /**
   * Run bulk enrichment on multiple clients
   */
  static async enrichClients(
    options: BulkEnrichmentOptions,
    onProgress?: ProgressCallback
  ): Promise<BulkEnrichmentResult> {
    const { clienteIds, includeAI = true, includeWebsiteAnalysis = true, userId } = options;

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

    const results: BulkEnrichmentResult['results'] = [];
    let successful = 0;
    let failed = 0;

    // Process clients sequentially to avoid rate limiting
    for (let i = 0; i < clientes.length; i++) {
      const cliente = clientes[i];

      // Report progress
      if (onProgress) {
        onProgress({
          total: clientes.length,
          completed: i,
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
            const enrichResult = await ConsensusService.quickEnrich(clientContext);

            // Save enrichment data
            if (enrichResult.website?.value || enrichResult.description?.value) {
              await prisma.clienteEnrichment.upsert({
                where: { clienteId: cliente.id },
                create: {
                  clienteId: cliente.id,
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
                },
                update: {
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
                },
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

          // Log activity
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

      results.push(result);

      // Small delay between clients to avoid rate limiting
      if (i < clientes.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

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
          { enrichment: null },
          { websiteAnalysis: null, sitioWeb: { not: null } },
        ],
      },
      select: {
        id: true,
        nombre: true,
        sitioWeb: true,
        enrichment: { select: { id: true } },
        websiteAnalysis: { select: { id: true } },
      },
      take: limit,
      orderBy: { fechaCreacion: 'desc' },
    });

    return clients.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      sitioWeb: c.sitioWeb,
      hasEnrichment: !!c.enrichment,
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
  }> {
    const [
      totalClients,
      enrichedClients,
      analyzedWebsites,
      clientsWithWebsite,
    ] = await Promise.all([
      prisma.cliente.count(),
      prisma.clienteEnrichment.count(),
      prisma.websiteAnalysis.count(),
      prisma.cliente.count({ where: { sitioWeb: { not: null } } }),
    ]);

    return {
      totalClients,
      enrichedClients,
      analyzedWebsites,
      pendingEnrichment: totalClients - enrichedClients,
      pendingAnalysis: clientsWithWebsite - analyzedWebsites,
    };
  }
}
