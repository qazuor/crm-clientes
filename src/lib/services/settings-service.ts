import { prisma } from '@/lib/prisma';
import type { EnrichmentSettings, UpdateEnrichmentSettingsDTO } from '@/types/enrichment';
import { DEFAULT_ENRICHMENT_SETTINGS } from '@/lib/validations/enrichment-settings';

const SETTINGS_ID = 'default';

/**
 * Service for managing enrichment settings (singleton pattern)
 */
export class SettingsService {
  /**
   * Get enrichment settings (creates with defaults if not exists)
   */
  static async getEnrichmentSettings(): Promise<EnrichmentSettings> {
    let settings = await prisma.enrichmentSettings.findUnique({
      where: { id: SETTINGS_ID },
    });

    if (!settings) {
      // Create with defaults
      settings = await prisma.enrichmentSettings.create({
        data: {
          id: SETTINGS_ID,
          ...DEFAULT_ENRICHMENT_SETTINGS,
        },
      });
    }

    return {
      id: settings.id,
      temperature: settings.temperature,
      topP: settings.topP,
      matchMode: settings.matchMode as 'exact' | 'fuzzy' | 'broad',
      minConfidenceScore: settings.minConfidenceScore,
      requireVerification: settings.requireVerification,
      maxResultsPerField: settings.maxResultsPerField,
      enableScreenshots: settings.enableScreenshots,
      enablePageSpeed: settings.enablePageSpeed,
      enableSsl: settings.enableSsl,
      enableTechStack: settings.enableTechStack,
      enableSeo: settings.enableSeo,
      enableAccessibility: settings.enableAccessibility,
      enableSecurity: settings.enableSecurity,
      enableCrawlability: settings.enableCrawlability,
      updatedAt: settings.updatedAt,
    };
  }

  /**
   * Update enrichment settings
   */
  static async updateEnrichmentSettings(
    data: UpdateEnrichmentSettingsDTO
  ): Promise<EnrichmentSettings> {
    // Ensure settings exist first
    await this.getEnrichmentSettings();

    const settings = await prisma.enrichmentSettings.update({
      where: { id: SETTINGS_ID },
      data: {
        ...(data.temperature !== undefined && { temperature: data.temperature }),
        ...(data.topP !== undefined && { topP: data.topP }),
        ...(data.matchMode !== undefined && { matchMode: data.matchMode }),
        ...(data.minConfidenceScore !== undefined && {
          minConfidenceScore: data.minConfidenceScore,
        }),
        ...(data.requireVerification !== undefined && {
          requireVerification: data.requireVerification,
        }),
        ...(data.maxResultsPerField !== undefined && {
          maxResultsPerField: data.maxResultsPerField,
        }),
        ...(data.enableScreenshots !== undefined && {
          enableScreenshots: data.enableScreenshots,
        }),
        ...(data.enablePageSpeed !== undefined && {
          enablePageSpeed: data.enablePageSpeed,
        }),
        ...(data.enableSsl !== undefined && { enableSsl: data.enableSsl }),
        ...(data.enableTechStack !== undefined && {
          enableTechStack: data.enableTechStack,
        }),
        ...(data.enableSeo !== undefined && { enableSeo: data.enableSeo }),
        ...(data.enableAccessibility !== undefined && {
          enableAccessibility: data.enableAccessibility,
        }),
        ...(data.enableSecurity !== undefined && {
          enableSecurity: data.enableSecurity,
        }),
        ...(data.enableCrawlability !== undefined && {
          enableCrawlability: data.enableCrawlability,
        }),
      },
    });

    return {
      id: settings.id,
      temperature: settings.temperature,
      topP: settings.topP,
      matchMode: settings.matchMode as 'exact' | 'fuzzy' | 'broad',
      minConfidenceScore: settings.minConfidenceScore,
      requireVerification: settings.requireVerification,
      maxResultsPerField: settings.maxResultsPerField,
      enableScreenshots: settings.enableScreenshots,
      enablePageSpeed: settings.enablePageSpeed,
      enableSsl: settings.enableSsl,
      enableTechStack: settings.enableTechStack,
      enableSeo: settings.enableSeo,
      enableAccessibility: settings.enableAccessibility,
      enableSecurity: settings.enableSecurity,
      enableCrawlability: settings.enableCrawlability,
      updatedAt: settings.updatedAt,
    };
  }

  /**
   * Reset enrichment settings to defaults
   */
  static async resetEnrichmentSettings(): Promise<EnrichmentSettings> {
    const settings = await prisma.enrichmentSettings.upsert({
      where: { id: SETTINGS_ID },
      update: DEFAULT_ENRICHMENT_SETTINGS,
      create: {
        id: SETTINGS_ID,
        ...DEFAULT_ENRICHMENT_SETTINGS,
      },
    });

    return {
      id: settings.id,
      temperature: settings.temperature,
      topP: settings.topP,
      matchMode: settings.matchMode as 'exact' | 'fuzzy' | 'broad',
      minConfidenceScore: settings.minConfidenceScore,
      requireVerification: settings.requireVerification,
      maxResultsPerField: settings.maxResultsPerField,
      enableScreenshots: settings.enableScreenshots,
      enablePageSpeed: settings.enablePageSpeed,
      enableSsl: settings.enableSsl,
      enableTechStack: settings.enableTechStack,
      enableSeo: settings.enableSeo,
      enableAccessibility: settings.enableAccessibility,
      enableSecurity: settings.enableSecurity,
      enableCrawlability: settings.enableCrawlability,
      updatedAt: settings.updatedAt,
    };
  }

  /**
   * Get specific setting value
   */
  static async getSetting<K extends keyof EnrichmentSettings>(
    key: K
  ): Promise<EnrichmentSettings[K]> {
    const settings = await this.getEnrichmentSettings();
    return settings[key];
  }

  /**
   * Check if a specific analysis is enabled
   */
  static async isAnalysisEnabled(
    analysis:
      | 'screenshots'
      | 'pageSpeed'
      | 'ssl'
      | 'techStack'
      | 'seo'
      | 'accessibility'
      | 'security'
      | 'crawlability'
  ): Promise<boolean> {
    const settings = await this.getEnrichmentSettings();
    const key = `enable${analysis.charAt(0).toUpperCase()}${analysis.slice(1)}` as keyof EnrichmentSettings;
    return settings[key] as boolean;
  }
}
