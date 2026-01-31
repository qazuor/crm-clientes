'use client';

import { useState } from 'react';
import { EnrichmentSummary } from './EnrichmentSummary';
import { WebsiteSummary } from './WebsiteSummary';
import { EnrichmentHistory } from './EnrichmentHistory';
import { EnrichmentModal } from './EnrichmentModal';
import { SparklesIcon, ChartBarIcon } from '@heroicons/react/24/outline';

interface ClientEnrichmentSectionProps {
  clienteId: string;
  clienteNombre: string;
  sitioWeb: string | null;
}

/**
 * Client component wrapper that renders all enrichment sections on the detail page
 * and manages the EnrichmentModal state.
 */
export function ClientEnrichmentSection({
  clienteId,
  clienteNombre,
  sitioWeb,
}: ClientEnrichmentSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {/* AI Enrichment Section */}
      <div
        className="bg-white rounded-xl shadow-sm border border-gray-200"
        id="enrichment"
      >
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-purple-500" />
            Enriquecimiento con IA
          </h3>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
          >
            Enriquecer
          </button>
        </div>
        <div className="p-4">
          <EnrichmentSummary
            clienteId={clienteId}
            onEnrich={() => setModalOpen(true)}
          />
        </div>
      </div>

      {/* Website Analysis Section */}
      {sitioWeb && (
        <div id="web-analysis">
          <div className="flex items-center gap-2 mb-3">
            <ChartBarIcon className="w-5 h-5 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">
              Analisis de Sitio Web
            </h3>
          </div>
          <WebsiteSummary clienteId={clienteId} sitioWeb={sitioWeb} />
        </div>
      )}

      {/* Enrichment History */}
      <EnrichmentHistory clienteId={clienteId} />

      {/* Enrichment Modal */}
      <EnrichmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        clienteIds={[clienteId]}
        clienteNames={[clienteNombre]}
        clientHasWebsite={!!sitioWeb}
      />
    </>
  );
}
