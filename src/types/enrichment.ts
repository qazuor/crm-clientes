// Types for the enrichment system

// API Key Providers
export type AIProvider = 'openai' | 'gemini' | 'grok' | 'deepseek';

// Only external providers that are actually implemented and need API keys
export type ExternalProvider =
  | 'hunter_io'           // Email discovery - implemented
  | 'builtwith'           // Tech stack detection - implemented (optional, has free tier)
  | 'serpapi'             // Google search - implemented
  | 'google_places'       // Business info - implemented
  | 'google_safe_browsing' // Website safety check - implemented
  | 'whoisxml';           // Domain info - implemented (500/mes gratis)
// Note: ipapi, security_headers, and favicon don't need API keys - used internally

export type ApiKeyProvider = AIProvider | ExternalProvider;

// AI Provider Models
export const AI_PROVIDER_MODELS: Record<AIProvider, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  gemini: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'],
  grok: ['grok-beta', 'grok-2'],
  deepseek: ['deepseek-chat', 'deepseek-coder'],
};

// Provider Display Info - only providers that need API keys
export const PROVIDER_INFO: Record<ApiKeyProvider, { name: string; description: string; category: 'ai' | 'external' }> = {
  // AI Providers - for client enrichment
  openai: { name: 'OpenAI', description: 'Modelos GPT para enriquecimiento con IA', category: 'ai' },
  gemini: { name: 'Google Gemini', description: 'Modelos Gemini para enriquecimiento con IA', category: 'ai' },
  grok: { name: 'xAI Grok', description: 'Modelos Grok para enriquecimiento con IA', category: 'ai' },
  deepseek: { name: 'DeepSeek', description: 'Modelos DeepSeek para enriquecimiento con IA', category: 'ai' },
  // External APIs - optional, for additional data
  hunter_io: { name: 'Hunter.io', description: 'Descubrimiento y verificacion de emails (25 busquedas/mes gratis)', category: 'external' },
  builtwith: { name: 'BuiltWith', description: 'Deteccion de tecnologias (opcional, funciona sin key)', category: 'external' },
  serpapi: { name: 'SerpAPI', description: 'Busqueda Google y redes sociales (100 busquedas/mes gratis)', category: 'external' },
  google_places: { name: 'Google Places', description: 'Info de negocios: direccion, telefono, horarios, reseñas', category: 'external' },
  google_safe_browsing: { name: 'Google Safe Browsing', description: 'Verificacion de seguridad de sitios web', category: 'external' },
  whoisxml: { name: 'WhoisXML', description: 'Info de dominio: propietario, registro, expiracion (500/mes gratis)', category: 'external' },
};
// Note: IP-API, Security Headers, and Favicon services are FREE and don't require API keys
// They are used internally by the website analysis service

// Note: Screenshots and PageSpeed use free public APIs that don't require keys

// API Key interfaces
export interface ApiKey {
  id: string;
  provider: ApiKeyProvider;
  apiKey: string; // Masked when returned to client
  model: string | null;
  enabled: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApiKeyDTO {
  provider: ApiKeyProvider;
  apiKey: string;
  model?: string;
  enabled?: boolean;
}

export interface UpdateApiKeyDTO {
  apiKey?: string;
  model?: string;
  enabled?: boolean;
}

// Enrichment Settings
export type MatchMode = 'exact' | 'fuzzy' | 'broad';

export interface EnrichmentSettings {
  id: string;
  // AI Parameters
  temperature: number;
  topP: number;
  matchMode: MatchMode;
  minConfidenceScore: number;
  requireVerification: boolean;
  maxResultsPerField: number;
  // Website Analysis Toggles
  enableScreenshots: boolean;
  enablePageSpeed: boolean;
  enableSsl: boolean;
  enableTechStack: boolean;
  enableSeo: boolean;
  enableAccessibility: boolean;
  enableSecurity: boolean;
  enableCrawlability: boolean;
  updatedAt: Date;
}

export interface UpdateEnrichmentSettingsDTO {
  temperature?: number;
  topP?: number;
  matchMode?: MatchMode;
  minConfidenceScore?: number;
  requireVerification?: boolean;
  maxResultsPerField?: number;
  enableScreenshots?: boolean;
  enablePageSpeed?: boolean;
  enableSsl?: boolean;
  enableTechStack?: boolean;
  enableSeo?: boolean;
  enableAccessibility?: boolean;
  enableSecurity?: boolean;
  enableCrawlability?: boolean;
}

// Quota with extended fields
export interface QuotaExtended {
  id: string;
  service: string;
  used: number;
  limit: number;
  lastReset: Date;
  updatedAt: Date;
  successCount: number;
  errorCount: number;
  lastError: string | null;
  lastErrorAt: Date | null;
}

// Enrichment review status (per-record, for ClienteEnrichment.status)
export type EnrichmentStatus = 'PENDING' | 'CONFIRMED';

// Enrichment status for Cliente model (overall status)
export type EnrichmentStatusEnum = 'NONE' | 'PENDING' | 'PARTIAL' | 'COMPLETE';

// Enrichment mode for API calls
export type EnrichmentMode = 'ai' | 'web';

// Per-field review status
export type FieldReviewStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

// Per-field review action (includes edit)
export type FieldReviewAction = 'confirm' | 'reject' | 'edit';

// Fields that can be reviewed individually
export const REVIEWABLE_FIELDS = [
  'website',
  'industry',
  'description',
  'companySize',
  'address',
  'emails',
  'phones',
  'socialProfiles',
] as const;

export type ReviewableField = (typeof REVIEWABLE_FIELDS)[number];

// Client Enrichment Data
export interface ScoredValue<T> {
  value: T;
  score: number;
  source?: string;
}

export interface ClienteEnrichmentData {
  id: string;
  clienteId: string;
  website: string | null;
  websiteScore: number | null;
  emails: ScoredValue<string>[] | null;
  phones: ScoredValue<string>[] | null;
  address: string | null;
  addressScore: number | null;
  description: string | null;
  descriptionScore: number | null;
  industry: string | null;
  industryScore: number | null;
  companySize: string | null;
  companySizeScore: number | null;
  socialProfiles: Record<string, string> | null;
  aiProvidersUsed: string[] | null;
  enrichedAt: Date | null;
  fieldStatuses: Record<string, FieldReviewStatus> | null;
  status: EnrichmentStatus;
  reviewedAt: Date | null;
  reviewedBy: string | null;
}

// Website Analysis Data
export interface WebsiteAnalysisData {
  id: string;
  clienteId: string;
  url: string;
  // SSL
  sslValid: boolean | null;
  sslIssuer: string | null;
  sslExpiresAt: Date | null;
  sslProtocol: string | null;
  // Performance
  performanceScore: number | null;
  fcpMs: number | null;
  lcpMs: number | null;
  ttiMs: number | null;
  cls: number | null;
  mobileScore: number | null;
  desktopScore: number | null;
  // Responsive
  hasViewportMeta: boolean | null;
  breakpoints: string[] | null;
  mediaQueriesCount: number | null;
  // Tech Stack
  techStack: TechStackItem[] | null;
  // SEO
  seoTitle: string | null;
  seoDescription: string | null;
  seoH1Count: number | null;
  seoHasCanonical: boolean | null;
  seoIndexable: boolean | null;
  // Structured Data
  hasJsonLd: boolean | null;
  jsonLdTypes: string[] | null;
  hasOpenGraph: boolean | null;
  openGraphData: Record<string, string> | null;
  hasTwitterCards: boolean | null;
  // Accessibility
  accessibilityScore: number | null;
  accessibilityIssues: AccessibilityIssue[] | null;
  // Security
  hasHttps: boolean | null;
  hstsEnabled: boolean | null;
  xFrameOptions: string | null;
  hasCsp: boolean | null;
  isSafeBrowsing: boolean | null;
  // Crawlability
  hasRobotsTxt: boolean | null;
  robotsAllowsIndex: boolean | null;
  hasSitemap: boolean | null;
  sitemapUrl: string | null;
  sitemapUrlCount: number | null;
  // Server
  serverLocation: string | null;
  serverIp: string | null;
  // Screenshots
  screenshotDesktop: string | null;
  screenshotMobile: string | null;
  // Metadata
  apisUsed: string[] | null;
  analyzedAt: Date | null;
}

export interface TechStackItem {
  name: string;
  category: string;
  version?: string;
  confidence?: number;
}

export interface AccessibilityIssue {
  type: string;
  description: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  count?: number;
}

// Enrichment options for triggering enrichment from the modal
export interface EnrichmentOptions {
  mode: EnrichmentMode;
  provider?: AIProvider | 'auto';
  quick?: boolean;
  confidenceThreshold?: number;
  useExternalApis?: boolean;
  verifyEmails?: boolean;
  searchGoogleMaps?: boolean;
}

// Bulk enrichment options
export interface BulkEnrichmentOptions {
  clienteIds: string[];
  includeAI?: boolean;
  includeWebsiteAnalysis?: boolean;
  provider?: AIProvider | 'auto';
  confidenceThreshold?: number;
}

// History entry for enrichment timeline
export interface EnrichmentHistoryEntry {
  id: string;
  type: 'ai' | 'web';
  enrichedAt: Date;
  providers: string[];
  fieldsFound: number;
  fieldsConfirmed: number;
  fieldsRejected: number;
  status: EnrichmentStatus;
}

// GET /api/clientes/[id]/enrich response
export interface EnrichmentGetResponse {
  latestEnrichment: ClienteEnrichmentData | null;
  websiteAnalysis: WebsiteAnalysisData | null;
  history: EnrichmentHistoryEntry[];
  enrichmentStatus: EnrichmentStatusEnum;
}

// PATCH /api/clientes/[id]/enrich request body
export interface EnrichmentPatchRequest {
  action: FieldReviewAction;
  fields: string[];
  editedValues?: Record<string, unknown>;
  enrichmentId?: string;
}

// Cooldown info
export interface CooldownInfo {
  shouldWarn: boolean;
  lastEnrichedAt: Date | null;
  hoursAgo: number | null;
}

// API Response types
export interface ApiKeyResponse extends Omit<ApiKey, 'apiKey'> {
  maskedKey: string;
}
