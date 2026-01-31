/**
 * AI Consensus Service
 * Combines results from multiple AI providers to get the most accurate data
 */

import { AISdkService, type AIMessage, type AICompletionOptions } from './ai-sdk-service';
import { SettingsService } from './settings-service';
import { logger } from '@/lib/logger';
import {
  getEnrichmentSystemPrompt,
  getEnrichmentPrompt,
  getConsensusPrompt,
  type ClientContext,
} from './enrichment-prompts';
import type { AIProvider } from '@/types/enrichment';

export interface EnrichmentFieldResult<T> {
  value: T | null;
  score: number;
  source: string;
  providers: AIProvider[];
  consensus: boolean;
}

export interface EnrichmentResult {
  website: EnrichmentFieldResult<string> | null;
  emails: EnrichmentFieldResult<Array<{ email: string; type: string }>> | null;
  phones: EnrichmentFieldResult<Array<{ number: string; type: string }>> | null;
  address: EnrichmentFieldResult<string> | null;
  description: EnrichmentFieldResult<string> | null;
  industry: EnrichmentFieldResult<string> | null;
  companySize: EnrichmentFieldResult<string> | null;
  socialProfiles: EnrichmentFieldResult<Record<string, string>> | null;
  providersUsed: AIProvider[];
  errors: Array<{ provider: AIProvider; error: string }>;
}

interface ProviderResult {
  provider: AIProvider;
  data: Record<string, { value: unknown; score: number; source?: string } | null>;
}

/**
 * Consensus Service for combining AI results
 */
export class ConsensusService {
  /**
   * Enrich a client using multiple AI providers
   */
  static async enrichClient(
    client: ClientContext,
    fieldsToEnrich?: string[]
  ): Promise<EnrichmentResult> {
    logger.info('[Consensus] Starting enrichment', {
      clientName: client.nombre,
      hasEmail: !!client.email,
      hasPhone: !!client.telefono,
      hasWebsite: !!client.sitioWeb,
      hasCiudad: !!client.ciudad,
      hasIndustria: !!client.industria,
    });

    // Get settings
    const settings = await SettingsService.getEnrichmentSettings();

    logger.debug('[Consensus] Enrichment settings', {
      matchMode: settings.matchMode,
      temperature: settings.temperature,
      topP: settings.topP,
      minConfidenceScore: settings.minConfidenceScore,
      requireVerification: settings.requireVerification,
    });

    // Get available providers
    const availableProviders = await AISdkService.getAvailableProviders();

    logger.info('[Consensus] Available AI providers', {
      providers: availableProviders,
      count: availableProviders.length,
    });

    if (availableProviders.length === 0) {
      logger.error('[Consensus] No AI providers configured');
      throw new Error('No AI providers configured. Please add API keys in Settings.');
    }

    // Default fields to enrich
    const fields = fieldsToEnrich ?? [
      'website',
      'emails',
      'phones',
      'address',
      'description',
      'industry',
      'companySize',
      'socialProfiles',
    ];

    logger.debug('[Consensus] Fields to enrich', { fields });

    // Build messages
    const systemPrompt = getEnrichmentSystemPrompt(settings.matchMode as 'exact' | 'fuzzy' | 'broad');
    const userPrompt = getEnrichmentPrompt(client, fields);

    logger.debug('[Consensus] Prompts generated', {
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
    });

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const options: AICompletionOptions = {
      temperature: settings.temperature,
      topP: settings.topP,
      maxTokens: 2000,
    };

    // Call all available providers
    logger.info('[Consensus] Calling all providers in parallel', {
      providers: availableProviders,
    });

    const startTime = Date.now();
    const { results, errors } = await AISdkService.completeMultiple(
      availableProviders,
      messages,
      options
    );
    const elapsed = Date.now() - startTime;

    logger.info('[Consensus] All providers responded', {
      elapsed,
      successCount: results.length,
      errorCount: errors.length,
      errors: errors.map(e => ({ provider: e.provider, error: e.error })),
    });

    // Parse results from each provider
    const providerResults: ProviderResult[] = [];

    for (const result of results) {
      logger.debug('[Consensus] Parsing result from provider', {
        provider: result.provider,
        model: result.model,
        contentLength: result.content.length,
        tokensUsed: result.usage?.totalTokens,
      });

      const parsed = AISdkService.parseJsonResponse<Record<string, { value: unknown; score: number; source?: string } | null>>(
        result.content
      );

      if (parsed) {
        logger.debug('[Consensus] Successfully parsed provider result', {
          provider: result.provider,
          fieldsFound: Object.keys(parsed).filter(k => parsed[k]?.value !== null),
        });
        providerResults.push({
          provider: result.provider,
          data: parsed,
        });
      } else {
        logger.warn('[Consensus] Failed to parse provider result', {
          provider: result.provider,
          contentPreview: result.content.substring(0, 300),
        });
        errors.push({
          provider: result.provider,
          error: 'Failed to parse response as JSON',
        });
      }
    }

    // Build consensus for each field
    const enrichmentResult: EnrichmentResult = {
      website: null,
      emails: null,
      phones: null,
      address: null,
      description: null,
      industry: null,
      companySize: null,
      socialProfiles: null,
      providersUsed: providerResults.map(r => r.provider),
      errors,
    };

    for (const field of fields) {
      const fieldResults = providerResults
        .filter(pr => pr.data[field] && pr.data[field]!.value !== null)
        .map(pr => ({
          provider: pr.provider,
          value: pr.data[field]!.value,
          score: pr.data[field]!.score,
          source: pr.data[field]!.source,
        }));

      if (fieldResults.length === 0) {
        logger.debug('[Consensus] No results for field', { field });
        continue;
      }

      logger.debug('[Consensus] Field results before filtering', {
        field,
        resultCount: fieldResults.length,
        scores: fieldResults.map(r => ({ provider: r.provider, score: r.score })),
      });

      // Apply minimum confidence filter
      const validResults = fieldResults.filter(r => r.score >= settings.minConfidenceScore);

      if (validResults.length === 0) {
        logger.debug('[Consensus] All results filtered out by minConfidence', {
          field,
          minConfidenceScore: settings.minConfidenceScore,
        });
        continue;
      }

      // Single provider or consensus
      if (validResults.length === 1 || !settings.requireVerification) {
        // Use the highest scoring result
        const best = validResults.reduce((a, b) => (a.score > b.score ? a : b));
        logger.debug('[Consensus] Using best single result', {
          field,
          provider: best.provider,
          score: best.score,
          valuePreview: typeof best.value === 'string' ? best.value.substring(0, 100) : JSON.stringify(best.value).substring(0, 100),
        });
        (enrichmentResult as unknown as Record<string, unknown>)[field] = {
          value: best.value,
          score: best.score,
          source: best.source || `From ${best.provider}`,
          providers: [best.provider],
          consensus: false,
        };
      } else {
        // Build consensus from multiple providers
        logger.debug('[Consensus] Building consensus from multiple providers', {
          field,
          providerCount: validResults.length,
          providers: validResults.map(r => r.provider),
        });
        const consensusResult = await this.buildConsensus(field, validResults, options);
        logger.debug('[Consensus] Consensus result', {
          field,
          score: consensusResult.score,
          hasConsensus: consensusResult.consensus,
        });
        (enrichmentResult as unknown as Record<string, unknown>)[field] = consensusResult;
      }
    }

    // Log final enrichment summary
    const enrichedFields = Object.entries(enrichmentResult)
      .filter(([k, v]) => v !== null && k !== 'providersUsed' && k !== 'errors')
      .map(([k]) => k);

    logger.info('[Consensus] Enrichment complete', {
      clientName: client.nombre,
      providersUsed: enrichmentResult.providersUsed,
      enrichedFields,
      errorCount: enrichmentResult.errors.length,
    });

    return enrichmentResult;
  }

  /**
   * Build consensus from multiple provider results
   */
  private static async buildConsensus(
    field: string,
    results: Array<{ provider: AIProvider; value: unknown; score: number; source?: string }>,
    options: AICompletionOptions
  ): Promise<EnrichmentFieldResult<unknown>> {
    // Check if all values match (for simple types)
    const stringValues = results.map(r => JSON.stringify(r.value));
    const allMatch = stringValues.every(v => v === stringValues[0]);

    if (allMatch) {
      // All providers agree - high confidence
      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
      return {
        value: results[0].value,
        score: Math.min(avgScore * 1.1, 1.0), // Bonus for consensus
        source: `Consensus from ${results.length} providers`,
        providers: results.map(r => r.provider),
        consensus: true,
      };
    }

    // Values differ - use AI to determine best value
    const availableProviders = await AISdkService.getAvailableProviders();

    if (availableProviders.length > 0) {
      try {
        const consensusPrompt = getConsensusPrompt(
          field,
          results.map(r => ({ value: r.value, score: r.score, provider: r.provider }))
        );

        const response = await AISdkService.complete(
          availableProviders[0],
          [
            { role: 'system', content: 'You are a data validation expert. Analyze the results and determine the most accurate value. All text content in your response (reasoning, descriptions) MUST be written in Spanish.' },
            { role: 'user', content: consensusPrompt },
          ],
          options
        );

        const parsed = AISdkService.parseJsonResponse<{
          bestValue: unknown;
          confidence: number;
          reasoning: string;
        }>(response.content);

        if (parsed) {
          return {
            value: parsed.bestValue,
            score: parsed.confidence,
            source: parsed.reasoning,
            providers: results.map(r => r.provider),
            consensus: true,
          };
        }
      } catch (error) {
        console.error('Consensus AI call failed:', error);
      }
    }

    // Fallback: use highest scoring result
    const best = results.reduce((a, b) => (a.score > b.score ? a : b));
    return {
      value: best.value,
      score: best.score * 0.9, // Penalty for no consensus
      source: `Best result from ${best.provider} (no consensus)`,
      providers: results.map(r => r.provider),
      consensus: false,
    };
  }

  /**
   * Quick enrichment with provider fallback
   * - If provider is specified: use only that provider, fail if it fails
   * - If provider is undefined (auto): try each available provider sequentially until one succeeds
   */
  static async quickEnrich(
    client: ClientContext,
    provider?: AIProvider
  ): Promise<Partial<EnrichmentResult>> {
    logger.info('[Consensus] Starting quick enrichment', {
      clientName: client.nombre,
      requestedProvider: provider || 'auto',
    });

    const settings = await SettingsService.getEnrichmentSettings();
    const availableProviders = await AISdkService.getAvailableProviders();

    if (availableProviders.length === 0) {
      logger.error('[Consensus] No AI providers available for quick enrich');
      throw new Error('No AI providers available');
    }

    const fields = ['website', 'emails', 'phones', 'description', 'industry'];
    const systemPrompt = getEnrichmentSystemPrompt(settings.matchMode as 'exact' | 'fuzzy' | 'broad');
    const userPrompt = getEnrichmentPrompt(client, fields);

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const options: AICompletionOptions = {
      temperature: settings.temperature,
      topP: settings.topP,
    };

    // Specific provider mode: validate and use only that provider
    if (provider) {
      if (!availableProviders.includes(provider)) {
        throw new Error(`Provider '${provider}' is not available. Available: ${availableProviders.join(', ')}`);
      }
      return this.executeQuickEnrich(provider, client, messages, options, fields, settings.minConfidenceScore);
    }

    // Auto mode: try each provider sequentially with fallback
    const providerErrors: Array<{ provider: AIProvider; error: string }> = [];

    for (const candidateProvider of availableProviders) {
      try {
        logger.info('[Consensus] Auto mode: trying provider', { provider: candidateProvider });
        return await this.executeQuickEnrich(candidateProvider, client, messages, options, fields, settings.minConfidenceScore);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.warn('[Consensus] Auto mode: provider failed, trying next', {
          provider: candidateProvider,
          error: errorMsg,
        });
        providerErrors.push({ provider: candidateProvider, error: errorMsg });
      }
    }

    // All providers failed
    const errorSummary = providerErrors
      .map(e => `${e.provider}: ${e.error}`)
      .join('; ');
    logger.error('[Consensus] Auto mode: all providers failed', undefined, { providerErrors });
    throw new Error(`All AI providers failed. ${errorSummary}`);
  }

  /**
   * Execute quick enrichment with a single provider
   */
  private static async executeQuickEnrich(
    selectedProvider: AIProvider,
    client: ClientContext,
    messages: AIMessage[],
    options: AICompletionOptions,
    fields: string[],
    minConfidenceScore: number
  ): Promise<Partial<EnrichmentResult>> {
    logger.debug('[Consensus] Quick enrich using provider', {
      provider: selectedProvider,
    });

    logger.debug('[Consensus] Quick enrich prompts', {
      systemPromptLength: messages[0]?.content.length || 0,
      userPromptLength: messages[1]?.content.length || 0,
      fields,
    });

    const startTime = Date.now();
    const result = await AISdkService.complete(selectedProvider, messages, options);
    const elapsed = Date.now() - startTime;

    logger.debug('[Consensus] Quick enrich response received', {
      provider: selectedProvider,
      elapsed,
      contentLength: result.content.length,
      tokensUsed: result.usage?.totalTokens,
    });

    const parsed = AISdkService.parseJsonResponse<Record<string, { value: unknown; score: number; source?: string } | null>>(
      result.content
    );

    if (!parsed) {
      logger.error('[Consensus] Failed to parse quick enrich response', undefined, {
        contentPreview: result.content.substring(0, 500),
      });
      throw new Error(`Failed to parse AI response from ${selectedProvider}`);
    }

    logger.debug('[Consensus] Quick enrich parsed result', {
      fieldsInResponse: Object.keys(parsed),
      fieldsWithValues: Object.keys(parsed).filter(k => parsed[k]?.value !== null),
    });

    const enrichmentResult: Partial<EnrichmentResult> = {
      providersUsed: [selectedProvider],
      errors: [],
    };

    for (const [field, data] of Object.entries(parsed)) {
      if (data && data.value !== null && data.score >= minConfidenceScore) {
        logger.debug('[Consensus] Quick enrich field accepted', {
          field,
          score: data.score,
          valuePreview: typeof data.value === 'string' ? data.value.substring(0, 100) : JSON.stringify(data.value).substring(0, 100),
        });
        (enrichmentResult as Record<string, unknown>)[field] = {
          value: data.value,
          score: data.score,
          source: data.source || `From ${selectedProvider}`,
          providers: [selectedProvider],
          consensus: false,
        };
      } else if (data && data.value !== null) {
        logger.debug('[Consensus] Quick enrich field rejected (low confidence)', {
          field,
          score: data.score,
          minRequired: minConfidenceScore,
        });
      }
    }

    const enrichedFields = Object.keys(enrichmentResult).filter(
      k => k !== 'providersUsed' && k !== 'errors'
    );

    logger.info('[Consensus] Quick enrichment complete', {
      clientName: client.nombre,
      provider: selectedProvider,
      elapsed,
      enrichedFields,
    });

    return enrichmentResult;
  }
}
