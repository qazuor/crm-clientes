/**
 * Multi-SDK AI Service
 * Unified interface for multiple AI providers: OpenAI, Gemini, Grok, DeepSeek
 */

import { ApiKeyService } from './api-key-service';
import { logger } from '@/lib/logger';
import type { AIProvider } from '@/types/enrichment';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

export interface AICompletionResult {
  content: string;
  provider: AIProvider;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Provider-specific API configurations
const PROVIDER_CONFIGS: Record<AIProvider, { baseUrl: string; authHeader: string }> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    authHeader: 'Authorization',
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    authHeader: 'x-goog-api-key',
  },
  grok: {
    baseUrl: 'https://api.x.ai/v1',
    authHeader: 'Authorization',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    authHeader: 'Authorization',
  },
};

/**
 * Call OpenAI-compatible API (OpenAI, Grok, DeepSeek)
 */
async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: AIMessage[],
  options: AICompletionOptions
): Promise<AICompletionResult & { provider: AIProvider }> {
  const requestBody = {
    model,
    messages,
    temperature: options.temperature ?? 0.3,
    top_p: options.topP ?? 0.9,
    max_tokens: options.maxTokens ?? 2000,
  };

  logger.debug('[AI-SDK] OpenAI-compatible request', {
    baseUrl,
    model,
    messageCount: messages.length,
    systemPromptLength: messages.find(m => m.role === 'system')?.content.length || 0,
    userPromptLength: messages.find(m => m.role === 'user')?.content.length || 0,
    temperature: requestBody.temperature,
    topP: requestBody.top_p,
    maxTokens: requestBody.max_tokens,
  });

  logger.debug('[AI-SDK] Full prompt being sent', {
    systemPrompt: messages.find(m => m.role === 'system')?.content.substring(0, 500) + '...',
    userPrompt: messages.find(m => m.role === 'user')?.content.substring(0, 1000) + '...',
  });

  const startTime = Date.now();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  const elapsed = Date.now() - startTime;

  if (!response.ok) {
    const error = await response.text();
    logger.error('[AI-SDK] OpenAI-compatible API error', new Error(error), {
      baseUrl,
      model,
      status: response.status,
      elapsed,
    });
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content ?? '';

  logger.debug('[AI-SDK] OpenAI-compatible response received', {
    model,
    elapsed,
    contentLength: content.length,
    promptTokens: data.usage?.prompt_tokens,
    completionTokens: data.usage?.completion_tokens,
    totalTokens: data.usage?.total_tokens,
    finishReason: data.choices[0]?.finish_reason,
  });

  logger.debug('[AI-SDK] Raw response content', {
    content: content.substring(0, 2000) + (content.length > 2000 ? '...[truncated]' : ''),
  });

  return {
    content,
    provider: 'openai' as AIProvider, // Will be overwritten by caller
    model,
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  };
}

/**
 * Call Google Gemini API
 */
async function callGemini(
  apiKey: string,
  model: string,
  messages: AIMessage[],
  options: AICompletionOptions
): Promise<AICompletionResult> {
  // Convert messages to Gemini format
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  // Add system instruction if present
  const systemMessage = messages.find(m => m.role === 'system');

  logger.debug('[AI-SDK] Gemini request', {
    model,
    messageCount: messages.length,
    systemPromptLength: systemMessage?.content.length || 0,
    userPromptLength: messages.find(m => m.role === 'user')?.content.length || 0,
    temperature: options.temperature ?? 0.3,
    topP: options.topP ?? 0.9,
    maxTokens: options.maxTokens ?? 2000,
  });

  logger.debug('[AI-SDK] Gemini full prompt', {
    systemPrompt: systemMessage?.content.substring(0, 500) + '...',
    userPrompt: messages.find(m => m.role === 'user')?.content.substring(0, 1000) + '...',
  });

  const startTime = Date.now();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
        generationConfig: {
          temperature: options.temperature ?? 0.3,
          topP: options.topP ?? 0.9,
          maxOutputTokens: options.maxTokens ?? 2000,
        },
      }),
    }
  );

  const elapsed = Date.now() - startTime;

  if (!response.ok) {
    const error = await response.text();
    logger.error('[AI-SDK] Gemini API error', new Error(error), {
      model,
      status: response.status,
      elapsed,
    });
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  logger.debug('[AI-SDK] Gemini response received', {
    model,
    elapsed,
    contentLength: content.length,
    promptTokens: data.usageMetadata?.promptTokenCount,
    completionTokens: data.usageMetadata?.candidatesTokenCount,
    totalTokens: data.usageMetadata?.totalTokenCount,
    finishReason: data.candidates?.[0]?.finishReason,
  });

  logger.debug('[AI-SDK] Gemini raw response content', {
    content: content.substring(0, 2000) + (content.length > 2000 ? '...[truncated]' : ''),
  });

  return {
    content,
    provider: 'gemini',
    model,
    usage: data.usageMetadata ? {
      promptTokens: data.usageMetadata.promptTokenCount ?? 0,
      completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
      totalTokens: data.usageMetadata.totalTokenCount ?? 0,
    } : undefined,
  };
}

/**
 * Multi-SDK AI Service class
 */
export class AISdkService {
  /**
   * Get all available (enabled) AI providers
   */
  static async getAvailableProviders(): Promise<AIProvider[]> {
    const keys = await ApiKeyService.getEnabledByCategory('ai');
    // When category is 'ai', all providers are AIProvider type
    return keys.map(k => k.provider as AIProvider);
  }

  /**
   * Call a specific AI provider
   */
  static async complete(
    provider: AIProvider,
    messages: AIMessage[],
    options: AICompletionOptions = {}
  ): Promise<AICompletionResult> {
    const apiKey = await ApiKeyService.getByProvider(provider);

    if (!apiKey || !apiKey.enabled) {
      throw new Error(`Provider ${provider} is not configured or disabled`);
    }

    const model = apiKey.model ?? this.getDefaultModel(provider);

    try {
      let result: AICompletionResult;

      switch (provider) {
        case 'openai':
          result = await callOpenAICompatible(
            PROVIDER_CONFIGS.openai.baseUrl,
            apiKey.apiKey,
            model,
            messages,
            options
          );
          break;

        case 'gemini':
          result = await callGemini(apiKey.apiKey, model, messages, options);
          break;

        case 'grok':
          result = await callOpenAICompatible(
            PROVIDER_CONFIGS.grok.baseUrl,
            apiKey.apiKey,
            model,
            messages,
            options
          );
          break;

        case 'deepseek':
          result = await callOpenAICompatible(
            PROVIDER_CONFIGS.deepseek.baseUrl,
            apiKey.apiKey,
            model,
            messages,
            options
          );
          break;

        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      // Mark the key as used
      await ApiKeyService.markUsed(provider);

      return {
        ...result,
        provider,
        model,
      };
    } catch (error) {
      console.error(`Error calling ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Call multiple providers and return all results
   */
  static async completeMultiple(
    providers: AIProvider[],
    messages: AIMessage[],
    options: AICompletionOptions = {}
  ): Promise<{ results: AICompletionResult[]; errors: { provider: AIProvider; error: string }[] }> {
    const results: AICompletionResult[] = [];
    const errors: { provider: AIProvider; error: string }[] = [];

    await Promise.all(
      providers.map(async (provider) => {
        try {
          const result = await this.complete(provider, messages, options);
          results.push(result);
        } catch (error) {
          errors.push({
            provider,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      })
    );

    return { results, errors };
  }

  /**
   * Get default model for a provider
   */
  private static getDefaultModel(provider: AIProvider): string {
    switch (provider) {
      case 'openai':
        return 'gpt-4o-mini';
      case 'gemini':
        return 'gemini-1.5-flash';
      case 'grok':
        return 'grok-beta';
      case 'deepseek':
        return 'deepseek-chat';
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Parse JSON from AI response (handles markdown code blocks)
   */
  static parseJsonResponse<T>(content: string): T | null {
    logger.debug('[AI-SDK] Parsing JSON response', {
      contentLength: content.length,
      startsWithBrace: content.trim().startsWith('{'),
      startsWithBracket: content.trim().startsWith('['),
      hasCodeBlock: content.includes('```'),
    });

    try {
      // Try direct parse first
      const result = JSON.parse(content);
      logger.debug('[AI-SDK] JSON parsed successfully (direct)', {
        resultType: typeof result,
        isArray: Array.isArray(result),
        keys: typeof result === 'object' && result !== null ? Object.keys(result) : [],
      });
      return result;
    } catch (directError) {
      logger.debug('[AI-SDK] Direct JSON parse failed, trying alternatives', {
        error: directError instanceof Error ? directError.message : 'Unknown',
      });

      // Try to extract JSON from markdown code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[1].trim());
          logger.debug('[AI-SDK] JSON parsed from markdown code block', {
            resultType: typeof result,
            keys: typeof result === 'object' && result !== null ? Object.keys(result) : [],
          });
          return result;
        } catch (codeBlockError) {
          logger.debug('[AI-SDK] Markdown code block parse failed', {
            error: codeBlockError instanceof Error ? codeBlockError.message : 'Unknown',
            extractedContent: jsonMatch[1].trim().substring(0, 200),
          });
        }
      }

      // Try to find JSON object/array in the content
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          const result = JSON.parse(objectMatch[0]);
          logger.debug('[AI-SDK] JSON parsed from object extraction', {
            resultType: typeof result,
            keys: typeof result === 'object' && result !== null ? Object.keys(result) : [],
          });
          return result;
        } catch (objectError) {
          logger.debug('[AI-SDK] Object extraction parse failed', {
            error: objectError instanceof Error ? objectError.message : 'Unknown',
          });
        }
      }

      const arrayMatch = content.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try {
          const result = JSON.parse(arrayMatch[0]);
          logger.debug('[AI-SDK] JSON parsed from array extraction', {
            resultType: typeof result,
            length: Array.isArray(result) ? result.length : 0,
          });
          return result;
        } catch (arrayError) {
          logger.debug('[AI-SDK] Array extraction parse failed', {
            error: arrayError instanceof Error ? arrayError.message : 'Unknown',
          });
        }
      }

      logger.warn('[AI-SDK] All JSON parse attempts failed', {
        contentPreview: content.substring(0, 500),
      });
      return null;
    }
  }
}
