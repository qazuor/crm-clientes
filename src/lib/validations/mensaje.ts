import { z } from 'zod';
import { CanalContactoSchema } from './plantilla';

export const SendMensajeSchema = z.object({
  clienteId: z.string().min(1, 'El ID del cliente es requerido'),
  plantillaId: z.string().min(1, 'El ID de la plantilla es requerido'),
  canal: CanalContactoSchema,
});

export const SendBulkMensajeSchema = z.object({
  clienteIds: z.array(z.string().min(1))
    .min(1, 'Se requiere al menos un cliente')
    .max(100, 'Máximo 100 clientes por envío'),
  plantillaId: z.string().min(1, 'El ID de la plantilla es requerido'),
  canal: CanalContactoSchema,
});

export const EstadoMensajeSchema = z.enum(['PENDIENTE', 'ENVIADO', 'ERROR']);

export const MensajeFiltersSchema = z.object({
  clienteId: z.string().optional(),
  canal: CanalContactoSchema.optional(),
  estado: EstadoMensajeSchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export type SendMensajeValidated = z.infer<typeof SendMensajeSchema>;
export type SendBulkMensajeValidated = z.infer<typeof SendBulkMensajeSchema>;
export type MensajeFiltersValidated = z.infer<typeof MensajeFiltersSchema>;
