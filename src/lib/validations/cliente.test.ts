import { describe, expect, it } from 'vitest';
import {
  CreateClienteDTOSchema,
  UpdateClienteDTOSchema,
  ClienteFiltersSchema,
  EstadoClienteSchema,
  PrioridadClienteSchema,
  FuenteClienteSchema,
} from './cliente';

describe('EstadoClienteSchema', () => {
  const validEstados = ['NUEVO', 'PRIMER_CONTACTO', 'EN_TRATATIVAS', 'EN_DESARROLLO', 'FINALIZADO', 'RECONTACTO'];

  it.each(validEstados)('accepts valid estado: %s', (estado) => {
    expect(EstadoClienteSchema.parse(estado)).toBe(estado);
  });

  it('rejects invalid estado', () => {
    expect(() => EstadoClienteSchema.parse('INVALID')).toThrow();
  });
});

describe('PrioridadClienteSchema', () => {
  const validPrioridades = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];

  it.each(validPrioridades)('accepts valid prioridad: %s', (prioridad) => {
    expect(PrioridadClienteSchema.parse(prioridad)).toBe(prioridad);
  });

  it('rejects invalid prioridad', () => {
    expect(() => PrioridadClienteSchema.parse('URGENTE')).toThrow();
  });
});

describe('FuenteClienteSchema', () => {
  const validFuentes = ['IMPORTADO', 'MANUAL', 'REFERIDO', 'CONTACTO_CLIENTE'];

  it.each(validFuentes)('accepts valid fuente: %s', (fuente) => {
    expect(FuenteClienteSchema.parse(fuente)).toBe(fuente);
  });

  it('rejects invalid fuente', () => {
    expect(() => FuenteClienteSchema.parse('WEB')).toThrow();
  });
});

describe('CreateClienteDTOSchema', () => {
  const validMinimal = { nombre: 'Test Client' };

  it('accepts minimal valid input (only nombre)', () => {
    const result = CreateClienteDTOSchema.parse(validMinimal);

    expect(result.nombre).toBe('Test Client');
    expect(result.fuente).toBe('MANUAL');
    expect(result.estado).toBe('NUEVO');
    expect(result.prioridad).toBe('MEDIA');
  });

  it('accepts full valid input', () => {
    const fullInput = {
      nombre: 'Acme Corp',
      email: 'Contact@Acme.com',
      telefono: '+54 11 1234-5678',
      whatsapp: '+5411123456',
      instagram: '@acme',
      facebook: 'acme.corp',
      linkedin: 'acme-corp',
      twitter: '@acme_corp',
      direccion: 'Av. Corrientes 1234',
      ciudad: 'Buenos Aires',
      provincia: 'CABA',
      codigoPostal: '1043',
      industria: 'Tecnología',
      sitioWeb: 'https://acme.com',
      fuente: 'REFERIDO' as const,
      estado: 'EN_TRATATIVAS' as const,
      prioridad: 'ALTA' as const,
      notas: 'Some notes about this client',
    };

    const result = CreateClienteDTOSchema.parse(fullInput);

    expect(result.nombre).toBe('Acme Corp');
    expect(result.email).toBe('contact@acme.com'); // lowercase + trim
    expect(result.fuente).toBe('REFERIDO');
    expect(result.estado).toBe('EN_TRATATIVAS');
    expect(result.prioridad).toBe('ALTA');
  });

  // nombre validation
  it('rejects empty nombre', () => {
    expect(() => CreateClienteDTOSchema.parse({ nombre: '' })).toThrow('El nombre es requerido');
  });

  it('rejects nombre exceeding 255 characters', () => {
    expect(() => CreateClienteDTOSchema.parse({ nombre: 'a'.repeat(256) })).toThrow('El nombre es muy largo');
  });

  // email validation
  it('transforms email to lowercase', () => {
    const result = CreateClienteDTOSchema.parse({ nombre: 'Test', email: '  USER@EXAMPLE.COM  ' });
    expect(result.email).toBe('user@example.com');
  });

  it('transforms empty email to null', () => {
    const result = CreateClienteDTOSchema.parse({ nombre: 'Test', email: '' });
    expect(result.email).toBeNull();
  });

  it('rejects invalid email format', () => {
    expect(() => CreateClienteDTOSchema.parse({ nombre: 'Test', email: 'not-an-email' })).toThrow('Email inválido');
  });

  it('accepts null email', () => {
    const result = CreateClienteDTOSchema.parse({ nombre: 'Test', email: null });
    expect(result.email).toBeNull();
  });

  // sitioWeb validation
  it('accepts valid URL for sitioWeb', () => {
    const result = CreateClienteDTOSchema.parse({ nombre: 'Test', sitioWeb: 'https://example.com' });
    expect(result.sitioWeb).toBe('https://example.com');
  });

  it('rejects invalid URL for sitioWeb', () => {
    expect(() => CreateClienteDTOSchema.parse({ nombre: 'Test', sitioWeb: 'not-a-url' })).toThrow('URL inválida');
  });

  it('accepts empty string for sitioWeb', () => {
    const result = CreateClienteDTOSchema.parse({ nombre: 'Test', sitioWeb: '' });
    expect(result.sitioWeb).toBe('');
  });

  // max length validations
  it('rejects telefono exceeding 50 characters', () => {
    expect(() => CreateClienteDTOSchema.parse({ nombre: 'Test', telefono: 'a'.repeat(51) })).toThrow();
  });

  it('rejects notas exceeding 5000 characters', () => {
    expect(() => CreateClienteDTOSchema.parse({ nombre: 'Test', notas: 'a'.repeat(5001) })).toThrow();
  });

  // defaults
  it('applies default fuente as MANUAL', () => {
    const result = CreateClienteDTOSchema.parse({ nombre: 'Test' });
    expect(result.fuente).toBe('MANUAL');
  });

  it('applies default estado as NUEVO', () => {
    const result = CreateClienteDTOSchema.parse({ nombre: 'Test' });
    expect(result.estado).toBe('NUEVO');
  });

  it('applies default prioridad as MEDIA', () => {
    const result = CreateClienteDTOSchema.parse({ nombre: 'Test' });
    expect(result.prioridad).toBe('MEDIA');
  });

  // nullable fields
  it('accepts null for optional nullable fields', () => {
    const result = CreateClienteDTOSchema.parse({
      nombre: 'Test',
      telefono: null,
      direccion: null,
      ciudad: null,
      industria: null,
      notas: null,
    });

    expect(result.telefono).toBeNull();
    expect(result.direccion).toBeNull();
    expect(result.ciudad).toBeNull();
    expect(result.industria).toBeNull();
    expect(result.notas).toBeNull();
  });
});

describe('UpdateClienteDTOSchema', () => {
  it('accepts partial updates (all fields optional)', () => {
    const result = UpdateClienteDTOSchema.parse({ email: 'new@email.com' });
    expect(result.email).toBe('new@email.com');
    expect(result.nombre).toBeUndefined();
  });

  it('accepts empty object (defaults still apply for fields with defaults)', () => {
    const result = UpdateClienteDTOSchema.parse({});
    // .partial() on schema with .default() still applies defaults
    expect(result.fuente).toBe('MANUAL');
    expect(result.estado).toBe('NUEVO');
    expect(result.prioridad).toBe('MEDIA');
  });

  it('still validates field constraints', () => {
    expect(() => UpdateClienteDTOSchema.parse({ email: 'not-valid' })).toThrow('Email inválido');
  });

  it('transforms email to lowercase on update', () => {
    const result = UpdateClienteDTOSchema.parse({ email: '  USER@EXAMPLE.COM  ' });
    expect(result.email).toBe('user@example.com');
  });
});

describe('ClienteFiltersSchema', () => {
  it('accepts empty filters with defaults', () => {
    const result = ClienteFiltersSchema.parse({});

    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
    expect(result.sortBy).toBe('fechaCreacion');
    expect(result.sortOrder).toBe('desc');
  });

  it('accepts valid filters', () => {
    const result = ClienteFiltersSchema.parse({
      search: 'acme',
      estado: 'NUEVO',
      prioridad: 'ALTA',
      industria: 'Tech',
      limit: 25,
      offset: 10,
      sortBy: 'nombre',
      sortOrder: 'asc',
    });

    expect(result.search).toBe('acme');
    expect(result.estado).toBe('NUEVO');
    expect(result.limit).toBe(25);
    expect(result.sortBy).toBe('nombre');
  });

  it('coerces string numbers to numbers for limit/offset', () => {
    const result = ClienteFiltersSchema.parse({ limit: '20', offset: '5' });
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(5);
  });

  it('clamps limit to max value', () => {
    expect(() => ClienteFiltersSchema.parse({ limit: 200 })).toThrow();
  });

  it('rejects negative offset', () => {
    expect(() => ClienteFiltersSchema.parse({ offset: -1 })).toThrow();
  });

  it('rejects invalid sortBy field', () => {
    expect(() => ClienteFiltersSchema.parse({ sortBy: 'invalidField' })).toThrow();
  });

  it('rejects invalid sortOrder', () => {
    expect(() => ClienteFiltersSchema.parse({ sortOrder: 'random' })).toThrow();
  });

  it('accepts all valid sortBy options', () => {
    const validSortFields = [
      'fechaCreacion', 'fechaModific', 'nombre', 'email', 'estado',
      'prioridad', 'industria', 'ciudad', 'ultimoContacto', 'ultimaIA',
    ];

    for (const field of validSortFields) {
      const result = ClienteFiltersSchema.parse({ sortBy: field });
      expect(result.sortBy).toBe(field);
    }
  });
});
