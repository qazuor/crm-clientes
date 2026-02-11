/**
 * Type definitions for the AI Consensus Service enrichment results.
 */

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
