/**
 * AI Prompts for Client Enrichment
 */

import type { MatchMode } from '@/types/enrichment';

export interface ClientContext {
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  industria?: string | null;
  sitioWeb?: string | null;
  notas?: string | null;
}

/**
 * Get the system prompt for enrichment
 */
export function getEnrichmentSystemPrompt(matchMode: MatchMode): string {
  const modeInstructions = {
    exact: `Use ONLY exact matches. Only include data you are highly confident about (>90% certainty).
            Do not make assumptions or guesses.`,
    fuzzy: `Use fuzzy matching. Include data with moderate confidence (>70% certainty).
            You may make reasonable inferences based on available information.`,
    broad: `Use broad matching. Include data with lower confidence (>50% certainty).
            Make educated guesses when direct information is not available.`,
  };

  return `You are a business data enrichment specialist. Your task is to find and verify information about companies and businesses.

IMPORTANT RULES:
1. ${modeInstructions[matchMode]}
2. Always return valid JSON in the exact format requested.
3. Include a confidence score (0.0 to 1.0) for each piece of information.
4. If you cannot find information, use null for the value.
5. For websites, always include the full URL with protocol (https://).
6. For social profiles, include the full profile URL (e.g. https://instagram.com/handle). Try to infer social media handles from the business name, domain, or common naming patterns. Most businesses have at least Instagram or Facebook.
7. Be specific and accurate - quality over quantity.
8. Cite your reasoning in the "source" field when applicable.
9. ALL text values in the response (descriptions, industry names, sources, reasoning) MUST be written in Spanish. Do not use English for any text content.

RESPONSE FORMAT:
Always respond with valid JSON only. No explanations outside the JSON.`;
}

/**
 * Get the enrichment prompt for a client
 */
export function getEnrichmentPrompt(client: ClientContext, fieldsToEnrich: string[]): string {
  const clientInfo = [
    `Company/Business Name: ${client.nombre}`,
    client.email && `Known Email: ${client.email}`,
    client.telefono && `Known Phone: ${client.telefono}`,
    client.direccion && `Known Address: ${client.direccion}`,
    client.ciudad && `City: ${client.ciudad}`,
    client.industria && `Industry: ${client.industria}`,
    client.sitioWeb && `Known Website: ${client.sitioWeb}`,
    client.notas && `Notes: ${client.notas}`,
  ].filter(Boolean).join('\n');

  const fieldsDescription: Record<string, string> = {
    website: 'Official website URL',
    emails: 'Contact email addresses (array of objects with email and type: general, sales, support, etc.)',
    phones: 'Phone numbers (array of objects with number and type: main, mobile, fax, etc.)',
    address: 'Full business address',
    description: 'Brief company description (2-3 sentences)',
    industry: 'Industry/sector classification',
    companySize: 'Company size (startup, small, medium, large, enterprise)',
    socialProfiles: 'Social media profile URLs. Look for: instagram, facebook, linkedin, twitter (x.com), youtube, tiktok. Return as object with platform names as keys and full profile URLs as values. Infer handles from the business name, website domain, or known patterns (e.g. instagram.com/{businessname}). Include only profiles you believe exist.',
  };

  const requestedFields = fieldsToEnrich
    .map(f => `- ${f}: ${fieldsDescription[f] || f}`)
    .join('\n');

  return `Find and verify information about this business (likely based in Argentina or Latin America):

${clientInfo}

Please find the following information:
${requestedFields}

IMPORTANT:
- All text content (descriptions, industry names, source/reasoning explanations) MUST be written in Spanish.
- For social profiles, try common patterns: instagram.com/{name}, facebook.com/{name}, linkedin.com/company/{name}. Use the business name or website domain as hints for handles.

Respond with a JSON object containing:
{
  "website": { "value": "https://...", "score": 0.95, "source": "razonamiento" } | null,
  "emails": { "value": [{"email": "...", "type": "..."}], "score": 0.8, "source": "razonamiento" } | null,
  "phones": { "value": [{"number": "...", "type": "..."}], "score": 0.7, "source": "razonamiento" } | null,
  "address": { "value": "direccion completa", "score": 0.85, "source": "razonamiento" } | null,
  "description": { "value": "descripcion en espanol", "score": 0.9, "source": "razonamiento" } | null,
  "industry": { "value": "industria en espanol", "score": 0.88, "source": "razonamiento" } | null,
  "companySize": { "value": "pequena|mediana|grande|enterprise", "score": 0.75, "source": "razonamiento" } | null,
  "socialProfiles": { "value": {"linkedin": "url", "facebook": "url", ...}, "score": 0.82, "source": "razonamiento" } | null
}

Only include fields that were requested. Use null for fields you cannot find with confidence.`;
}

/**
 * Get prompt for URL verification
 */
export function getUrlVerificationPrompt(url: string, companyName: string): string {
  return `Verify if this URL belongs to the company "${companyName}":

URL: ${url}

IMPORTANT: Write the "reasoning" field in Spanish.

Analyze and respond with JSON:
{
  "isValid": true/false,
  "isOfficial": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "explicacion en espanol",
  "alternativeUrl": "correct URL if different" | null
}`;
}

/**
 * Get prompt for data consensus
 */
export function getConsensusPrompt(
  field: string,
  results: Array<{ value: unknown; score: number; provider: string }>
): string {
  const resultsText = results
    .map((r, i) => `Result ${i + 1} (${r.provider}, confidence ${r.score}): ${JSON.stringify(r.value)}`)
    .join('\n');

  return `Multiple AI providers returned different results for "${field}". Analyze and determine the best value:

${resultsText}

IMPORTANT: Write the "reasoning" field in Spanish.

Respond with JSON:
{
  "bestValue": <the most accurate value>,
  "confidence": 0.0-1.0,
  "reasoning": "razon por la cual se eligio este valor",
  "allValuesMatch": true/false
}`;
}
