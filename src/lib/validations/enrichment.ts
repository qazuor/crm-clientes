import { z } from 'zod';
import { REVIEWABLE_FIELDS } from '@/types/enrichment';

// POST /api/clientes/[id]/enrich - Enrichment options
export const enrichmentPostSchema = z.object({
  mode: z.enum(['ai', 'web', 'full']).optional(),
  fields: z.array(z.string()).optional(),
  quick: z.boolean().optional(),
  provider: z.string().optional(),
  useExternalApis: z.boolean().optional(),
  verifyEmails: z.boolean().optional(),
  searchGoogleMaps: z.boolean().optional(),
  confidenceThreshold: z.number().min(0).max(1).optional(),
});

export type EnrichmentPostInput = z.infer<typeof enrichmentPostSchema>;

// PATCH /api/clientes/[id]/enrich - Field review action
export const enrichmentPatchSchema = z.object({
  action: z.enum(['confirm', 'reject', 'edit'], {
    message: 'Accion invalida. Usar "confirm", "reject" o "edit"',
  }),
  fields: z
    .array(z.string())
    .min(1, 'Se requiere una lista de campos (fields)')
    .refine(
      (fields) => fields.every((f: string) => (REVIEWABLE_FIELDS as readonly string[]).includes(f)),
      {
        message: 'Uno o mas campos no son validos para revision',
      }
    ),
  editedValues: z.record(z.string(), z.unknown()).optional(),
  enrichmentId: z.string().optional(),
}).refine(
  (data) => {
    if (data.action === 'edit') {
      return data.editedValues !== undefined && data.editedValues !== null && typeof data.editedValues === 'object';
    }
    return true;
  },
  {
    message: 'Se requiere editedValues para la accion "edit"',
    path: ['editedValues'],
  }
);

export type EnrichmentPatchInput = z.infer<typeof enrichmentPatchSchema>;

// GET /api/quotas/history - Days query parameter
export const quotaHistoryDaysSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(30)
  .default(7);

export type QuotaHistoryDaysInput = z.infer<typeof quotaHistoryDaysSchema>;
