import { describe, expect, it } from 'vitest';
import { getEstadoBadgeColor, getPrioridadBadgeColor } from './badge-utils';

const DEFAULT_BADGE_COLOR = 'bg-gray-100 text-gray-800';

describe('getEstadoBadgeColor', () => {
  it('returns correct color for NUEVO', () => {
    expect(getEstadoBadgeColor({ estado: 'NUEVO' })).toBe('bg-blue-100 text-blue-800');
  });

  it('returns correct color for PRIMER_CONTACTO', () => {
    expect(getEstadoBadgeColor({ estado: 'PRIMER_CONTACTO' })).toBe('bg-yellow-100 text-yellow-800');
  });

  it('returns correct color for EN_TRATATIVAS', () => {
    expect(getEstadoBadgeColor({ estado: 'EN_TRATATIVAS' })).toBe('bg-orange-100 text-orange-800');
  });

  it('returns correct color for EN_DESARROLLO', () => {
    expect(getEstadoBadgeColor({ estado: 'EN_DESARROLLO' })).toBe('bg-green-100 text-green-800');
  });

  it('returns correct color for FINALIZADO', () => {
    expect(getEstadoBadgeColor({ estado: 'FINALIZADO' })).toBe('bg-gray-100 text-gray-800');
  });

  it('returns correct color for RECONTACTO', () => {
    expect(getEstadoBadgeColor({ estado: 'RECONTACTO' })).toBe('bg-purple-100 text-purple-800');
  });

  it('returns default color for unknown estado', () => {
    expect(getEstadoBadgeColor({ estado: 'UNKNOWN' })).toBe(DEFAULT_BADGE_COLOR);
  });

  it('returns default color for empty string', () => {
    expect(getEstadoBadgeColor({ estado: '' })).toBe(DEFAULT_BADGE_COLOR);
  });
});

describe('getPrioridadBadgeColor', () => {
  it('returns correct color for CRITICA', () => {
    expect(getPrioridadBadgeColor({ prioridad: 'CRITICA' })).toBe('bg-red-100 text-red-800');
  });

  it('returns correct color for ALTA', () => {
    expect(getPrioridadBadgeColor({ prioridad: 'ALTA' })).toBe('bg-orange-100 text-orange-800');
  });

  it('returns correct color for MEDIA', () => {
    expect(getPrioridadBadgeColor({ prioridad: 'MEDIA' })).toBe('bg-yellow-100 text-yellow-800');
  });

  it('returns correct color for BAJA', () => {
    expect(getPrioridadBadgeColor({ prioridad: 'BAJA' })).toBe('bg-gray-100 text-gray-800');
  });

  it('returns default color for unknown prioridad', () => {
    expect(getPrioridadBadgeColor({ prioridad: 'UNKNOWN' })).toBe(DEFAULT_BADGE_COLOR);
  });

  it('returns default color for empty string', () => {
    expect(getPrioridadBadgeColor({ prioridad: '' })).toBe(DEFAULT_BADGE_COLOR);
  });
});
