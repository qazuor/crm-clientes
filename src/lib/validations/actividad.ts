import { z } from 'zod';

// Enum schema for activity types
export const TipoActividadSchema = z.enum([
  'LLAMADA',
  'EMAIL',
  'REUNION',
  'TAREA',
  'NOTA',
  'PROPUESTA',
  'SEGUIMIENTO',
  'CLIENTE_CREADO',
  'CLIENTE_EDITADO',
  'CLIENTE_ELIMINADO',
  'IA_ENRIQUECIMIENTO',
  'CONTACTO_AUTOMATICO'
]);

// Create Actividad DTO Schema
export const CreateActividadDTOSchema = z.object({
  tipo: TipoActividadSchema,
  descripcion: z.string().min(1, 'La descripción es requerida').max(5000, 'La descripción es muy larga'),
  clienteId: z.string().uuid('ID de cliente inválido'),
  resultado: z.string().max(1000).optional().nullable(),
  proximoPaso: z.string().max(1000).optional().nullable(),
});

// Actividad Filters Schema for GET requests
export const ActividadFiltersSchema = z.object({
  clienteId: z.string().uuid().optional(),
  usuarioId: z.string().uuid().optional(),
  tipo: TipoActividadSchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// Export type inference
export type CreateActividadDTOValidated = z.infer<typeof CreateActividadDTOSchema>;
export type ActividadFiltersValidated = z.infer<typeof ActividadFiltersSchema>;
