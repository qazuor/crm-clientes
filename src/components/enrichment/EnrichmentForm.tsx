'use client';

import { useState } from 'react';
import type { AIProvider } from '@/types/enrichment';

interface EnrichmentFormProps {
  onSubmitAI: (options: {
    provider: AIProvider | 'auto';
    quick: boolean;
    useExternalApis: boolean;
    verifyEmails: boolean;
    searchGoogleMaps: boolean;
    confidenceThreshold: number;
  }) => void;
  onSubmitWeb: () => void;
  clientHasWebsite: boolean;
  defaultConfidenceThreshold: number;
  availableProviders?: string[];
  isLoading: boolean;
}

const ALL_PROVIDERS: { value: AIProvider | 'auto'; label: string }[] = [
  { value: 'auto', label: 'Auto (mejor disponible)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'grok', label: 'xAI Grok' },
  { value: 'deepseek', label: 'DeepSeek' },
];

/**
 * Form section of the EnrichmentModal for configuring enrichment options.
 */
export function EnrichmentForm({
  onSubmitAI,
  onSubmitWeb,
  clientHasWebsite,
  defaultConfidenceThreshold,
  availableProviders,
  isLoading,
}: EnrichmentFormProps) {
  const [provider, setProvider] = useState<AIProvider | 'auto'>('auto');
  const [quick, setQuick] = useState(false);
  const [useExternalApis, setUseExternalApis] = useState(false);
  const [verifyEmails, setVerifyEmails] = useState(true);
  const [searchGoogleMaps, setSearchGoogleMaps] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(defaultConfidenceThreshold);

  const handleSubmitAI = () => {
    onSubmitAI({
      provider,
      quick,
      useExternalApis,
      verifyEmails,
      searchGoogleMaps,
      confidenceThreshold,
    });
  };

  // Filter providers to only show configured ones
  const providerOptions = availableProviders
    ? ALL_PROVIDERS.filter(
        (p) => p.value === 'auto' || availableProviders.includes(p.value)
      )
    : ALL_PROVIDERS;

  return (
    <div className="flex flex-col gap-4">
      {/* AI Provider selector */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Proveedor de IA
        </label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as AIProvider | 'auto')}
          disabled={isLoading}
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {providerOptions.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Search depth */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Profundidad de búsqueda
        </label>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-900">
            <input
              type="radio"
              checked={quick}
              onChange={() => setQuick(true)}
              disabled={isLoading}
              className="text-blue-600"
            />
            Rápida
            <span className="text-xs text-gray-500">(1 proveedor)</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-900">
            <input
              type="radio"
              checked={!quick}
              onChange={() => setQuick(false)}
              disabled={isLoading}
              className="text-blue-600"
            />
            Completa
            <span className="text-xs text-gray-500">(consenso multi-proveedor)</span>
          </label>
        </div>
      </div>

      {/* External APIs */}
      <div>
        <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={useExternalApis}
            onChange={(e) => setUseExternalApis(e.target.checked)}
            disabled={isLoading}
            className="rounded text-blue-600"
          />
          Usar APIs externas
        </label>
        {useExternalApis && (
          <div className="ml-6 mt-1 flex flex-col gap-1">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={verifyEmails}
                onChange={(e) => setVerifyEmails(e.target.checked)}
                disabled={isLoading}
                className="rounded text-blue-600"
              />
              Verificar emails (Hunter.io)
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={searchGoogleMaps}
                onChange={(e) => setSearchGoogleMaps(e.target.checked)}
                disabled={isLoading}
                className="rounded text-blue-600"
              />
              Buscar en Google Maps
            </label>
          </div>
        )}
      </div>

      {/* Confidence threshold */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Umbral de confianza: {Math.round(confidenceThreshold * 100)}%
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(confidenceThreshold * 100)}
          onChange={(e) => setConfidenceThreshold(Number(e.target.value) / 100)}
          disabled={isLoading}
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={handleSubmitAI}
          disabled={isLoading}
          className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Enriqueciendo...' : 'Enriquecer con IA'}
        </button>
        <button
          type="button"
          onClick={onSubmitWeb}
          disabled={isLoading || !clientHasWebsite}
          title={!clientHasWebsite ? 'El cliente no tiene sitio web configurado' : undefined}
          className="flex-1 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Analizar Web
        </button>
      </div>
    </div>
  );
}
