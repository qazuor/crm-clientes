import { describe, expect, it } from 'vitest';
import {
  TipoActividadSchema,
  CreateActividadDTOSchema,
  ActividadFiltersSchema,
} from './actividad';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('TipoActividadSchema', () => {
  const validTypes = [
    'LLAMADA', 'EMAIL', 'REUNION', 'TAREA', 'NOTA', 'PROPUESTA',
    'SEGUIMIENTO', 'CLIENTE_CREADO', 'CLIENTE_EDITADO', 'CLIENTE_ELIMINADO',
    'IA_ENRIQUECIMIENTO', 'CONTACTO_AUTOMATICO',
  ];

  it.each(validTypes)('accepts valid tipo: %s', (tipo) => {
    expect(TipoActividadSchema.parse(tipo)).toBe(tipo);
  });

  it('rejects invalid tipo', () => {
    expect(() => TipoActividadSchema.parse('INVALID')).toThrow();
  });
});

describe('CreateActividadDTOSchema', () => {
  const validInput = {
    tipo: 'LLAMADA' as const,
    descripcion: 'Called the client about the proposal',
    clienteId: VALID_UUID,
  };

  it('accepts valid minimal input', () => {
    const result = CreateActividadDTOSchema.parse(validInput);
    expect(result.tipo).toBe('LLAMADA');
    expect(result.descripcion).toBe('Called the client about the proposal');
    expect(result.clienteId).toBe(VALID_UUID);
  });

  it('accepts optional resultado and proximoPaso', () => {
    const result = CreateActividadDTOSchema.parse({
      ...validInput,
      resultado: 'Client is interested',
      proximoPaso: 'Schedule follow-up meeting',
    });
    expect(result.resultado).toBe('Client is interested');
    expect(result.proximoPaso).toBe('Schedule follow-up meeting');
  });

  it('rejects empty descripcion', () => {
    expect(() => CreateActividadDTOSchema.parse({
      ...validInput,
      descripcion: '',
    })).toThrow('La descripción es requerida');
  });

  it('rejects descripcion exceeding 5000 characters', () => {
    expect(() => CreateActividadDTOSchema.parse({
      ...validInput,
      descripcion: 'a'.repeat(5001),
    })).toThrow('La descripción es muy larga');
  });

  it('rejects invalid UUID for clienteId', () => {
    expect(() => CreateActividadDTOSchema.parse({
      ...validInput,
      clienteId: 'not-a-uuid',
    })).toThrow('ID de cliente inválido');
  });

  it('rejects resultado exceeding 1000 characters', () => {
    expect(() => CreateActividadDTOSchema.parse({
      ...validInput,
      resultado: 'a'.repeat(1001),
    })).toThrow();
  });

  it('accepts null for optional nullable fields', () => {
    const result = CreateActividadDTOSchema.parse({
      ...validInput,
      resultado: null,
      proximoPaso: null,
    });
    expect(result.resultado).toBeNull();
    expect(result.proximoPaso).toBeNull();
  });
});

describe('ActividadFiltersSchema', () => {
  it('accepts empty filters with defaults', () => {
    const result = ActividadFiltersSchema.parse({});
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  it('accepts valid UUID for clienteId filter', () => {
    const result = ActividadFiltersSchema.parse({ clienteId: VALID_UUID });
    expect(result.clienteId).toBe(VALID_UUID);
  });

  it('accepts valid tipo filter', () => {
    const result = ActividadFiltersSchema.parse({ tipo: 'EMAIL' });
    expect(result.tipo).toBe('EMAIL');
  });

  it('coerces string numbers for limit and offset', () => {
    const result = ActividadFiltersSchema.parse({ limit: '50', offset: '10' });
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(10);
  });

  it('rejects limit exceeding 100', () => {
    expect(() => ActividadFiltersSchema.parse({ limit: 200 })).toThrow();
  });
});
