import { z } from 'zod';

export const CanalContactoSchema = z.enum(['EMAIL', 'WHATSAPP']);

export const CreatePlantillaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(255, 'El nombre es muy largo'),
  descripcion: z.string().max(500).optional().nullable(),
  canal: CanalContactoSchema,
  asunto: z.string().max(255).optional().nullable(),
  cuerpo: z.string().min(1, 'El cuerpo es requerido'),
}).refine(
  (data) => {
    if (data.canal === 'EMAIL' && (!data.asunto || data.asunto.trim() === '')) {
      return false;
    }
    return true;
  },
  {
    message: 'El asunto es requerido para plantillas de email',
    path: ['asunto'],
  }
);

export const UpdatePlantillaSchema = z.object({
  nombre: z.string().min(1).max(255).optional(),
  descripcion: z.string().max(500).optional().nullable(),
  canal: CanalContactoSchema.optional(),
  asunto: z.string().max(255).optional().nullable(),
  cuerpo: z.string().min(1).optional(),
  esActiva: z.boolean().optional(),
});

export const PlantillaFiltersSchema = z.object({
  canal: CanalContactoSchema.optional(),
  esActiva: z.string().transform((val) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }).optional(),
});

export type CreatePlantillaValidated = z.infer<typeof CreatePlantillaSchema>;
export type UpdatePlantillaValidated = z.infer<typeof UpdatePlantillaSchema>;
