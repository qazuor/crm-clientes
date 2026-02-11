/**
 * Batch review operations for enrichment fields.
 * Handles confirming and rejecting fields across multiple clients.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { buildFieldStatuses, getFieldUpdateData } from './enrichment-field-utils';
import type { FieldReviewStatus, ReviewableField } from '@/types/enrichment';
import { REVIEWABLE_FIELDS } from '@/types/enrichment';

/**
 * Confirm specific fields for a batch of clients. Applies enrichment data to client records.
 */
export async function confirmFieldsBatch(
  items: ReadonlyArray<{ readonly clienteId: string; readonly fields: string[] }>,
  userId: string,
): Promise<{ confirmed: number; errors: string[] }> {
  let confirmed = 0;
  const errors: string[] = [];

  for (const { clienteId, fields } of items) {
    try {
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
        : buildFieldStatuses(enrichment as unknown as Record<string, unknown>);

      const validFields = fields.filter(
        (f) => REVIEWABLE_FIELDS.includes(f as ReviewableField) && fieldStatuses[f] === 'PENDING',
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
        const fieldUpdate = getFieldUpdateData(
          field as ReviewableField,
          enrichment as unknown as Record<string, unknown>,
        );
        Object.assign(allUpdateData, fieldUpdate);
      }

      if (Object.keys(allUpdateData).length > 0) {
        await prisma.cliente.update({
          where: { id: clienteId },
          data: allUpdateData,
        });
      }

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

      await prisma.cliente.update({
        where: { id: clienteId },
        data: { enrichmentStatus: allReviewed ? 'COMPLETE' : 'PARTIAL' },
      });

      // Log activity (non-critical)
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
        `${clienteId}: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
    }
  }

  return { confirmed, errors };
}

/**
 * Reject specific fields for a batch of clients.
 */
export async function rejectFieldsBatch(
  items: ReadonlyArray<{ readonly clienteId: string; readonly fields: string[] }>,
  userId: string,
): Promise<{ rejected: number; errors: string[] }> {
  let rejected = 0;
  const errors: string[] = [];

  for (const { clienteId, fields } of items) {
    try {
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
        : buildFieldStatuses(enrichment as unknown as Record<string, unknown>);

      const validFields = fields.filter(
        (f) => REVIEWABLE_FIELDS.includes(f as ReviewableField) && fieldStatuses[f] === 'PENDING',
      );

      if (validFields.length === 0) {
        errors.push(`${clienteId}: no hay campos validos pendientes para rechazar`);
        continue;
      }

      for (const field of validFields) {
        fieldStatuses[field] = 'REJECTED';
      }

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

      if (allReviewed) {
        await prisma.cliente.update({
          where: { id: clienteId },
          data: { enrichmentStatus: 'COMPLETE' },
        });
      }

      // Log activity (non-critical)
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
        `${clienteId}: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
    }
  }

  return { rejected, errors };
}
