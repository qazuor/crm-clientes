'use client';

import { useState } from 'react';
import { useAIEnrichment } from '@/hooks/useAIEnrichment';
import { Button } from '@/components/ui/Button';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface AIEnrichmentPanelProps {
  clienteId: string;
  clienteName: string;
}

export function AIEnrichmentPanel({ clienteId, clienteName }: AIEnrichmentPanelProps) {
  const {
    enrichment,
    isLoading,
    isEnriching,
    enrich,
    quickEnrich,
    enrichError,
    enrichResult,
  } = useAIEnrichment(clienteId);

  const [showDetails, setShowDetails] = useState(false);
  const [showExternalOptions, setShowExternalOptions] = useState(false);
  const [externalOptions, setExternalOptions] = useState({
    useExternalApis: false,
    verifyEmails: true,
    searchGoogleMaps: true,
  });

  const handleFullEnrich = async () => {
    try {
      await enrich({
        useExternalApis: externalOptions.useExternalApis,
        verifyEmails: externalOptions.verifyEmails,
        searchGoogleMaps: externalOptions.searchGoogleMaps,
      });
    } catch {
      // Error is handled by the hook
    }
  };

  const handleQuickEnrich = async () => {
    try {
      await quickEnrich();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Enriquecimiento IA
        </h3>
        <div className="flex gap-2">
          <Button
            onClick={handleQuickEnrich}
            disabled={isEnriching}
            variant="secondary"
            size="sm"
          >
            {isEnriching ? 'Procesando...' : 'Rapido'}
          </Button>
          <Button
            onClick={handleFullEnrich}
            disabled={isEnriching}
            size="sm"
          >
            {isEnriching ? 'Procesando...' : 'Completo'}
          </Button>
        </div>
      </div>

      {/* External API Options */}
      <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg">
        <button
          onClick={() => setShowExternalOptions(!showExternalOptions)}
          className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg"
        >
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={externalOptions.useExternalApis}
              onChange={(e) => {
                e.stopPropagation();
                setExternalOptions(prev => ({ ...prev, useExternalApis: e.target.checked }));
              }}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>APIs Externas (Hunter.io, SerpAPI)</span>
          </span>
          {showExternalOptions ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )}
        </button>
        {showExternalOptions && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={externalOptions.verifyEmails}
                onChange={(e) => setExternalOptions(prev => ({ ...prev, verifyEmails: e.target.checked }))}
                disabled={!externalOptions.useExternalApis}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
              />
              Verificar emails con Hunter.io
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={externalOptions.searchGoogleMaps}
                onChange={(e) => setExternalOptions(prev => ({ ...prev, searchGoogleMaps: e.target.checked }))}
                disabled={!externalOptions.useExternalApis}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
              />
              Buscar en Google Maps via SerpAPI
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Las APIs externas consumen cuota y pueden tener costo adicional.
            </p>
          </div>
        )}
      </div>

      {enrichError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">
            {enrichError.message}
          </p>
        </div>
      )}

      {enrichResult?.errors && enrichResult.errors.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
            Algunos proveedores fallaron:
          </p>
          <ul className="text-sm text-yellow-600 dark:text-yellow-400">
            {enrichResult.errors.map((err, i) => (
              <li key={i}>{err.provider}: {err.error}</li>
            ))}
          </ul>
        </div>
      )}

      {enrichment ? (
        <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
          {/* Enrichment Summary */}
          <div className="grid grid-cols-2 gap-4">
            <EnrichmentField
              label="Sitio Web"
              value={enrichment.website}
              score={enrichment.websiteScore}
              isUrl
            />
            <EnrichmentField
              label="Industria"
              value={enrichment.industry}
              score={enrichment.industryScore}
            />
            <EnrichmentField
              label="Tamano"
              value={enrichment.companySize}
              score={enrichment.companySizeScore}
            />
            <EnrichmentField
              label="Direccion"
              value={enrichment.address}
              score={enrichment.addressScore}
            />
          </div>

          {enrichment.description && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Descripcion
                </span>
                {enrichment.descriptionScore && (
                  <ConfidenceBadge score={enrichment.descriptionScore} />
                )}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {enrichment.description}
              </p>
            </div>
          )}

          {/* Collapsible Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {showDetails ? 'Ocultar detalles' : 'Ver mas detalles'}
          </button>

          {showDetails && (
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              {/* Emails */}
              {enrichment.emails && enrichment.emails.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Emails
                  </h4>
                  <ul className="space-y-1">
                    {enrichment.emails.map((email, i) => (
                      <li key={i} className="text-sm text-gray-600 dark:text-gray-400">
                        <a
                          href={`mailto:${email.email}`}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {email.email}
                        </a>
                        <span className="text-gray-400 dark:text-gray-500 ml-2">
                          ({email.type})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Phones */}
              {enrichment.phones && enrichment.phones.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Telefonos
                  </h4>
                  <ul className="space-y-1">
                    {enrichment.phones.map((phone, i) => (
                      <li key={i} className="text-sm text-gray-600 dark:text-gray-400">
                        <a
                          href={`tel:${phone.number}`}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {phone.number}
                        </a>
                        <span className="text-gray-400 dark:text-gray-500 ml-2">
                          ({phone.type})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Social Profiles */}
              {enrichment.socialProfiles && Object.keys(enrichment.socialProfiles).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Perfiles Sociales
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(enrichment.socialProfiles).map(([platform, url]) => (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        {platform}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {enrichment.aiProvidersUsed && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Providers utilizados: {enrichment.aiProvidersUsed.join(', ')}
                  </p>
                  {enrichment.enrichedAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Ultima actualizacion: {new Date(enrichment.enrichedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No hay datos de enriquecimiento IA
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Haz clic en &quot;Rapido&quot; o &quot;Completo&quot; para enriquecer este cliente
          </p>
        </div>
      )}
    </div>
  );
}

interface EnrichmentFieldProps {
  label: string;
  value: string | null;
  score?: number | null;
  isUrl?: boolean;
}

function EnrichmentField({ label, value, score, isUrl }: EnrichmentFieldProps) {
  if (!value) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {label}
        </span>
        {score && <ConfidenceBadge score={score} />}
      </div>
      {isUrl ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline truncate block"
        >
          {value}
        </a>
      ) : (
        <p className="text-sm text-gray-900 dark:text-white truncate">{value}</p>
      )}
    </div>
  );
}

interface ConfidenceBadgeProps {
  score: number;
  showLabel?: boolean;
}

function ConfidenceBadge({ score, showLabel = true }: ConfidenceBadgeProps) {
  const percentage = Math.round(score * 100);

  let colorClass = 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700';
  let label = 'Baja';
  let icon = '!';

  if (score >= 0.8) {
    colorClass = 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700';
    label = 'Alta';
    icon = '✓';
  } else if (score >= 0.6) {
    colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700';
    label = 'Media';
    icon = '~';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border ${colorClass}`}
      title={`Confianza: ${percentage}% - ${label}`}
    >
      <span className="font-bold">{icon}</span>
      <span>{percentage}%</span>
      {showLabel && <span className="hidden sm:inline">({label})</span>}
    </span>
  );
}

export default AIEnrichmentPanel;
