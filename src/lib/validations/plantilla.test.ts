import { describe, expect, it } from 'vitest';
import {
  CanalContactoSchema,
  CreatePlantillaSchema,
  UpdatePlantillaSchema,
  PlantillaFiltersSchema,
} from './plantilla';

describe('CanalContactoSchema', () => {
  it('accepts EMAIL', () => {
    expect(CanalContactoSchema.parse('EMAIL')).toBe('EMAIL');
  });

  it('accepts WHATSAPP', () => {
    expect(CanalContactoSchema.parse('WHATSAPP')).toBe('WHATSAPP');
  });

  it('rejects invalid canal', () => {
    expect(() => CanalContactoSchema.parse('SMS')).toThrow();
  });
});

describe('CreatePlantillaSchema', () => {
  it('accepts valid email template', () => {
    const result = CreatePlantillaSchema.parse({
      nombre: 'Welcome Email',
      canal: 'EMAIL',
      asunto: 'Welcome to our service',
      cuerpo: '<p>Hello {nombre}!</p>',
    });

    expect(result.nombre).toBe('Welcome Email');
    expect(result.canal).toBe('EMAIL');
    expect(result.asunto).toBe('Welcome to our service');
  });

  it('accepts valid WhatsApp template (no asunto required)', () => {
    const result = CreatePlantillaSchema.parse({
      nombre: 'WhatsApp Greeting',
      canal: 'WHATSAPP',
      cuerpo: 'Hello {nombre}!',
    });

    expect(result.nombre).toBe('WhatsApp Greeting');
    expect(result.canal).toBe('WHATSAPP');
  });

  it('rejects email template without asunto', () => {
    expect(() => CreatePlantillaSchema.parse({
      nombre: 'Missing Subject',
      canal: 'EMAIL',
      cuerpo: 'Some body',
    })).toThrow('El asunto es requerido para plantillas de email');
  });

  it('rejects email template with empty asunto', () => {
    expect(() => CreatePlantillaSchema.parse({
      nombre: 'Empty Subject',
      canal: 'EMAIL',
      asunto: '  ',
      cuerpo: 'Some body',
    })).toThrow('El asunto es requerido para plantillas de email');
  });

  it('rejects empty nombre', () => {
    expect(() => CreatePlantillaSchema.parse({
      nombre: '',
      canal: 'WHATSAPP',
      cuerpo: 'Body',
    })).toThrow('El nombre es requerido');
  });

  it('rejects nombre exceeding 255 characters', () => {
    expect(() => CreatePlantillaSchema.parse({
      nombre: 'a'.repeat(256),
      canal: 'WHATSAPP',
      cuerpo: 'Body',
    })).toThrow('El nombre es muy largo');
  });

  it('rejects empty cuerpo', () => {
    expect(() => CreatePlantillaSchema.parse({
      nombre: 'Test',
      canal: 'WHATSAPP',
      cuerpo: '',
    })).toThrow('El cuerpo es requerido');
  });

  it('accepts optional descripcion', () => {
    const result = CreatePlantillaSchema.parse({
      nombre: 'Test',
      canal: 'WHATSAPP',
      cuerpo: 'Body',
      descripcion: 'A short description',
    });
    expect(result.descripcion).toBe('A short description');
  });

  it('rejects descripcion exceeding 500 characters', () => {
    expect(() => CreatePlantillaSchema.parse({
      nombre: 'Test',
      canal: 'WHATSAPP',
      cuerpo: 'Body',
      descripcion: 'a'.repeat(501),
    })).toThrow();
  });
});

describe('UpdatePlantillaSchema', () => {
  it('accepts partial update', () => {
    const result = UpdatePlantillaSchema.parse({ nombre: 'New Name' });
    expect(result.nombre).toBe('New Name');
  });

  it('accepts esActiva boolean', () => {
    const result = UpdatePlantillaSchema.parse({ esActiva: false });
    expect(result.esActiva).toBe(false);
  });

  it('rejects nombre shorter than 1 character', () => {
    expect(() => UpdatePlantillaSchema.parse({ nombre: '' })).toThrow();
  });
});

describe('PlantillaFiltersSchema', () => {
  it('accepts empty filters', () => {
    const result = PlantillaFiltersSchema.parse({});
    expect(result).toEqual({});
  });

  it('accepts canal filter', () => {
    const result = PlantillaFiltersSchema.parse({ canal: 'EMAIL' });
    expect(result.canal).toBe('EMAIL');
  });

  it('transforms esActiva string to boolean', () => {
    const trueResult = PlantillaFiltersSchema.parse({ esActiva: 'true' });
    expect(trueResult.esActiva).toBe(true);

    const falseResult = PlantillaFiltersSchema.parse({ esActiva: 'false' });
    expect(falseResult.esActiva).toBe(false);
  });
});
