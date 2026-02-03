'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEnrichment } from '@/hooks/useEnrichment';
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
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'ai' | 'web' | undefined>(undefined);
  const enrichment = useEnrichment(clienteId);

  const openModal = (mode?: 'ai' | 'web') => {
    setModalMode(mode);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalMode(undefined);
    // Refresh page data after enrichment
    router.refresh();
  };

  // Derive effective website: prop (server) OR confirmed via enrichment
  const effectiveSitioWeb =
    sitioWeb || enrichment.latestEnrichment?.website || null;

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
            onClick={() => openModal()}
            className="rounded bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
          >
            Enriquecer
          </button>
        </div>
        <div className="p-4">
          <EnrichmentSummary
            clienteId={clienteId}
            onEnrich={() => openModal()}
          />
        </div>
      </div>

      {/* Website Analysis Section */}
      {effectiveSitioWeb && (
        <div id="web-analysis">
          <div className="flex items-center gap-2 mb-3">
            <ChartBarIcon className="w-5 h-5 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">
              Analisis de Sitio Web
            </h3>
          </div>
          <WebsiteSummary
            clienteId={clienteId}
            sitioWeb={effectiveSitioWeb}
            onEnrichWeb={() => openModal('web')}
          />
        </div>
      )}

      {/* Enrichment History */}
      <EnrichmentHistory clienteId={clienteId} />

      {/* Enrichment Modal */}
      <EnrichmentModal
        isOpen={modalOpen}
        onClose={closeModal}
        clienteIds={[clienteId]}
        clienteNames={[clienteNombre]}
        clientHasWebsite={!!effectiveSitioWeb}
        defaultMode={modalMode}
      />
    </>
  );
}
