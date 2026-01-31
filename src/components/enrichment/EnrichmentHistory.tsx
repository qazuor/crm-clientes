'use client';

import { useEnrichment } from '@/hooks/useEnrichment';
import { ProviderBadges } from './shared/ProviderBadges';

interface EnrichmentHistoryProps {
  clienteId: string;
}

/**
 * Shows enrichment history timeline for a client.
 */
export function EnrichmentHistory({ clienteId }: EnrichmentHistoryProps) {
  const { history, isLoading } = useEnrichment(clienteId);

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-lg border border-gray-200 p-4">
        <div className="h-4 w-32 rounded bg-gray-200" />
        <div className="mt-3 space-y-3">
          <div className="h-12 rounded bg-gray-100" />
          <div className="h-12 rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Historial de Enriquecimiento ({history.length})
        </h3>
      </div>

      <div className="divide-y divide-gray-100">
        {history.map((entry, idx) => {
          const isLatest = idx === 0;
          const date = new Date(entry.enrichedAt);

          return (
            <div
              key={entry.id}
              className={`flex items-start gap-3 px-4 py-3 ${isLatest ? 'bg-blue-50/30' : ''}`}
            >
              {/* Timeline dot */}
              <div className="mt-1 flex flex-col items-center">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    entry.status === 'CONFIRMED'
                      ? 'bg-green-500'
                      : 'bg-amber-400'
                  }`}
                />
                {idx < history.length - 1 && (
                  <div className="mt-1 h-8 w-px bg-gray-200" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900">
                    {entry.type === 'ai' ? 'Enriquecimiento IA' : 'Análisis Web'}
                  </span>
                  {isLatest && (
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                      Último
                    </span>
                  )}
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      entry.status === 'CONFIRMED'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {entry.status === 'CONFIRMED' ? 'Revisado' : 'Pendiente'}
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                  <span>
                    {date.toLocaleString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span>
                    {entry.fieldsFound} campo{entry.fieldsFound !== 1 ? 's' : ''}
                  </span>
                  {entry.fieldsConfirmed > 0 && (
                    <span className="text-green-600">
                      {entry.fieldsConfirmed} aceptado
                      {entry.fieldsConfirmed !== 1 ? 's' : ''}
                    </span>
                  )}
                  {entry.fieldsRejected > 0 && (
                    <span className="text-red-600">
                      {entry.fieldsRejected} rechazado
                      {entry.fieldsRejected !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {entry.providers && entry.providers.length > 0 && (
                  <div className="mt-1">
                    <ProviderBadges providers={entry.providers} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
