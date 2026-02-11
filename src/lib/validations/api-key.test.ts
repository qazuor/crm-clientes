import { describe, expect, it } from 'vitest';
import { createApiKeySchema, updateApiKeySchema, isValidModelForProvider } from './api-key';

describe('createApiKeySchema', () => {
  it('accepts valid AI provider with model', () => {
    const result = createApiKeySchema.parse({
      provider: 'openai',
      apiKey: 'sk-1234567890',
      model: 'gpt-4o',
    });
    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-4o');
    expect(result.enabled).toBe(true);
  });

  it('accepts valid external provider without model', () => {
    const result = createApiKeySchema.parse({
      provider: 'hunter_io',
      apiKey: 'abcdef1234567890',
    });
    expect(result.provider).toBe('hunter_io');
  });

  it('rejects invalid provider', () => {
    expect(() =>
      createApiKeySchema.parse({
        provider: 'invalid-provider',
        apiKey: 'sk-1234567890',
      }),
    ).toThrow('Proveedor no valido');
  });

  it('rejects short API key', () => {
    expect(() =>
      createApiKeySchema.parse({
        provider: 'hunter_io',
        apiKey: 'short',
      }),
    ).toThrow('al menos 10 caracteres');
  });

  it('rejects AI provider without model', () => {
    expect(() =>
      createApiKeySchema.parse({
        provider: 'openai',
        apiKey: 'sk-1234567890',
      }),
    ).toThrow('requieren seleccionar un modelo');
  });

  it('rejects AI provider with invalid model', () => {
    expect(() =>
      createApiKeySchema.parse({
        provider: 'openai',
        apiKey: 'sk-1234567890',
        model: 'invalid-model',
      }),
    ).toThrow('requieren seleccionar un modelo');
  });

  it('defaults enabled to true', () => {
    const result = createApiKeySchema.parse({
      provider: 'hunter_io',
      apiKey: 'abcdef1234567890',
    });
    expect(result.enabled).toBe(true);
  });

  it('accepts explicit enabled false', () => {
    const result = createApiKeySchema.parse({
      provider: 'hunter_io',
      apiKey: 'abcdef1234567890',
      enabled: false,
    });
    expect(result.enabled).toBe(false);
  });
});

describe('updateApiKeySchema', () => {
  it('accepts partial update with only apiKey', () => {
    const result = updateApiKeySchema.parse({ apiKey: 'new-api-key-1234' });
    expect(result.apiKey).toBe('new-api-key-1234');
  });

  it('accepts partial update with only enabled', () => {
    const result = updateApiKeySchema.parse({ enabled: false });
    expect(result.enabled).toBe(false);
  });

  it('accepts empty object', () => {
    const result = updateApiKeySchema.parse({});
    expect(result).toEqual({});
  });

  it('rejects short apiKey', () => {
    expect(() => updateApiKeySchema.parse({ apiKey: 'short' })).toThrow('al menos 10 caracteres');
  });
});

describe('isValidModelForProvider', () => {
  it('returns true for valid AI provider model', () => {
    expect(isValidModelForProvider('openai', 'gpt-4o')).toBe(true);
  });

  it('returns false for invalid AI provider model', () => {
    expect(isValidModelForProvider('openai', 'invalid')).toBe(false);
  });

  it('returns true for external provider (no model needed)', () => {
    expect(isValidModelForProvider('hunter_io', 'anything')).toBe(true);
  });
});
