import { describe, expect, it } from 'vitest';
import { render, validateTemplate, getAvailableVariables } from './template-render-service';

describe('getAvailableVariables', () => {
  it('returns all expected variable names', () => {
    const vars = getAvailableVariables();

    expect(vars).toContain('nombre');
    expect(vars).toContain('email');
    expect(vars).toContain('telefono');
    expect(vars).toContain('whatsapp');
    expect(vars).toContain('direccion');
    expect(vars).toContain('ciudad');
    expect(vars).toContain('provincia');
    expect(vars).toContain('codigoPostal');
    expect(vars).toContain('industria');
    expect(vars).toContain('sitioWeb');
    expect(vars).toContain('instagram');
    expect(vars).toContain('facebook');
    expect(vars).toContain('linkedin');
    expect(vars).toContain('twitter');
    expect(vars).toHaveLength(14);
  });
});

describe('render', () => {
  const baseCliente = {
    nombre: 'Acme Corp',
    email: 'contact@acme.com',
    telefono: '+54 11 1234-5678',
    ciudad: 'Buenos Aires',
    industria: 'Tecnología',
  };

  it('replaces a single variable', () => {
    const result = render('Hello {nombre}!', baseCliente);
    expect(result).toBe('Hello Acme Corp!');
  });

  it('replaces multiple variables', () => {
    const result = render('{nombre} - {email} ({ciudad})', baseCliente);
    expect(result).toBe('Acme Corp - contact@acme.com (Buenos Aires)');
  });

  it('replaces null/undefined variables with empty string', () => {
    const result = render('Web: {sitioWeb}', baseCliente);
    expect(result).toBe('Web: ');
  });

  it('leaves template unchanged when no variables present', () => {
    const result = render('No variables here', baseCliente);
    expect(result).toBe('No variables here');
  });

  it('replaces all occurrences of the same variable', () => {
    const result = render('{nombre} is {nombre}', baseCliente);
    expect(result).toBe('Acme Corp is Acme Corp');
  });

  it('handles empty template', () => {
    const result = render('', baseCliente);
    expect(result).toBe('');
  });

  it('does not replace unknown variables (they remain as-is)', () => {
    const result = render('{nombre} has {unknownVar}', baseCliente);
    expect(result).toBe('Acme Corp has {unknownVar}');
  });
});

describe('validateTemplate', () => {
  it('returns valid for template with known variables', () => {
    const result = validateTemplate('Hello {nombre}, your email is {email}');
    expect(result.valid).toBe(true);
    expect(result.invalidVars).toEqual([]);
  });

  it('returns valid for template with no variables', () => {
    const result = validateTemplate('Just plain text');
    expect(result.valid).toBe(true);
    expect(result.invalidVars).toEqual([]);
  });

  it('returns invalid for template with unknown variables', () => {
    const result = validateTemplate('{nombre} has {unknownVar} and {anotherBad}');
    expect(result.valid).toBe(false);
    expect(result.invalidVars).toContain('unknownVar');
    expect(result.invalidVars).toContain('anotherBad');
    expect(result.invalidVars).toHaveLength(2);
  });

  it('returns valid when all variables are known', () => {
    const result = validateTemplate('{nombre} {email} {telefono} {ciudad}');
    expect(result.valid).toBe(true);
  });

  it('handles empty template', () => {
    const result = validateTemplate('');
    expect(result.valid).toBe(true);
    expect(result.invalidVars).toEqual([]);
  });
});
