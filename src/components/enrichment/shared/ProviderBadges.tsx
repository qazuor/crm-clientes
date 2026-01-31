'use client';

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  gemini: 'Gemini',
  grok: 'Grok',
  deepseek: 'DeepSeek',
};

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-emerald-100 text-emerald-800',
  gemini: 'bg-blue-100 text-blue-800',
  grok: 'bg-purple-100 text-purple-800',
  deepseek: 'bg-cyan-100 text-cyan-800',
};

interface ProviderBadgesProps {
  providers: string[];
}

/**
 * Displays badges for each AI provider that contributed to the enrichment.
 */
export function ProviderBadges({ providers }: ProviderBadgesProps) {
  if (!providers || providers.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {providers.map((provider) => (
        <span
          key={provider}
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
            PROVIDER_COLORS[provider] ?? 'bg-gray-100 text-gray-700'
          }`}
        >
          {PROVIDER_LABELS[provider] ?? provider}
        </span>
      ))}
    </div>
  );
}
