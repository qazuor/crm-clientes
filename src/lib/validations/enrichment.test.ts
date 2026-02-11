import { describe, expect, it } from 'vitest';
import {
  enrichmentPostSchema,
  enrichmentPatchSchema,
  quotaHistoryDaysSchema,
} from './enrichment';

describe('enrichmentPostSchema', () => {
  it('accepts empty object (all optional)', () => {
    const result = enrichmentPostSchema.parse({});
    expect(result).toEqual({});
  });

  it('accepts valid mode', () => {
    const result = enrichmentPostSchema.parse({ mode: 'ai' });
    expect(result.mode).toBe('ai');
  });

  it.each(['ai', 'web', 'full'])('accepts mode: %s', (mode) => {
    expect(enrichmentPostSchema.parse({ mode }).mode).toBe(mode);
  });

  it('rejects invalid mode', () => {
    expect(() => enrichmentPostSchema.parse({ mode: 'invalid' })).toThrow();
  });

  it('accepts quick flag', () => {
    const result = enrichmentPostSchema.parse({ quick: true });
    expect(result.quick).toBe(true);
  });

  it('accepts provider string', () => {
    const result = enrichmentPostSchema.parse({ provider: 'openai' });
    expect(result.provider).toBe('openai');
  });

  it('accepts confidenceThreshold within range', () => {
    const result = enrichmentPostSchema.parse({ confidenceThreshold: 0.8 });
    expect(result.confidenceThreshold).toBe(0.8);
  });

  it('rejects confidenceThreshold above 1', () => {
    expect(() =>
      enrichmentPostSchema.parse({ confidenceThreshold: 1.5 }),
    ).toThrow();
  });

  it('rejects confidenceThreshold below 0', () => {
    expect(() =>
      enrichmentPostSchema.parse({ confidenceThreshold: -0.1 }),
    ).toThrow();
  });

  it('accepts all options together', () => {
    const input = {
      mode: 'full' as const,
      fields: ['website', 'industry'],
      quick: false,
      provider: 'gemini',
      useExternalApis: true,
      verifyEmails: true,
      searchGoogleMaps: false,
      confidenceThreshold: 0.6,
    };
    const result = enrichmentPostSchema.parse(input);
    expect(result).toEqual(input);
  });
});

describe('enrichmentPatchSchema', () => {
  it('accepts valid confirm action', () => {
    const result = enrichmentPatchSchema.parse({
      action: 'confirm',
      fields: ['website'],
    });
    expect(result.action).toBe('confirm');
    expect(result.fields).toEqual(['website']);
  });

  it('accepts valid reject action', () => {
    const result = enrichmentPatchSchema.parse({
      action: 'reject',
      fields: ['industry', 'description'],
    });
    expect(result.action).toBe('reject');
  });

  it('accepts edit action with editedValues', () => {
    const result = enrichmentPatchSchema.parse({
      action: 'edit',
      fields: ['website'],
      editedValues: { website: 'https://new-site.com' },
    });
    expect(result.action).toBe('edit');
    expect(result.editedValues?.website).toBe('https://new-site.com');
  });

  it('rejects edit action without editedValues', () => {
    expect(() =>
      enrichmentPatchSchema.parse({
        action: 'edit',
        fields: ['website'],
      }),
    ).toThrow('editedValues');
  });

  it('rejects invalid action', () => {
    expect(() =>
      enrichmentPatchSchema.parse({
        action: 'invalid',
        fields: ['website'],
      }),
    ).toThrow();
  });

  it('rejects empty fields array', () => {
    expect(() =>
      enrichmentPatchSchema.parse({
        action: 'confirm',
        fields: [],
      }),
    ).toThrow('Se requiere una lista de campos');
  });

  it('rejects invalid field names', () => {
    expect(() =>
      enrichmentPatchSchema.parse({
        action: 'confirm',
        fields: ['invalidField'],
      }),
    ).toThrow('no son validos para revision');
  });

  it('accepts enrichmentId', () => {
    const result = enrichmentPatchSchema.parse({
      action: 'confirm',
      fields: ['website'],
      enrichmentId: 'enr-123',
    });
    expect(result.enrichmentId).toBe('enr-123');
  });
});

describe('quotaHistoryDaysSchema', () => {
  it('defaults to 7', () => {
    expect(quotaHistoryDaysSchema.parse(undefined)).toBe(7);
  });

  it('coerces string to number', () => {
    expect(quotaHistoryDaysSchema.parse('14')).toBe(14);
  });

  it('accepts valid day count', () => {
    expect(quotaHistoryDaysSchema.parse(30)).toBe(30);
  });

  it('rejects 0', () => {
    expect(() => quotaHistoryDaysSchema.parse(0)).toThrow();
  });

  it('rejects negative numbers', () => {
    expect(() => quotaHistoryDaysSchema.parse(-5)).toThrow();
  });

  it('rejects values above 30', () => {
    expect(() => quotaHistoryDaysSchema.parse(31)).toThrow();
  });
});
