import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { SendMensajeSchema } from '@/lib/validations/mensaje';
import { sendContactEmail, prepareWhatsApp } from '@/lib/services/contact-service';
import {
  successResponse,
  validationErrorResponse,
  serverErrorResponse,
  unauthorizedResponse,
  errorResponse,
} from '@/lib/api-response';

// POST /api/mensajes/send - Envio individual
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const validation = SendMensajeSchema.safeParse(body);
    if (!validation.success) return validationErrorResponse(validation.error);

    const { clienteId, plantillaId, canal } = validation.data;

    if (canal === 'EMAIL') {
      const result = await sendContactEmail(clienteId, plantillaId, session.user.id);
      if (!result.success) {
        return errorResponse(result.error || 'Error al enviar email', { status: 400, code: 'SEND_ERROR' });
      }
      return successResponse({ mensajeId: result.mensajeId }, { message: 'Email enviado exitosamente' });
    }

    // WHATSAPP
    const result = await prepareWhatsApp(clienteId, plantillaId, session.user.id);
    if (!result.success) {
      return errorResponse(result.error || 'Error al preparar WhatsApp', { status: 400, code: 'SEND_ERROR' });
    }
    return successResponse(
      { mensajeId: result.mensajeId, url: result.url },
      { message: 'Mensaje de WhatsApp preparado' }
    );
  } catch (error) {
    logger.error('Error sending message', error instanceof Error ? error : new Error(String(error)));
    return serverErrorResponse(error instanceof Error ? error : undefined);
  }
}
