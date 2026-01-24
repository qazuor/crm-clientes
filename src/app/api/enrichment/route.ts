import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import ScreenshotService from '@/lib/screenshot-service'
import PageSpeedService from '@/lib/pagespeed-service'
import { quotaManager } from '@/lib/quota-manager'
import { logger } from '@/lib/logger'
import { hasPermission } from '@/lib/rbac'
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response'

interface EnrichmentResults {
  clienteId: string
  website: string
  timestamp: string
  services: {
    screenshots?: {
      success: boolean
      desktop?: { success: boolean; fileName?: string | null; error?: string }
      mobile?: { success: boolean; fileName?: string | null; error?: string }
      error?: string
    }
    pagespeed?: {
      success: boolean
      averageScore?: number
      mobile?: { success: boolean; score?: number; metrics?: unknown; error?: string }
      desktop?: { success: boolean; score?: number; metrics?: unknown; error?: string }
      error?: string
    }
  }
  quotaStatus: unknown
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session) {
      return unauthorizedResponse()
    }

    if (!hasPermission(session.user.role, 'ENRICHMENT_RUN')) {
      return errorResponse('Permisos insuficientes', { status: 403, code: 'FORBIDDEN' })
    }

    const body = await request.json()
    const { clienteId, services = ['screenshots', 'pagespeed'] } = body

    if (!clienteId) {
      return errorResponse('Cliente ID requerido', { status: 400, code: 'VALIDATION_ERROR' })
    }

    // Get client from database (excluding soft-deleted)
    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, deletedAt: null }
    })

    if (!cliente) {
      return notFoundResponse('Cliente')
    }

    // Validate website exists
    if (!cliente.sitioWeb) {
      return errorResponse('El cliente no tiene website configurado', { status: 400, code: 'VALIDATION_ERROR' })
    }

    logger.info('Starting enrichment', {
      clienteId,
      clienteName: cliente.nombre,
      website: cliente.sitioWeb,
      services,
      userId: session.user.id
    })

    const results: EnrichmentResults = {
      clienteId,
      website: cliente.sitioWeb,
      timestamp: new Date().toISOString(),
      services: {},
      quotaStatus: {}
    }

    // 1. Screenshots
    if (services.includes('screenshots')) {
      try {
        logger.debug('Processing screenshots', { clienteId })

        const screenshotResults = await ScreenshotService.takeResponsiveScreenshots(cliente.sitioWeb)

        results.services.screenshots = {
          success: screenshotResults.bothSucceeded,
          desktop: {
            success: screenshotResults.desktop.success,
            fileName: screenshotResults.desktop.fileName,
            error: screenshotResults.desktop.error
          },
          mobile: {
            success: screenshotResults.mobile.success,
            fileName: screenshotResults.mobile.fileName,
            error: screenshotResults.mobile.error
          }
        }

        // Update database with screenshots
        if (screenshotResults.desktop.success || screenshotResults.mobile.success) {
          await prisma.cliente.update({
            where: { id: clienteId },
            data: {
              screenshotDesktop: screenshotResults.desktop.fileName || null,
              screenshotMobile: screenshotResults.mobile.fileName || null,
              lastEnrichment: new Date()
            }
          })
        }

      } catch (error) {
        logger.error('Screenshot error', error instanceof Error ? error : new Error(String(error)), { clienteId })
        results.services.screenshots = {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    }

    // 2. PageSpeed Analysis
    if (services.includes('pagespeed')) {
      try {
        logger.debug('Processing PageSpeed', { clienteId })

        const pagespeedResults = await PageSpeedService.analyzeUrlBoth(cliente.sitioWeb)

        results.services.pagespeed = {
          success: pagespeedResults.bothSucceeded,
          averageScore: pagespeedResults.averageScore,
          mobile: {
            success: pagespeedResults.mobile.success,
            score: pagespeedResults.mobile.score,
            metrics: pagespeedResults.mobile.metrics,
            error: pagespeedResults.mobile.error
          },
          desktop: {
            success: pagespeedResults.desktop.success,
            score: pagespeedResults.desktop.score,
            metrics: pagespeedResults.desktop.metrics,
            error: pagespeedResults.desktop.error
          }
        }

        // Update database with PageSpeed
        if (pagespeedResults.bothSucceeded) {
          const websiteMetrics = {
            pagespeed: {
              mobile: {
                score: pagespeedResults.mobile.score,
                metrics: pagespeedResults.mobile.metrics,
                analyzed: new Date().toISOString()
              },
              desktop: {
                score: pagespeedResults.desktop.score,
                metrics: pagespeedResults.desktop.metrics,
                analyzed: new Date().toISOString()
              },
              averageScore: pagespeedResults.averageScore
            }
          }

          await prisma.cliente.update({
            where: { id: clienteId },
            data: {
              pageSpeedScore: String(pagespeedResults.averageScore || 0),
              websiteMetrics: JSON.stringify(websiteMetrics),
              lastEnrichment: new Date()
            }
          })
        }

      } catch (error) {
        logger.error('PageSpeed error', error instanceof Error ? error : new Error(String(error)), { clienteId })
        results.services.pagespeed = {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }
    }

    // 3. Update enrichmentData with summary
    try {
      const enrichmentData = {
        lastUpdate: new Date().toISOString(),
        services: Object.keys(results.services),
        results: results.services,
        quotaUsage: await quotaManager.getAllStatus()
      }

      await prisma.cliente.update({
        where: { id: clienteId },
        data: {
          enrichmentData: JSON.stringify(enrichmentData)
        }
      })

    } catch (error) {
      logger.error('Error updating enrichmentData', error instanceof Error ? error : new Error(String(error)), { clienteId })
    }

    // 4. Get final quota status
    results.quotaStatus = await quotaManager.getAllStatus()

    logger.info('Enrichment completed', {
      clienteId,
      clienteName: cliente.nombre,
      screenshotsOk: results.services.screenshots?.success || false,
      pagespeedOk: results.services.pagespeed?.success || false
    })

    return successResponse(results)

  } catch (error) {
    logger.error('Enrichment error', error instanceof Error ? error : new Error(String(error)))
    return serverErrorResponse(error instanceof Error ? error : undefined)
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session) {
      return unauthorizedResponse()
    }

    if (!hasPermission(session.user.role, 'ENRICHMENT_VIEW')) {
      return errorResponse('Permisos insuficientes', { status: 403, code: 'FORBIDDEN' })
    }

    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get('clienteId')

    if (!clienteId) {
      return errorResponse('Cliente ID requerido', { status: 400, code: 'VALIDATION_ERROR' })
    }

    // Get client with enrichment data (excluding soft-deleted)
    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, deletedAt: null }
    })

    if (!cliente) {
      return notFoundResponse('Cliente')
    }

    // Parse enrichment data
    let enrichmentData = null
    if (cliente.enrichmentData) {
      try {
        enrichmentData = JSON.parse(cliente.enrichmentData)
      } catch (error) {
        logger.warn('Error parsing enrichmentData', { clienteId, error: error instanceof Error ? error.message : String(error) })
      }
    }

    // Parse website metrics
    let websiteMetrics = null
    if (cliente.websiteMetrics) {
      try {
        websiteMetrics = JSON.parse(cliente.websiteMetrics)
      } catch (error) {
        logger.warn('Error parsing websiteMetrics', { clienteId, error: error instanceof Error ? error.message : String(error) })
      }
    }

    return successResponse({
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        website: cliente.sitioWeb,
        screenshotDesktop: cliente.screenshotDesktop,
        screenshotMobile: cliente.screenshotMobile,
        pageSpeedScore: cliente.pageSpeedScore,
        lastEnrichment: cliente.lastEnrichment
      },
      enrichmentData,
      websiteMetrics,
      hasScreenshots: !!(cliente.screenshotDesktop || cliente.screenshotMobile),
      hasPageSpeed: !!(cliente.pageSpeedScore && parseInt(cliente.pageSpeedScore) > 0),
      isEnriched: !!(cliente.lastEnrichment)
    })

  } catch (error) {
    logger.error('Error getting enrichment data', error instanceof Error ? error : new Error(String(error)))
    return serverErrorResponse(error instanceof Error ? error : undefined)
  }
}
