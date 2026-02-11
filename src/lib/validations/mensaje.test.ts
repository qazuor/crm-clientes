import { describe, expect, it } from 'vitest';
import {
  SendMensajeSchema,
  SendBulkMensajeSchema,
  EstadoMensajeSchema,
  MensajeFiltersSchema,
} from './mensaje';

describe('EstadoMensajeSchema', () => {
  it.each(['PENDIENTE', 'ENVIADO', 'ERROR'])('accepts valid estado: %s', (estado) => {
    expect(EstadoMensajeSchema.parse(estado)).toBe(estado);
  });

  it('rejects invalid estado', () => {
    expect(() => EstadoMensajeSchema.parse('DELIVERED')).toThrow();
  });
});

describe('SendMensajeSchema', () => {
  const validInput = {
    clienteId: 'client-123',
    plantillaId: 'template-456',
    canal: 'EMAIL' as const,
  };

  it('accepts valid input', () => {
    const result = SendMensajeSchema.parse(validInput);
    expect(result.clienteId).toBe('client-123');
    expect(result.plantillaId).toBe('template-456');
    expect(result.canal).toBe('EMAIL');
  });

  it('accepts WHATSAPP canal', () => {
    const result = SendMensajeSchema.parse({ ...validInput, canal: 'WHATSAPP' });
    expect(result.canal).toBe('WHATSAPP');
  });

  it('rejects empty clienteId', () => {
    expect(() => SendMensajeSchema.parse({ ...validInput, clienteId: '' })).toThrow('El ID del cliente es requerido');
  });

  it('rejects empty plantillaId', () => {
    expect(() => SendMensajeSchema.parse({ ...validInput, plantillaId: '' })).toThrow('El ID de la plantilla es requerido');
  });

  it('rejects invalid canal', () => {
    expect(() => SendMensajeSchema.parse({ ...validInput, canal: 'SMS' })).toThrow();
  });
});

describe('SendBulkMensajeSchema', () => {
  const validInput = {
    clienteIds: ['id-1', 'id-2'],
    plantillaId: 'template-456',
    canal: 'EMAIL' as const,
  };

  it('accepts valid bulk input', () => {
    const result = SendBulkMensajeSchema.parse(validInput);
    expect(result.clienteIds).toHaveLength(2);
  });

  it('rejects empty clienteIds array', () => {
    expect(() => SendBulkMensajeSchema.parse({ ...validInput, clienteIds: [] })).toThrow('Se requiere al menos un cliente');
  });

  it('rejects more than 100 clienteIds', () => {
    const tooMany = Array.from({ length: 101 }, (_, i) => `id-${i}`);
    expect(() => SendBulkMensajeSchema.parse({ ...validInput, clienteIds: tooMany })).toThrow('Máximo 100 clientes');
  });
});

describe('MensajeFiltersSchema', () => {
  it('accepts empty filters with defaults', () => {
    const result = MensajeFiltersSchema.parse({});
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  it('accepts all filter options', () => {
    const result = MensajeFiltersSchema.parse({
      clienteId: 'client-123',
      canal: 'EMAIL',
      estado: 'ENVIADO',
      limit: 50,
      offset: 10,
    });
    expect(result.clienteId).toBe('client-123');
    expect(result.canal).toBe('EMAIL');
    expect(result.estado).toBe('ENVIADO');
  });

  it('rejects invalid canal filter', () => {
    expect(() => MensajeFiltersSchema.parse({ canal: 'SMS' })).toThrow();
  });
});
