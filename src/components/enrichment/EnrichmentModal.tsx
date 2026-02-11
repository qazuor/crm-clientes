'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useEnrichment } from '@/hooks/useEnrichment';
import { BulkAccordionReview } from './BulkAccordionReview';
import type { BulkResult } from './BulkAccordionReview';
import { EnrichmentForm } from './EnrichmentForm';
import { EnrichmentReview } from './EnrichmentReview';
import type { ReviewField } from './EnrichmentReview';
import { EnrichmentProgress } from './shared/EnrichmentProgress';
import type { AIProvider, FieldReviewStatus } from '@/types/enrichment';
import { logger } from '@/lib/logger';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

const FIELD_LABELS: Record<string, string> = {
  website: 'Sitio Web',
  industry: 'Industria',
  description: 'Descripción',
  companySize: 'Tamaño de empresa',
  address: 'Dirección',
  emails: 'Emails',
  phones: 'Teléfonos',
  // Individual social networks
  social_facebook: 'Facebook',
  social_instagram: 'Instagram',
  social_linkedin: 'LinkedIn',
  social_twitter: 'Twitter/X',
  social_whatsapp: 'WhatsApp',
  social_youtube: 'YouTube',
  social_tiktok: 'TikTok',
};

const FIELD_TYPES: Record<string, 'text' | 'email' | 'phone' | 'url'> = {
  website: 'url',
  emails: 'email',
  phones: 'phone',
  social_facebook: 'url',
  social_instagram: 'url',
  social_linkedin: 'url',
  social_twitter: 'url',
  social_whatsapp: 'text',
  social_youtube: 'url',
  social_tiktok: 'url',
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
  const [cooldownDialogOpen, setCooldownDialogOpen] = useState(false);
  const pendingCooldownAction = useRef<(() => Promise<void>) | null>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [autoWebEnrichmentInProgress, setAutoWebEnrichmentInProgress] = useState(false);

  // Build review fields from latest enrichment
  const reviewFields = useMemo((): ReviewField[] => {
    const latest = enrichment.latestEnrichment;
    if (!latest) return [];
    const statuses = enrichment.fieldStatuses ?? {};
    const current = enrichment.currentClientValues;

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

    addField('website', latest.website, latest.websiteScore, current?.website);
    addField('industry', latest.industry, latest.industryScore, current?.industry);
    addField('description', latest.description, latest.descriptionScore, current?.description);
    addField('companySize', latest.companySize, latest.companySizeScore, null); // No current field for this
    addField('address', latest.address, latest.addressScore, current?.address);

    // Array/object fields - show as stringified
    if (latest.emails && Array.isArray(latest.emails) && latest.emails.length > 0) {
      const emailStr = latest.emails.map((e: { value?: string; email?: string }) => e.value ?? e.email ?? '').join(', ');
      fields.push({
        name: 'emails',
        label: FIELD_LABELS.emails,
        currentValue: current?.email ?? null,
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
        currentValue: current?.phone ?? null,
        suggestedValue: phoneStr,
        confidence: 0.7,
        providers,
        status: (statuses.phones as FieldReviewStatus) ?? 'PENDING',
        fieldType: 'phone',
      });
    }

    // Individual social network fields
    if (
      latest.socialProfiles &&
      typeof latest.socialProfiles === 'object' &&
      Object.keys(latest.socialProfiles).length > 0
    ) {
      const profiles = latest.socialProfiles as Record<string, string>;
      const currentSp = current?.socialProfiles;

      // Create a field for each social network found
      for (const [network, url] of Object.entries(profiles)) {
        if (!url) continue;
        const fieldName = `social_${network}`;
        const currentValue = currentSp?.[network as keyof typeof currentSp] ?? null;

        fields.push({
          name: fieldName,
          label: FIELD_LABELS[fieldName] ?? network.charAt(0).toUpperCase() + network.slice(1),
          currentValue: currentValue,
          suggestedValue: url,
          confidence: 0.6,
          providers,
          status: (statuses[fieldName] as FieldReviewStatus) ?? 'PENDING',
          fieldType: FIELD_TYPES[fieldName] ?? 'url',
        });
      }
    }

    return fields;
  }, [enrichment.latestEnrichment, enrichment.fieldStatuses, enrichment.currentClientValues]);

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
      const executeAI = async () => {
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
            await enrichment.refetch();
            setStep('review');
          }
        } catch (err) {
          setEnrichError(err instanceof Error ? err.message : 'Error en enriquecimiento');
          setStep('form');
        }
      };

      // Check cooldown
      if (enrichment.cooldown.shouldWarn && !cooldownConfirmed) {
        pendingCooldownAction.current = executeAI;
        setCooldownDialogOpen(true);
        return;
      }

      await executeAI();
    },
    [enrichment, clienteIds, isBulk, cooldownConfirmed]
  );

  const handleSubmitWeb = useCallback(async () => {
    const executeWeb = async () => {
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
    };

    if (enrichment.cooldown.shouldWarn && !cooldownConfirmed) {
      pendingCooldownAction.current = executeWeb;
      setCooldownDialogOpen(true);
      return;
    }

    await executeWeb();
  }, [enrichment, cooldownConfirmed, isBulk, clienteIds]);

  const handleReviewConfirm = useCallback(
    async (fieldNames: string[]) => {
      await enrichment.confirmFields(fieldNames);

      // Auto-trigger website enrichment if 'website' was confirmed and no analysis exists yet
      const websiteWasConfirmed = fieldNames.includes('website');
      const noExistingAnalysis = !enrichment.websiteAnalysis;
      const hasWebsiteValue = !!enrichment.latestEnrichment?.website;

      if (websiteWasConfirmed && noExistingAnalysis && hasWebsiteValue) {
        // Show loading state for auto website analysis
        setAutoWebEnrichmentInProgress(true);
        try {
          // Refetch to ensure we have the latest data after confirmation
          await enrichment.refetch();
          // Trigger website analysis automatically
          await enrichment.enrichWeb();
        } catch (err) {
          // Don't block the confirmation flow if web enrichment fails
          logger.error('Auto website enrichment failed', err instanceof Error ? err : new Error(String(err)));
        } finally {
          setAutoWebEnrichmentInProgress(false);
        }
      }
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

  const handleCooldownConfirm = useCallback(async () => {
    setCooldownConfirmed(true);
    setCooldownDialogOpen(false);
    const action = pendingCooldownAction.current;
    pendingCooldownAction.current = null;
    if (action) await action();
  }, []);

  const handleClose = () => {
    setStep('form');
    setCooldownConfirmed(false);
    setEnrichError(null);
    setBulkResult(null);
    onClose();
  };

  // Title
  const title = isBulk
    ? `Enriquecer ${clienteIds.length} clientes`
    : `Enriquecer: ${clienteNames[0] ?? 'Cliente'}`;

  return (
    <>
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
                defaultMode={defaultMode}
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
              <>
                {autoWebEnrichmentInProgress && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    <span>Analizando sitio web automáticamente...</span>
                  </div>
                )}
                <EnrichmentReview
                  fields={reviewFields}
                  confidenceThreshold={defaultThreshold}
                  onConfirm={handleReviewConfirm}
                  onReject={handleReviewReject}
                  onEdit={handleReviewEdit}
                  isReviewing={enrichment.isReviewing || autoWebEnrichmentInProgress}
                />
              </>
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

    <ConfirmationDialog
      open={cooldownDialogOpen}
      onOpenChange={setCooldownDialogOpen}
      title="Cooldown activo"
      description={`Este cliente fue enriquecido hace ${enrichment.cooldown.hoursAgo ?? '?'} horas. ¿Desea continuar de todos modos?`}
      confirmText="Continuar"
      cancelText="Cancelar"
      variant="warning"
      onConfirm={handleCooldownConfirm}
    />
    </>
  );
}

