import { describe, expect, it } from 'vitest';
import {
  matchModeSchema,
  enrichmentSettingsSchema,
  DEFAULT_ENRICHMENT_SETTINGS,
} from './enrichment-settings';

describe('matchModeSchema', () => {
  it.each(['exact', 'fuzzy', 'broad'])('accepts valid mode: %s', (mode) => {
    expect(matchModeSchema.parse(mode)).toBe(mode);
  });

  it('rejects invalid mode', () => {
    expect(() => matchModeSchema.parse('invalid')).toThrow();
  });
});

describe('enrichmentSettingsSchema', () => {
  it('accepts valid full settings', () => {
    const result = enrichmentSettingsSchema.parse({
      temperature: 0.5,
      topP: 0.8,
      matchMode: 'fuzzy',
      minConfidenceScore: 0.7,
      requireVerification: true,
      maxResultsPerField: 3,
      enableScreenshots: true,
      enablePageSpeed: false,
    });
    expect(result.temperature).toBe(0.5);
    expect(result.matchMode).toBe('fuzzy');
    expect(result.enablePageSpeed).toBe(false);
  });

  it('accepts empty object (all optional)', () => {
    const result = enrichmentSettingsSchema.parse({});
    expect(result).toEqual({});
  });

  it('rejects temperature below 0', () => {
    expect(() =>
      enrichmentSettingsSchema.parse({ temperature: -1 }),
    ).toThrow('al menos 0');
  });

  it('rejects temperature above 2', () => {
    expect(() =>
      enrichmentSettingsSchema.parse({ temperature: 3 }),
    ).toThrow('mayor a 2');
  });

  it('rejects topP below 0', () => {
    expect(() =>
      enrichmentSettingsSchema.parse({ topP: -0.1 }),
    ).toThrow('al menos 0');
  });

  it('rejects topP above 1', () => {
    expect(() =>
      enrichmentSettingsSchema.parse({ topP: 1.5 }),
    ).toThrow('mayor a 1');
  });

  it('rejects minConfidenceScore above 1', () => {
    expect(() =>
      enrichmentSettingsSchema.parse({ minConfidenceScore: 2 }),
    ).toThrow();
  });

  it('rejects maxResultsPerField below 1', () => {
    expect(() =>
      enrichmentSettingsSchema.parse({ maxResultsPerField: 0 }),
    ).toThrow('al menos 1');
  });

  it('rejects maxResultsPerField above 10', () => {
    expect(() =>
      enrichmentSettingsSchema.parse({ maxResultsPerField: 11 }),
    ).toThrow('Máximo 10');
  });

  it('rejects non-integer maxResultsPerField', () => {
    expect(() =>
      enrichmentSettingsSchema.parse({ maxResultsPerField: 2.5 }),
    ).toThrow();
  });
});

describe('DEFAULT_ENRICHMENT_SETTINGS', () => {
  it('has all required fields', () => {
    expect(DEFAULT_ENRICHMENT_SETTINGS.temperature).toBe(0.3);
    expect(DEFAULT_ENRICHMENT_SETTINGS.topP).toBe(0.9);
    expect(DEFAULT_ENRICHMENT_SETTINGS.matchMode).toBe('fuzzy');
    expect(DEFAULT_ENRICHMENT_SETTINGS.minConfidenceScore).toBe(0.7);
    expect(DEFAULT_ENRICHMENT_SETTINGS.requireVerification).toBe(true);
    expect(DEFAULT_ENRICHMENT_SETTINGS.maxResultsPerField).toBe(3);
  });

  it('has all website analysis flags enabled', () => {
    expect(DEFAULT_ENRICHMENT_SETTINGS.enableScreenshots).toBe(true);
    expect(DEFAULT_ENRICHMENT_SETTINGS.enablePageSpeed).toBe(true);
    expect(DEFAULT_ENRICHMENT_SETTINGS.enableSsl).toBe(true);
    expect(DEFAULT_ENRICHMENT_SETTINGS.enableTechStack).toBe(true);
    expect(DEFAULT_ENRICHMENT_SETTINGS.enableSeo).toBe(true);
    expect(DEFAULT_ENRICHMENT_SETTINGS.enableAccessibility).toBe(true);
    expect(DEFAULT_ENRICHMENT_SETTINGS.enableSecurity).toBe(true);
    expect(DEFAULT_ENRICHMENT_SETTINGS.enableCrawlability).toBe(true);
  });

  it('validates against schema', () => {
    const result = enrichmentSettingsSchema.parse(DEFAULT_ENRICHMENT_SETTINGS);
    expect(result).toEqual(DEFAULT_ENRICHMENT_SETTINGS);
  });
});
