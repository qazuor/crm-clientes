import { z } from 'zod';

export const matchModeSchema = z.enum(['exact', 'fuzzy', 'broad']);

export const enrichmentSettingsSchema = z.object({
  // AI Parameters
  temperature: z
    .number()
    .min(0, 'La temperatura debe ser al menos 0')
    .max(2, 'La temperatura no puede ser mayor a 2')
    .optional(),
  topP: z
    .number()
    .min(0, 'Top P debe ser al menos 0')
    .max(1, 'Top P no puede ser mayor a 1')
    .optional(),
  matchMode: matchModeSchema.optional(),
  minConfidenceScore: z
    .number()
    .min(0, 'El score mínimo debe ser al menos 0')
    .max(1, 'El score máximo es 1')
    .optional(),
  requireVerification: z.boolean().optional(),
  maxResultsPerField: z
    .number()
    .int()
    .min(1, 'Debe haber al menos 1 resultado')
    .max(10, 'Máximo 10 resultados por campo')
    .optional(),

  // Website Analysis Toggles
  enableScreenshots: z.boolean().optional(),
  enablePageSpeed: z.boolean().optional(),
  enableSsl: z.boolean().optional(),
  enableTechStack: z.boolean().optional(),
  enableSeo: z.boolean().optional(),
  enableAccessibility: z.boolean().optional(),
  enableSecurity: z.boolean().optional(),
  enableCrawlability: z.boolean().optional(),
});

export type EnrichmentSettingsInput = z.infer<typeof enrichmentSettingsSchema>;

// Default values for the singleton
export const DEFAULT_ENRICHMENT_SETTINGS: Required<EnrichmentSettingsInput> = {
  temperature: 0.3,
  topP: 0.9,
  matchMode: 'fuzzy',
  minConfidenceScore: 0.7,
  requireVerification: true,
  maxResultsPerField: 3,
  enableScreenshots: true,
  enablePageSpeed: true,
  enableSsl: true,
  enableTechStack: true,
  enableSeo: true,
  enableAccessibility: true,
  enableSecurity: true,
  enableCrawlability: true,
};
