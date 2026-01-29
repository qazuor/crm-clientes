import { z } from 'zod';
import { AI_PROVIDER_MODELS, PROVIDER_INFO } from '@/types/enrichment';

// All valid providers
const allProviders = Object.keys(PROVIDER_INFO);

// AI providers that require a model
const aiProviders = Object.keys(AI_PROVIDER_MODELS);

export const createApiKeySchema = z.object({
  provider: z.string().refine(
    (val) => allProviders.includes(val),
    { message: 'Proveedor no valido' }
  ),
  apiKey: z
    .string()
    .min(10, 'La API key debe tener al menos 10 caracteres')
    .max(500, 'La API key es demasiado larga'),
  model: z.string().optional(),
  enabled: z.boolean().optional().default(true),
}).refine(
  (data) => {
    // AI providers require a model selection
    if (aiProviders.includes(data.provider)) {
      if (!data.model) return false;
      const validModels = AI_PROVIDER_MODELS[data.provider as keyof typeof AI_PROVIDER_MODELS];
      return validModels?.includes(data.model) ?? false;
    }
    return true;
  },
  {
    message: 'Los proveedores de IA requieren seleccionar un modelo valido',
    path: ['model'],
  }
);

export const updateApiKeySchema = z.object({
  apiKey: z
    .string()
    .min(10, 'La API key debe tener al menos 10 caracteres')
    .max(500, 'La API key es demasiado larga')
    .optional(),
  model: z.string().optional(),
  enabled: z.boolean().optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;

// Helper to validate if model is valid for provider
export function isValidModelForProvider(provider: string, model: string): boolean {
  if (!aiProviders.includes(provider)) return true;
  const validModels = AI_PROVIDER_MODELS[provider as keyof typeof AI_PROVIDER_MODELS];
  return validModels?.includes(model) ?? false;
}
