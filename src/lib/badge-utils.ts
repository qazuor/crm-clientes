/**
 * Centralized badge color utilities for client estado and prioridad.
 * Used by TablaClientes, ClienteCard, and any component displaying status badges.
 */

/** Tailwind class string for estado badge colors */
const ESTADO_COLORS: Record<string, string> = {
  NUEVO: 'bg-blue-100 text-blue-800',
  PRIMER_CONTACTO: 'bg-yellow-100 text-yellow-800',
  EN_TRATATIVAS: 'bg-orange-100 text-orange-800',
  EN_DESARROLLO: 'bg-green-100 text-green-800',
  FINALIZADO: 'bg-gray-100 text-gray-800',
  RECONTACTO: 'bg-purple-100 text-purple-800',
} as const;

const DEFAULT_BADGE_COLOR = 'bg-gray-100 text-gray-800';

/** Tailwind class string for prioridad badge colors */
const PRIORIDAD_COLORS: Record<string, string> = {
  CRITICA: 'bg-red-100 text-red-800',
  ALTA: 'bg-orange-100 text-orange-800',
  MEDIA: 'bg-yellow-100 text-yellow-800',
  BAJA: 'bg-gray-100 text-gray-800',
} as const;

/**
 * Returns Tailwind CSS classes for a client estado badge.
 *
 * @param estado - The client estado value
 * @returns Tailwind class string for background and text color
 */
export function getEstadoBadgeColor({ estado }: { estado: string }): string {
  return ESTADO_COLORS[estado] ?? DEFAULT_BADGE_COLOR;
}

/**
 * Returns Tailwind CSS classes for a prioridad badge.
 *
 * @param prioridad - The priority value
 * @returns Tailwind class string for background and text color
 */
export function getPrioridadBadgeColor({ prioridad }: { prioridad: string }): string {
  return PRIORIDAD_COLORS[prioridad] ?? DEFAULT_BADGE_COLOR;
}
