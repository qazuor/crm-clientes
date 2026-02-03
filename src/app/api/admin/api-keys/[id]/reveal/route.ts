import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import type { ApiResponse } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/api-keys/[id]/reveal - Get the decrypted API key
 * This endpoint requires authentication and should be used sparingly
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<{ apiKey: string }>>> {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const key = await prisma.apiKey.findUnique({
      where: { id },
    });

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'API key no encontrada' },
        { status: 404 }
      );
    }

    const decryptedKey = decrypt(key.apiKey);

    return NextResponse.json({
      success: true,
      data: { apiKey: decryptedKey },
    });
  } catch (error) {
    logger.error('Error revealing API key', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: 'Error al revelar la API key' },
      { status: 500 }
    );
  }
}
