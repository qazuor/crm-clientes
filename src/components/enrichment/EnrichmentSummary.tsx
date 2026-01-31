'use client';

import { useEnrichment } from '@/hooks/useEnrichment';
import { ConfidenceBadge } from './shared/ConfidenceBadge';
import { ProviderBadges } from './shared/ProviderBadges';
import type { FieldReviewStatus } from '@/types/enrichment';

const FIELD_LABELS: Record<string, string> = {
  website: 'Sitio Web',
  industry: 'Industria',
  description: 'Descripción',
  companySize: 'Tamaño de empresa',
  address: 'Dirección',
  emails: 'Emails',
  phones: 'Teléfonos',
  socialProfiles: 'Redes sociales',
};

const STATUS_STYLES: Record<FieldReviewStatus, string> = {
  PENDING: 'border-l-amber-400 bg-amber-50/50',
  CONFIRMED: 'border-l-green-400 bg-white',
  REJECTED: 'border-l-red-400 bg-red-50/30 opacity-60',
};

interface EnrichmentSummaryProps {
  clienteId: string;
  onEnrich?: () => void;
}

/**
 * Displays confirmed and pending enriched fields on the client detail page.
 */
export function EnrichmentSummary({ clienteId, onEnrich }: EnrichmentSummaryProps) {
  const { latestEnrichment, fieldStatuses, enrichmentStatus, isLoading } =
    useEnrichment(clienteId);

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-lg border border-gray-200 p-4">
        <div className="h-4 w-32 rounded bg-gray-200" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full rounded bg-gray-100" />
          <div className="h-3 w-3/4 rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!latestEnrichment || enrichmentStatus === 'NONE') {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
        <p className="text-sm text-gray-500">
          Este cliente no ha sido enriquecido con IA
        </p>
        {onEnrich && (
          <button
            type="button"
            onClick={onEnrich}
            className="mt-2 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            Enriquecer ahora
          </button>
        )}
      </div>
    );
  }

  const providers = latestEnrichment.aiProvidersUsed ?? [];
  const statuses = fieldStatuses ?? {};

  // Build field entries from enrichment data
  const fieldEntries: Array<{
    name: string;
    value: string;
    score: number | null;
    status: FieldReviewStatus;
  }> = [];

  const addField = (name: string, value: string | null | undefined, score: number | null | undefined) => {
    if (!value) return;
    fieldEntries.push({
      name,
      value,
      score: score ?? null,
      status: (statuses[name] as FieldReviewStatus) ?? 'PENDING',
    });
  };

  addField('website', latestEnrichment.website, latestEnrichment.websiteScore);
  addField('industry', latestEnrichment.industry, latestEnrichment.industryScore);
  addField('description', latestEnrichment.description, latestEnrichment.descriptionScore);
  addField('companySize', latestEnrichment.companySize, latestEnrichment.companySizeScore);
  addField('address', latestEnrichment.address, latestEnrichment.addressScore);

  return (
    <div className="rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Datos IA</h3>
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${
              enrichmentStatus === 'COMPLETE'
                ? 'bg-green-100 text-green-800'
                : enrichmentStatus === 'PENDING'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-blue-100 text-blue-800'
            }`}
          >
            {enrichmentStatus === 'COMPLETE'
              ? 'Completo'
              : enrichmentStatus === 'PENDING'
                ? 'Pendiente'
                : 'Parcial'}
          </span>
        </div>
        <ProviderBadges providers={providers} />
      </div>

      {/* Fields */}
      <div className="divide-y divide-gray-100">
        {fieldEntries.map((f) => (
          <div
            key={f.name}
            className={`flex items-start gap-3 border-l-4 px-4 py-3 ${STATUS_STYLES[f.status]}`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {FIELD_LABELS[f.name] ?? f.name}
                </span>
                {f.score != null && <ConfidenceBadge score={f.score} />}
              </div>
              <p className="mt-0.5 text-sm text-gray-900 line-clamp-2">{f.value}</p>
            </div>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                f.status === 'CONFIRMED'
                  ? 'text-green-700'
                  : f.status === 'REJECTED'
                    ? 'text-red-700'
                    : 'text-amber-700'
              }`}
            >
              {f.status === 'CONFIRMED'
                ? '✓'
                : f.status === 'REJECTED'
                  ? '✗'
                  : '?'}
            </span>
          </div>
        ))}
      </div>

      {/* Enrichment date */}
      {latestEnrichment.enrichedAt && (
        <div className="border-t border-gray-200 px-4 py-2 text-xs text-gray-400">
          Enriquecido:{' '}
          {new Date(latestEnrichment.enrichedAt).toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      )}
    </div>
  );
}
