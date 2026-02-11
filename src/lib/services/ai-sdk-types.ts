/**
 * Type definitions for the Multi-SDK AI Service.
 */

import type { AIProvider } from '@/types/enrichment';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  /** Timeout in milliseconds for the AI provider call. Default: 30000 (30s) */
  timeoutMs?: number;
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
