import { prisma } from '@/lib/prisma';
import { sendEmail } from './email-service';
import { render } from './template-render-service';
import { htmlToWhatsApp } from './whatsapp-format-service';
import { registrarEmailEnviado, registrarWhatsAppEnviado } from '@/lib/actividades-automaticas';
import { logger } from '@/lib/logger';

interface ContactResult {
  success: boolean;
  mensajeId?: string;
  error?: string;
}

interface WhatsAppResult extends ContactResult {
  url?: string;
}

interface BulkResult {
  total: number;
  successful: number;
  failed: number;
  details: Array<{
    clienteId: string;
    nombre: string;
    success: boolean;
    error?: string;
  }>;
}

interface BulkWhatsAppItem {
  clienteId: string;
  nombre: string;
  url: string;
  mensajeId: string;
}

export async function sendContactEmail(
  clienteId: string,
  plantillaId: string,
  usuarioId: string
): Promise<ContactResult> {
  try {
    const [cliente, plantilla] = await Promise.all([
      prisma.cliente.findUnique({ where: { id: clienteId } }),
      prisma.plantillaContacto.findUnique({ where: { id: plantillaId } }),
    ]);

    if (!cliente) return { success: false, error: 'Cliente no encontrado' };
    if (!plantilla) return { success: false, error: 'Plantilla no encontrada' };
    if (!cliente.email) return { success: false, error: 'El cliente no tiene email' };
    if (plantilla.canal !== 'EMAIL') return { success: false, error: 'La plantilla no es de tipo email' };

    const cuerpoRenderizado = render(plantilla.cuerpo, cliente);
    const asuntoRenderizado = plantilla.asunto ? render(plantilla.asunto, cliente) : '';

    // Create pending message record
    const mensaje = await prisma.mensaje.create({
      data: {
        canal: 'EMAIL',
        destinatario: cliente.email,
        asunto: asuntoRenderizado,
        cuerpo: cuerpoRenderizado,
        estado: 'PENDIENTE',
        clienteId,
        usuarioId,
        plantillaId,
      },
    });

    // Send via Resend
    const result = await sendEmail(cliente.email, asuntoRenderizado, cuerpoRenderizado);

    // Update message status
    await prisma.mensaje.update({
      where: { id: mensaje.id },
      data: {
        estado: result.success ? 'ENVIADO' : 'ERROR',
        errorDetalle: result.error || null,
      },
    });

    if (result.success) {
      // Update ultimoContacto
      await prisma.cliente.update({
        where: { id: clienteId },
        data: { ultimoContacto: new Date() },
      });

      // Log activity
      await registrarEmailEnviado(clienteId, usuarioId, cliente.nombre, asuntoRenderizado, plantilla.nombre);
    }

    return {
      success: result.success,
      mensajeId: mensaje.id,
      error: result.error,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al enviar email';
    logger.error('Contact email error', error instanceof Error ? error : new Error(msg));
    return { success: false, error: msg };
  }
}

export async function prepareWhatsApp(
  clienteId: string,
  plantillaId: string,
  usuarioId: string
): Promise<WhatsAppResult> {
  try {
    const [cliente, plantilla] = await Promise.all([
      prisma.cliente.findUnique({ where: { id: clienteId } }),
      prisma.plantillaContacto.findUnique({ where: { id: plantillaId } }),
    ]);

    if (!cliente) return { success: false, error: 'Cliente no encontrado' };
    if (!plantilla) return { success: false, error: 'Plantilla no encontrada' };
    if (!cliente.whatsapp) return { success: false, error: 'El cliente no tiene WhatsApp' };
    if (plantilla.canal !== 'WHATSAPP') return { success: false, error: 'La plantilla no es de tipo WhatsApp' };

    const cuerpoHtml = render(plantilla.cuerpo, cliente);
    const cuerpoWhatsApp = htmlToWhatsApp(cuerpoHtml);
    const phone = cliente.whatsapp.replace(/\D/g, '');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(cuerpoWhatsApp)}`;

    // Save message record
    const mensaje = await prisma.mensaje.create({
      data: {
        canal: 'WHATSAPP',
        destinatario: cliente.whatsapp,
        cuerpo: cuerpoWhatsApp,
        estado: 'ENVIADO',
        clienteId,
        usuarioId,
        plantillaId,
      },
    });

    // Update ultimoContacto
    await prisma.cliente.update({
      where: { id: clienteId },
      data: { ultimoContacto: new Date() },
    });

    // Log activity
    const preview = cuerpoWhatsApp.substring(0, 100);
    await registrarWhatsAppEnviado(clienteId, usuarioId, cliente.nombre, preview, plantilla.nombre);

    return { success: true, mensajeId: mensaje.id, url };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al preparar WhatsApp';
    logger.error('WhatsApp prepare error', error instanceof Error ? error : new Error(msg));
    return { success: false, error: msg };
  }
}

export async function sendBulkEmail(
  clienteIds: string[],
  plantillaId: string,
  usuarioId: string
): Promise<BulkResult> {
  const result: BulkResult = {
    total: clienteIds.length,
    successful: 0,
    failed: 0,
    details: [],
  };

  for (const clienteId of clienteIds) {
    const sendResult = await sendContactEmail(clienteId, plantillaId, usuarioId);
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { nombre: true },
    });

    const detail = {
      clienteId,
      nombre: cliente?.nombre || 'Desconocido',
      success: sendResult.success,
      error: sendResult.error,
    };

    if (sendResult.success) {
      result.successful++;
    } else {
      result.failed++;
    }

    result.details.push(detail);
  }

  return result;
}

export async function prepareBulkWhatsApp(
  clienteIds: string[],
  plantillaId: string,
  usuarioId: string
): Promise<{ items: BulkWhatsAppItem[]; errors: Array<{ clienteId: string; nombre: string; error: string }> }> {
  const items: BulkWhatsAppItem[] = [];
  const errors: Array<{ clienteId: string; nombre: string; error: string }> = [];

  for (const clienteId of clienteIds) {
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { nombre: true, whatsapp: true },
    });

    const prepResult = await prepareWhatsApp(clienteId, plantillaId, usuarioId);

    if (prepResult.success && prepResult.url) {
      items.push({
        clienteId,
        nombre: cliente?.nombre || 'Desconocido',
        url: prepResult.url,
        mensajeId: prepResult.mensajeId!,
      });
    } else {
      errors.push({
        clienteId,
        nombre: cliente?.nombre || 'Desconocido',
        error: prepResult.error || 'Error desconocido',
      });
    }
  }

  return { items, errors };
}
