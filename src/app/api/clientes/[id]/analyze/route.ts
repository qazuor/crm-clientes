/**
 * Website Analysis API Endpoint
 * POST /api/clientes/[id]/analyze - Run website analysis
 * GET /api/clientes/[id]/analyze - Get existing analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WebsiteAnalysisService } from '@/lib/services/website-analysis-service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;

    // Get client
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        sitioWeb: true,
      },
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    if (!cliente.sitioWeb) {
      return NextResponse.json(
        { error: 'El cliente no tiene sitio web registrado' },
        { status: 400 }
      );
    }

    // Get request body for options
    let options: {
      includeScreenshots?: boolean;
      includePageSpeed?: boolean;
      includeSsl?: boolean;
      includeSeo?: boolean;
      includeTechStack?: boolean;
      includeSecurity?: boolean;
      includeAccessibility?: boolean;
      includeCrawlability?: boolean;
      includeResponsive?: boolean;
      // External APIs (opt-in)
      includeBuiltWith?: boolean;
      // Free APIs
      includeServerLocation?: boolean;
      includeWhois?: boolean;
      includeFavicon?: boolean;
      quick?: boolean;
    } = {};

    try {
      options = await request.json();
    } catch {
      // No body or invalid JSON - use defaults
    }

    // Run analysis
    let result;
    if (options.quick) {
      result = await WebsiteAnalysisService.quickAnalysis(cliente.id, cliente.sitioWeb);
    } else {
      result = await WebsiteAnalysisService.analyzeWebsite({
        clienteId: cliente.id,
        url: cliente.sitioWeb,
        includeScreenshots: options.includeScreenshots,
        includePageSpeed: options.includePageSpeed,
        includeSsl: options.includeSsl,
        includeSeo: options.includeSeo,
        includeTechStack: options.includeTechStack,
        includeSecurity: options.includeSecurity,
        includeAccessibility: options.includeAccessibility,
        includeCrawlability: options.includeCrawlability,
        includeResponsive: options.includeResponsive,
        // External APIs
        includeBuiltWith: options.includeBuiltWith,
        // Free APIs
        includeServerLocation: options.includeServerLocation,
        includeWhois: options.includeWhois,
        includeFavicon: options.includeFavicon,
      });
    }

    // Log the analysis activity (only if user exists in DB)
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
              descripcion: `Analisis de sitio web completado: ${result.analysisPerformed.join(', ')}`,
              clienteId: id,
              usuarioId: session.user.id,
            },
          });
        }
      } catch (activityError) {
        // Log error but don't fail the request - analysis was successful
        console.warn('Could not log activity:', activityError);
      }
    }

    return NextResponse.json({
      success: result.success,
      analysis: result,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Website analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error en analisis' },
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

    // Get existing analysis
    const analysis = await WebsiteAnalysisService.getAnalysis(id);

    if (!analysis) {
      return NextResponse.json({ analysis: null });
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Get analysis error:', error);
    return NextResponse.json(
      { error: 'Error al obtener analisis' },
      { status: 500 }
    );
  }
}
