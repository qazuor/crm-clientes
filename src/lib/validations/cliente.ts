import { z } from 'zod';
import { PAGINATION } from '@/lib/constants';

// Enum schemas
export const EstadoClienteSchema = z.enum([
  'NUEVO',
  'PRIMER_CONTACTO',
  'EN_TRATATIVAS',
  'EN_DESARROLLO',
  'FINALIZADO',
  'RECONTACTO'
]);

export const PrioridadClienteSchema = z.enum(['BAJA', 'MEDIA', 'ALTA', 'CRITICA']);

export const FuenteClienteSchema = z.enum([
  'IMPORTADO',
  'MANUAL',
  'REFERIDO',
  'CONTACTO_CLIENTE'
]);

// Create Cliente DTO Schema
export const CreateClienteDTOSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(255, 'El nombre es muy largo'),
  email: z.string().email('Email inválido').max(255).optional().nullable(),
  telefono: z.string().max(50).optional().nullable(),
  whatsapp: z.string().max(50).optional().nullable(),
  instagram: z.string().max(100).optional().nullable(),
  facebook: z.string().max(255).optional().nullable(),
  linkedin: z.string().max(255).optional().nullable(),
  twitter: z.string().max(100).optional().nullable(),
  direccion: z.string().max(500).optional().nullable(),
  ciudad: z.string().max(100).optional().nullable(),
  provincia: z.string().max(100).optional().nullable(),
  codigoPostal: z.string().max(20).optional().nullable(),
  industria: z.string().max(100).optional().nullable(),
  sitioWeb: z.string().url('URL inválida').max(500).optional().nullable().or(z.literal('')),
  tieneSSL: z.boolean().optional().nullable(),
  esResponsive: z.boolean().optional().nullable(),
  fuente: FuenteClienteSchema.default('MANUAL'),
  estado: EstadoClienteSchema.default('NUEVO'),
  prioridad: PrioridadClienteSchema.default('MEDIA'),
  notas: z.string().max(5000).optional().nullable(),
});

// Update Cliente DTO Schema (all fields optional)
export const UpdateClienteDTOSchema = CreateClienteDTOSchema.partial();

// Cliente Filters Schema for GET requests
export const ClienteFiltersSchema = z.object({
  search: z.string().max(255).optional(),
  estado: EstadoClienteSchema.optional(),
  prioridad: PrioridadClienteSchema.optional(),
  fuente: FuenteClienteSchema.optional(),
  industria: z.string().max(100).optional(),
  limit: z.coerce.number().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  offset: z.coerce.number().min(0).default(PAGINATION.DEFAULT_OFFSET),
  sortBy: z.enum([
    'fechaCreacion', 'fechaModific', 'nombre', 'email', 'estado',
    'prioridad', 'industria', 'ciudad', 'ultimoContacto', 'ultimaIA',
  ]).optional().default('fechaCreacion'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Export type inference
export type CreateClienteDTOValidated = z.infer<typeof CreateClienteDTOSchema>;
export type UpdateClienteDTOValidated = z.infer<typeof UpdateClienteDTOSchema>;
export type ClienteFiltersValidated = z.infer<typeof ClienteFiltersSchema>;
