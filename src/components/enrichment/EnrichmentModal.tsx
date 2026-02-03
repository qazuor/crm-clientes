'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { XMarkIcon, CheckCircleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useEnrichment, type BatchFieldItem } from '@/hooks/useEnrichment';
import { EnrichmentForm } from './EnrichmentForm';
import { EnrichmentReview, type ReviewField } from './EnrichmentReview';
import { EnrichmentProgress } from './shared/EnrichmentProgress';
import { ConfidenceBadge } from './shared/ConfidenceBadge';
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
  /** Pre-selected mode to auto-execute on open */
  defaultMode?: 'ai' | 'web';
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
  defaultMode,
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

  // Track if we already auto-executed defaultMode to prevent re-runs
  const autoExecutedRef = useRef(false);

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
          await enrichment.bulk.refetch();
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

  const handleClose = () => {
    setStep('form');
    setCooldownConfirmed(false);
    setEnrichError(null);
    setBulkResult(null);
    autoExecutedRef.current = false;
    onClose();
  };

  // Auto-execute when defaultMode is set and modal opens
  useEffect(() => {
    if (isOpen && defaultMode === 'web' && !autoExecutedRef.current && effectiveHasWebsite) {
      autoExecutedRef.current = true;
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        handleSubmitWeb();
      }, 0);
    }
  }, [isOpen, defaultMode, effectiveHasWebsite, handleSubmitWeb]);

  // Title
  const title = isBulk
    ? `Enriquecer ${clienteIds.length} clientes`
    : `Enriquecer: ${clienteNames[0] ?? 'Cliente'}`;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-in fade-in-0" />
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                     w-full max-h-[85vh] overflow-y-auto bg-white rounded-lg shadow-xl
                     animate-in fade-in-0 zoom-in-95 focus:outline-none p-6 ${
                       step === 'review' && isBulk ? 'max-w-2xl' : 'max-w-lg'
                     }`}
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
              <BulkAccordionReview
                bulkResult={bulkResult}
                enrichedClientIds={enrichedClientIds}
                pendingConfirmation={enrichment.bulk.pendingConfirmation}
                isBulkLoading={enrichment.bulk.isLoading}
                onConfirmBatch={enrichment.bulk.confirmBatch}
                onRejectBatch={enrichment.bulk.rejectBatch}
                isConfirming={enrichment.bulk.isConfirming}
                isRejecting={enrichment.bulk.isRejecting}
                onClose={handleClose}
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

// ─── Types for BulkAccordionReview ──────────────────────────────────

type PendingConfirmationItem = {
  id: string;
  clienteId: string;
  clienteName: string;
  website: string | null;
  industry: string | null;
  description: string | null;
  companySize: string | null;
  address: string | null;
  emails: Array<{ email: string; type?: string }> | null;
  phones: Array<{ number: string; type?: string }> | null;
  socialProfiles: Record<string, string> | null;
  websiteScore: number | null;
  industryScore: number | null;
  descriptionScore: number | null;
  companySizeScore: number | null;
  addressScore: number | null;
  aiProvidersUsed: string[] | null;
  enrichedAt: string | null;
  fieldStatuses: Record<string, string> | null;
};

interface AccordionFieldInfo {
  name: string;
  label: string;
  value: string;
  score: number;
  status: string;
}

/** Extract displayable fields with data from a pending confirmation record. */
function extractFields(item: PendingConfirmationItem): AccordionFieldInfo[] {
  const fields: AccordionFieldInfo[] = [];
  const statuses = item.fieldStatuses ?? {};

  const add = (name: string, value: string | null | undefined, score: number | null | undefined) => {
    if (!value) return;
    fields.push({
      name,
      label: FIELD_LABELS[name] ?? name,
      value,
      score: score ?? 0,
      status: statuses[name] ?? 'PENDING',
    });
  };

  add('website', item.website, item.websiteScore);
  add('industry', item.industry, item.industryScore);
  add('description', item.description, item.descriptionScore);
  add('companySize', item.companySize, item.companySizeScore);
  add('address', item.address, item.addressScore);

  if (item.emails && item.emails.length > 0) {
    const emailStr = item.emails.map((e) => e.email).join(', ');
    fields.push({
      name: 'emails',
      label: FIELD_LABELS.emails,
      value: emailStr,
      score: 0.7,
      status: statuses.emails ?? 'PENDING',
    });
  }

  if (item.phones && item.phones.length > 0) {
    const phoneStr = item.phones.map((p) => p.number).join(', ');
    fields.push({
      name: 'phones',
      label: FIELD_LABELS.phones,
      value: phoneStr,
      score: 0.7,
      status: statuses.phones ?? 'PENDING',
    });
  }

  if (item.socialProfiles && Object.keys(item.socialProfiles).length > 0) {
    const spStr = Object.entries(item.socialProfiles)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    fields.push({
      name: 'socialProfiles',
      label: FIELD_LABELS.socialProfiles,
      value: spStr,
      score: 0.6,
      status: statuses.socialProfiles ?? 'PENDING',
    });
  }

  // Only return fields that are still PENDING
  return fields.filter((f) => f.status === 'PENDING');
}

/**
 * Accordion-based bulk review: expand each client, select/deselect individual fields.
 */
function BulkAccordionReview({
  bulkResult,
  enrichedClientIds,
  pendingConfirmation,
  isBulkLoading,
  onConfirmBatch,
  onRejectBatch,
  isConfirming,
  isRejecting,
  onClose,
}: {
  bulkResult: BulkResult;
  enrichedClientIds: string[];
  pendingConfirmation: PendingConfirmationItem[];
  isBulkLoading: boolean;
  onConfirmBatch: (items: BatchFieldItem[]) => Promise<unknown>;
  onRejectBatch: (items: BatchFieldItem[]) => Promise<unknown>;
  isConfirming: boolean;
  isRejecting: boolean;
  onClose: () => void;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [reviewDone, setReviewDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter to only clients that were enriched in this batch and have pending data
  const relevantClients = useMemo(() => {
    const enrichedSet = new Set(enrichedClientIds);
    return pendingConfirmation
      .filter((item) => enrichedSet.has(item.clienteId))
      .map((item) => ({
        ...item,
        fields: extractFields(item),
      }))
      .filter((item) => item.fields.length > 0);
  }, [pendingConfirmation, enrichedClientIds]);

  // Per-client field selections: clienteId → Set<fieldName>
  const [selections, setSelections] = useState<Record<string, Set<string>>>(() => {
    const initial: Record<string, Set<string>> = {};
    // We need to compute from pendingConfirmation directly in initializer
    const enrichedSet = new Set(enrichedClientIds);
    for (const item of pendingConfirmation) {
      if (!enrichedSet.has(item.clienteId)) continue;
      const fields = extractFields(item);
      if (fields.length === 0) continue;
      const selected = new Set<string>();
      for (const f of fields) {
        if (f.score >= 0.6) selected.add(f.name);
      }
      initial[item.clienteId] = selected;
    }
    return initial;
  });

  // Totals
  const totalFields = relevantClients.reduce((sum, c) => sum + c.fields.length, 0);
  const totalSelected = Object.values(selections).reduce((sum, s) => sum + s.size, 0);
  const clientsWithSelections = Object.entries(selections).filter(([, s]) => s.size > 0).length;

  const isProcessing = isConfirming || isRejecting;

  const toggleExpanded = (clienteId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clienteId)) next.delete(clienteId);
      else next.add(clienteId);
      return next;
    });
  };

  const toggleField = (clienteId: string, fieldName: string) => {
    setSelections((prev) => {
      const current = prev[clienteId] ?? new Set<string>();
      const next = new Set(current);
      if (next.has(fieldName)) next.delete(fieldName);
      else next.add(fieldName);
      return { ...prev, [clienteId]: next };
    });
  };

  const selectAll = (clienteId: string, fields: AccordionFieldInfo[]) => {
    setSelections((prev) => ({
      ...prev,
      [clienteId]: new Set(fields.map((f) => f.name)),
    }));
  };

  const deselectAll = (clienteId: string) => {
    setSelections((prev) => ({
      ...prev,
      [clienteId]: new Set<string>(),
    }));
  };

  const handleSubmit = async () => {
    setError(null);
    try {
      const confirmItems: BatchFieldItem[] = [];
      const rejectItems: BatchFieldItem[] = [];

      for (const client of relevantClients) {
        const selected = selections[client.clienteId] ?? new Set<string>();
        const selectedFields = client.fields.filter((f) => selected.has(f.name)).map((f) => f.name);
        const rejectedFields = client.fields.filter((f) => !selected.has(f.name)).map((f) => f.name);

        if (selectedFields.length > 0) {
          confirmItems.push({ clienteId: client.clienteId, fields: selectedFields });
        }
        if (rejectedFields.length > 0) {
          rejectItems.push({ clienteId: client.clienteId, fields: rejectedFields });
        }
      }

      if (confirmItems.length > 0) await onConfirmBatch(confirmItems);
      if (rejectItems.length > 0) await onRejectBatch(rejectItems);
      setReviewDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar revisión');
    }
  };

  // Done state
  if (reviewDone) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircleIcon className="h-6 w-6 text-green-600" />
        </div>
        <p className="text-sm font-medium text-gray-900">Revisión completada</p>
        <p className="text-xs text-gray-500">Los datos han sido procesados correctamente.</p>
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

  // Loading state
  if (isBulkLoading && relevantClients.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <p className="text-sm text-gray-500">Cargando datos de enriquecimiento...</p>
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

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Accordion */}
      {relevantClients.length > 0 ? (
        <>
          <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200">
            {relevantClients.map((client) => {
              const isExpanded = expandedIds.has(client.clienteId);
              const selected = selections[client.clienteId] ?? new Set<string>();
              return (
                <div key={client.clienteId} className="border-b border-gray-100 last:border-b-0">
                  {/* Accordion header */}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(client.clienteId)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <span className="flex-1 text-sm font-medium text-gray-900 truncate">
                      {client.clienteName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {selected.size} de {client.fields.length}
                    </span>
                    {isExpanded ? (
                      <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </button>

                  {/* Accordion body */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-white px-4 py-3">
                      {/* Toolbar */}
                      <div className="mb-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => selectAll(client.clienteId, client.fields)}
                          disabled={isProcessing}
                          className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          Seleccionar todo
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={() => deselectAll(client.clienteId)}
                          disabled={isProcessing}
                          className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          Deseleccionar todo
                        </button>
                      </div>

                      {/* Fields */}
                      <div className="flex flex-col gap-1.5">
                        {client.fields.map((field) => (
                          <label
                            key={field.name}
                            className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors ${
                              selected.has(field.name)
                                ? 'border-blue-300 bg-blue-50'
                                : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(field.name)}
                              onChange={() => toggleField(client.clienteId, field.name)}
                              disabled={isProcessing}
                              className="rounded text-blue-600"
                            />
                            <div className="flex flex-1 flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">{field.label}</span>
                                <ConfidenceBadge score={field.score} />
                              </div>
                              <span className="mt-0.5 text-xs text-gray-500 truncate">
                                {field.value.length > 80 ? field.value.slice(0, 80) + '...' : field.value}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Global actions */}
          <div className="flex flex-col gap-3 border-t border-gray-200 pt-4">
            <p className="text-xs text-gray-500">
              {totalSelected} campo{totalSelected !== 1 ? 's' : ''} seleccionado
              {totalSelected !== 1 ? 's' : ''} de {clientsWithSelections} cliente
              {clientsWithSelections !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isProcessing || totalFields === 0}
                className="flex-1 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isConfirming
                  ? 'Aceptando...'
                  : `Aceptar ${totalSelected} / Rechazar ${totalFields - totalSelected}`}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="border-t border-gray-200 pt-4">
          <p className="mb-3 text-sm text-gray-500 text-center">
            No hay campos pendientes de revisión.
          </p>
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
