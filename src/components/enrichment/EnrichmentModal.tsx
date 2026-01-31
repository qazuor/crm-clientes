'use client';

import { useState, useMemo, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { XMarkIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useEnrichment, type BatchFieldItem } from '@/hooks/useEnrichment';
import { EnrichmentForm } from './EnrichmentForm';
import { EnrichmentReview, type ReviewField } from './EnrichmentReview';
import { EnrichmentProgress } from './shared/EnrichmentProgress';
import { REVIEWABLE_FIELDS } from '@/types/enrichment';
import type { AIProvider, FieldReviewStatus } from '@/types/enrichment';

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

const FIELD_TYPES: Record<string, 'text' | 'email' | 'phone' | 'url'> = {
  website: 'url',
  emails: 'email',
  phones: 'phone',
};

interface EnrichmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Single client or array of client IDs for bulk */
  clienteIds: string[];
  /** Client names for display */
  clienteNames: string[];
  /** Whether client has a website URL (single-client mode) */
  clientHasWebsite?: boolean;
}

type ModalStep = 'form' | 'loading' | 'review' | 'done';

interface BulkResultItem {
  clienteId: string;
  clienteName: string;
  success: boolean;
  aiEnriched?: boolean;
  websiteAnalyzed?: boolean;
  error?: string;
}

interface BulkResult {
  total: number;
  successful: number;
  failed: number;
  results: BulkResultItem[];
}

/**
 * Main enrichment modal overlay. Works for both individual (1 client) and bulk (N clients).
 */
export function EnrichmentModal({
  isOpen,
  onClose,
  clienteIds,
  clienteNames,
  clientHasWebsite = false,
}: EnrichmentModalProps) {
  const isBulk = clienteIds.length > 1;
  const singleClienteId = isBulk ? undefined : clienteIds[0];

  const enrichment = useEnrichment(singleClienteId);

  // Derive effective website availability: original prop OR confirmed/found via enrichment
  const effectiveHasWebsite =
    clientHasWebsite || !!enrichment.latestEnrichment?.website;

  const [step, setStep] = useState<ModalStep>('form');
  const [cooldownConfirmed, setCooldownConfirmed] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [bulkReviewDone, setBulkReviewDone] = useState(false);

  // Build review fields from latest enrichment
  const reviewFields = useMemo((): ReviewField[] => {
    const latest = enrichment.latestEnrichment;
    if (!latest) return [];
    const statuses = enrichment.fieldStatuses ?? {};

    const fields: ReviewField[] = [];
    const providers = latest.aiProvidersUsed ?? [];

    const addField = (
      name: string,
      value: string | null | undefined,
      score: number | null | undefined,
      currentValue: string | null | undefined
    ) => {
      if (!value) return;
      fields.push({
        name,
        label: FIELD_LABELS[name] ?? name,
        currentValue: currentValue ?? null,
        suggestedValue: value,
        confidence: score ?? 0,
        providers,
        status: (statuses[name] as FieldReviewStatus) ?? 'PENDING',
        fieldType: FIELD_TYPES[name] ?? 'text',
      });
    };

    addField('website', latest.website, latest.websiteScore, null);
    addField('industry', latest.industry, latest.industryScore, null);
    addField('description', latest.description, latest.descriptionScore, null);
    addField('companySize', latest.companySize, latest.companySizeScore, null);
    addField('address', latest.address, latest.addressScore, null);

    // Array/object fields - show as stringified
    if (latest.emails && Array.isArray(latest.emails) && latest.emails.length > 0) {
      const emailStr = latest.emails.map((e: { value?: string; email?: string }) => e.value ?? e.email ?? '').join(', ');
      fields.push({
        name: 'emails',
        label: FIELD_LABELS.emails,
        currentValue: null,
        suggestedValue: emailStr,
        confidence: 0.7,
        providers,
        status: (statuses.emails as FieldReviewStatus) ?? 'PENDING',
        fieldType: 'email',
      });
    }

    if (latest.phones && Array.isArray(latest.phones) && latest.phones.length > 0) {
      const phoneStr = latest.phones.map((p: { value?: string; number?: string }) => p.value ?? p.number ?? '').join(', ');
      fields.push({
        name: 'phones',
        label: FIELD_LABELS.phones,
        currentValue: null,
        suggestedValue: phoneStr,
        confidence: 0.7,
        providers,
        status: (statuses.phones as FieldReviewStatus) ?? 'PENDING',
        fieldType: 'phone',
      });
    }

    if (
      latest.socialProfiles &&
      typeof latest.socialProfiles === 'object' &&
      Object.keys(latest.socialProfiles).length > 0
    ) {
      const spStr = Object.entries(latest.socialProfiles)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      fields.push({
        name: 'socialProfiles',
        label: FIELD_LABELS.socialProfiles,
        currentValue: null,
        suggestedValue: spStr,
        confidence: 0.6,
        providers,
        status: (statuses.socialProfiles as FieldReviewStatus) ?? 'PENDING',
      });
    }

    return fields;
  }, [enrichment.latestEnrichment, enrichment.fieldStatuses]);

  // Default confidence threshold (could come from settings, default 0.6)
  const defaultThreshold = 0.6;

  // Enriched client IDs from bulk result (for batch confirm/reject)
  const enrichedClientIds = useMemo(() => {
    if (!bulkResult) return [];
    return bulkResult.results
      .filter((r) => r.success && r.aiEnriched)
      .map((r) => r.clienteId);
  }, [bulkResult]);

  const handleSubmitAI = useCallback(
    async (options: {
      provider: AIProvider | 'auto';
      quick: boolean;
      useExternalApis: boolean;
      verifyEmails: boolean;
      searchGoogleMaps: boolean;
      confidenceThreshold: number;
    }) => {
      // Check cooldown
      if (enrichment.cooldown.shouldWarn && !cooldownConfirmed) {
        const confirmed = window.confirm(
          `Este cliente fue enriquecido hace ${enrichment.cooldown.hoursAgo} horas. ¿Desea continuar?`
        );
        if (!confirmed) return;
        setCooldownConfirmed(true);
      }

      setEnrichError(null);
      setStep('loading');

      try {
        if (isBulk) {
          const result = await enrichment.bulk.enrich({
            clienteIds,
            includeAI: true,
            includeWebsiteAnalysis: false,
            provider: options.provider,
          });
          setBulkResult(result);
          setStep('review');
        } else {
          await enrichment.enrich({
            mode: 'ai',
            provider: options.provider === 'auto' ? undefined : options.provider,
            quick: options.quick,
            useExternalApis: options.useExternalApis,
            verifyEmails: options.verifyEmails,
            searchGoogleMaps: options.searchGoogleMaps,
            confidenceThreshold: options.confidenceThreshold,
          });
          // Refetch to get the new enrichment data for review
          await enrichment.refetch();
          setStep('review');
        }
      } catch (err) {
        setEnrichError(err instanceof Error ? err.message : 'Error en enriquecimiento');
        setStep('form');
      }
    },
    [enrichment, clienteIds, isBulk, cooldownConfirmed]
  );

  const handleSubmitWeb = useCallback(async () => {
    if (enrichment.cooldown.shouldWarn && !cooldownConfirmed) {
      const confirmed = window.confirm(
        `Este cliente fue enriquecido hace ${enrichment.cooldown.hoursAgo} horas. ¿Desea continuar?`
      );
      if (!confirmed) return;
      setCooldownConfirmed(true);
    }

    setEnrichError(null);
    setStep('loading');

    try {
      if (isBulk) {
        const result = await enrichment.bulk.enrich({
          clienteIds,
          includeAI: false,
          includeWebsiteAnalysis: true,
        });
        setBulkResult(result);
        setStep('done');
      } else {
        await enrichment.enrichWeb();
        setStep('done');
      }
    } catch (err) {
      setEnrichError(err instanceof Error ? err.message : 'Error en análisis web');
      setStep('form');
    }
  }, [enrichment, cooldownConfirmed, isBulk, clienteIds]);

  const handleReviewConfirm = useCallback(
    (fieldNames: string[]) => {
      enrichment.confirmFields(fieldNames);
    },
    [enrichment]
  );

  const handleReviewReject = useCallback(
    (fieldNames: string[]) => {
      enrichment.rejectFields(fieldNames);
    },
    [enrichment]
  );

  const handleReviewEdit = useCallback(
    (fieldName: string, editedValue: string) => {
      enrichment.editField(fieldName, editedValue);
    },
    [enrichment]
  );

  // Bulk review: accept all pending fields for all enriched clients
  const handleBulkConfirmAll = useCallback(async () => {
    if (enrichedClientIds.length === 0) return;
    const allFields = [...REVIEWABLE_FIELDS];
    const items: BatchFieldItem[] = enrichedClientIds.map((clienteId) => ({
      clienteId,
      fields: allFields,
    }));
    try {
      await enrichment.bulk.confirmBatch(items);
      setBulkReviewDone(true);
    } catch (err) {
      setEnrichError(err instanceof Error ? err.message : 'Error al confirmar datos');
    }
  }, [enrichedClientIds, enrichment]);

  // Bulk review: reject all pending fields for all enriched clients
  const handleBulkRejectAll = useCallback(async () => {
    if (enrichedClientIds.length === 0) return;
    const allFields = [...REVIEWABLE_FIELDS];
    const items: BatchFieldItem[] = enrichedClientIds.map((clienteId) => ({
      clienteId,
      fields: allFields,
    }));
    try {
      await enrichment.bulk.rejectBatch(items);
      setBulkReviewDone(true);
    } catch (err) {
      setEnrichError(err instanceof Error ? err.message : 'Error al rechazar datos');
    }
  }, [enrichedClientIds, enrichment]);

  const handleClose = () => {
    setStep('form');
    setCooldownConfirmed(false);
    setEnrichError(null);
    setBulkResult(null);
    setBulkReviewDone(false);
    onClose();
  };

  // Title
  const title = isBulk
    ? `Enriquecer ${clienteIds.length} clientes`
    : `Enriquecer: ${clienteNames[0] ?? 'Cliente'}`;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-in fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                     w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white rounded-lg shadow-xl
                     animate-in fade-in-0 zoom-in-95 focus:outline-none p-6"
        >
          <Dialog.Title className="text-lg font-semibold text-gray-900 pr-8">
            {title}
          </Dialog.Title>
          {isBulk && clienteNames.length <= 5 && (
            <Dialog.Description className="mt-1 text-xs text-gray-500">
              {clienteNames.join(', ')}
            </Dialog.Description>
          )}

          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 p-1 rounded-md text-gray-400
                         hover:text-gray-500 hover:bg-gray-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Cerrar"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </Dialog.Close>

          <div className="mt-4">
            {/* Error banner */}
            {enrichError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {enrichError}
              </div>
            )}

            {/* Form step */}
            {step === 'form' && (
              <EnrichmentForm
                onSubmitAI={handleSubmitAI}
                onSubmitWeb={handleSubmitWeb}
                clientHasWebsite={effectiveHasWebsite}
                defaultConfidenceThreshold={defaultThreshold}
                availableProviders={enrichment.bulk.availableAIProviders}
                isLoading={false}
              />
            )}

            {/* Loading step */}
            {step === 'loading' && (
              <EnrichmentProgress
                isLoading={true}
                currentStep={
                  isBulk
                    ? 'Enriqueciendo clientes en bloque...'
                    : 'Consultando proveedores de IA...'
                }
              />
            )}

            {/* Review step: single-client */}
            {step === 'review' && !isBulk && (
              <EnrichmentReview
                fields={reviewFields}
                confidenceThreshold={defaultThreshold}
                onConfirm={handleReviewConfirm}
                onReject={handleReviewReject}
                onEdit={handleReviewEdit}
                isReviewing={enrichment.isReviewing}
              />
            )}

            {/* Review step: bulk */}
            {step === 'review' && isBulk && bulkResult && (
              <BulkReviewStep
                bulkResult={bulkResult}
                enrichedCount={enrichedClientIds.length}
                onConfirmAll={handleBulkConfirmAll}
                onRejectAll={handleBulkRejectAll}
                onClose={handleClose}
                isConfirming={enrichment.bulk.isConfirming}
                isRejecting={enrichment.bulk.isRejecting}
                reviewDone={bulkReviewDone}
              />
            )}

            {/* Done step */}
            {step === 'done' && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {isBulk
                    ? 'Enriquecimiento en bloque completado'
                    : 'Análisis web completado'}
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Bulk review step: shows enrichment results per client and lets user accept/reject all.
 */
function BulkReviewStep({
  bulkResult,
  enrichedCount,
  onConfirmAll,
  onRejectAll,
  onClose,
  isConfirming,
  isRejecting,
  reviewDone,
}: {
  bulkResult: BulkResult;
  enrichedCount: number;
  onConfirmAll: () => void;
  onRejectAll: () => void;
  onClose: () => void;
  isConfirming: boolean;
  isRejecting: boolean;
  reviewDone: boolean;
}) {
  const isProcessing = isConfirming || isRejecting;

  if (reviewDone) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircleIcon className="h-6 w-6 text-green-600" />
        </div>
        <p className="text-sm font-medium text-gray-900">
          Revisión completada
        </p>
        <p className="text-xs text-gray-500">
          Los datos han sido {isConfirming ? 'aceptados' : 'procesados'} correctamente.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-900">Resultados</span>
          <span className="text-gray-500">
            {bulkResult.successful}/{bulkResult.total} exitosos
          </span>
        </div>
        {bulkResult.failed > 0 && (
          <p className="mt-1 text-xs text-red-600">
            {bulkResult.failed} cliente{bulkResult.failed !== 1 ? 's' : ''} con errores
          </p>
        )}
      </div>

      {/* Per-client results */}
      <div className="max-h-60 overflow-y-auto">
        <div className="flex flex-col gap-1.5">
          {bulkResult.results.map((r) => (
            <div
              key={r.clienteId}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                r.success
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              {r.success ? (
                <CheckCircleIcon className="h-4 w-4 flex-shrink-0 text-green-500" />
              ) : (
                <XCircleIcon className="h-4 w-4 flex-shrink-0 text-red-500" />
              )}
              <span className="flex-1 truncate">{r.clienteName}</span>
              {r.aiEnriched && (
                <span className="text-xs text-green-600">IA</span>
              )}
              {r.websiteAnalyzed && (
                <span className="text-xs text-green-600">Web</span>
              )}
              {r.error && (
                <span className="text-xs text-red-500 truncate max-w-[120px]" title={r.error}>
                  {r.error}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {enrichedCount > 0 && (
        <div className="flex flex-col gap-2 border-t border-gray-200 pt-4">
          <p className="text-xs text-gray-500">
            {enrichedCount} cliente{enrichedCount !== 1 ? 's' : ''} con datos pendientes de revisión
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onConfirmAll}
              disabled={isProcessing}
              className="flex-1 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isConfirming ? 'Aceptando...' : 'Aceptar todos los datos'}
            </button>
            <button
              type="button"
              onClick={onRejectAll}
              disabled={isProcessing}
              className="flex-1 rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {isRejecting ? 'Rechazando...' : 'Rechazar todos'}
            </button>
          </div>
        </div>
      )}

      {enrichedCount === 0 && (
        <div className="border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
