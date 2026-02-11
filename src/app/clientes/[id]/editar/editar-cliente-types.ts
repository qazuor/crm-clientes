/**
 * Types and constants for the client edit form.
 */

export interface Cliente {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  twitter: string | null;
  sitioWeb: string | null;
  tieneSSL: boolean | null;
  esResponsive: boolean | null;
  direccion: string | null;
  ciudad: string | null;
  provincia: string | null;
  codigoPostal: string | null;
  industria: string | null;
  fuente: string;
  estado: string;
  prioridad: string;
  notas: string | null;
  ultimaIA?: Date | null;
}

export interface EditarClienteFormProps {
  cliente: Cliente;
}

export const ESTADOS = ['NUEVO', 'PRIMER_CONTACTO', 'EN_TRATATIVAS', 'EN_DESARROLLO', 'FINALIZADO', 'RECONTACTO'] as const;
export const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'] as const;
export const FUENTES = ['IMPORTADO', 'MANUAL', 'REFERIDO', 'CONTACTO_CLIENTE'] as const;
export const INDUSTRIAS = ['GASTRONOMIA', 'SALUD', 'INDUMENTARIA', 'BELLEZA', 'DEPORTES', 'COMERCIO', 'CONSTRUCCION', 'SERVICIOS', 'INDUSTRIA', 'TURISMO', 'CULTURA', 'OTROS'] as const;
