import { Resend } from 'resend';
import { logger } from '@/lib/logger';

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'CRM <onboarding@resend.dev>';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<SendEmailResult> {
  const resend = getResendClient();

  if (!resend) {
    logger.error('RESEND_API_KEY not configured');
    return { success: false, error: 'Servicio de email no configurado (RESEND_API_KEY faltante)' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      logger.error('Resend API error', new Error(error.message));
      return { success: false, error: error.message };
    }

    logger.info('Email sent successfully', { to, subject, id: data?.id });
    return { success: true, id: data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al enviar email';
    logger.error('Email send error', error instanceof Error ? error : new Error(message));
    return { success: false, error: message };
  }
}
