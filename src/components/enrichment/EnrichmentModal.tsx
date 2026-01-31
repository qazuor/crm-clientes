'use client';

import { useState, useMemo, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useEnrichment } from '@/hooks/useEnrichment';
import { EnrichmentForm } from './EnrichmentForm';
import { EnrichmentReview, type ReviewField } from './EnrichmentReview';
import { EnrichmentProgress } from './shared/EnrichmentProgress';
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
          await enrichment.bulk.enrich({
            clienteIds,
            includeAI: true,
            includeWebsiteAnalysis: false,
            provider: options.provider,
          });
          setStep('done');
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
      await enrichment.enrichWeb();
      setStep('done');
    } catch (err) {
      setEnrichError(err instanceof Error ? err.message : 'Error en análisis web');
      setStep('form');
    }
  }, [enrichment, cooldownConfirmed]);

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
                isBulk={isBulk}
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

            {/* Review step (single-client only) */}
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
