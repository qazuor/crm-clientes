import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { SendBulkMensajeSchema } from '@/lib/validations/mensaje';
import { sendBulkEmail, prepareBulkWhatsApp } from '@/lib/services/contact-service';
import {
  successResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
  errorResponse,
} from '@/lib/api-response';

// POST /api/mensajes/send-bulk - Envio masivo
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const validation = SendBulkMensajeSchema.safeParse(body);
    if (!validation.success) return validationErrorResponse(validation.error);

    const { clienteIds, plantillaId, canal } = validation.data;

    if (canal === 'EMAIL') {
      const result = await sendBulkEmail(clienteIds, plantillaId, session.user.id);
      return successResponse(result, {
        message: `Enviados: ${result.successful}/${result.total}. Errores: ${result.failed}`,
      });
    }

    // WHATSAPP
    const result = await prepareBulkWhatsApp(clienteIds, plantillaId, session.user.id);
    if (result.items.length === 0) {
      return errorResponse('No se pudo preparar ningún mensaje de WhatsApp', {
        status: 400,
        code: 'BULK_ERROR',
        details: result.errors,
      });
    }
    return successResponse(result, {
      message: `${result.items.length} mensajes preparados. ${result.errors.length} errores.`,
    });
  } catch (error) {
    logger.error('Error in bulk send', error instanceof Error ? error : new Error(String(error)));
    return serverErrorResponse(error instanceof Error ? error : undefined);
  }
}
