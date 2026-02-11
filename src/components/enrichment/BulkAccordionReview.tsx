'use client';

import { useState, useMemo } from 'react';
import { CheckCircleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { ConfidenceBadge } from './shared/ConfidenceBadge';
import type { BatchFieldItem } from '@/hooks/useEnrichment';

const FIELD_LABELS: Record<string, string> = {
  website: 'Sitio Web',
  industry: 'Industria',
  description: 'Descripción',
  companySize: 'Tamaño de empresa',
  address: 'Dirección',
  emails: 'Emails',
  phones: 'Teléfonos',
  social_facebook: 'Facebook',
  social_instagram: 'Instagram',
  social_linkedin: 'LinkedIn',
  social_twitter: 'Twitter/X',
  social_whatsapp: 'WhatsApp',
  social_youtube: 'YouTube',
  social_tiktok: 'TikTok',
};

export interface BulkResultItem {
  readonly clienteId: string;
  readonly clienteName: string;
  readonly success: boolean;
  readonly aiEnriched?: boolean;
  readonly websiteAnalyzed?: boolean;
  readonly error?: string;
}

export interface BulkResult {
  readonly total: number;
  readonly successful: number;
  readonly failed: number;
  readonly results: BulkResultItem[];
}

export type PendingConfirmationItem = {
  readonly id: string;
  readonly clienteId: string;
  readonly clienteName: string;
  readonly website: string | null;
  readonly industry: string | null;
  readonly description: string | null;
  readonly companySize: string | null;
  readonly address: string | null;
  readonly emails: Array<{ email: string; type?: string }> | null;
  readonly phones: Array<{ number: string; type?: string }> | null;
  readonly socialProfiles: Record<string, string> | null;
  readonly websiteScore: number | null;
  readonly industryScore: number | null;
  readonly descriptionScore: number | null;
  readonly companySizeScore: number | null;
  readonly addressScore: number | null;
  readonly aiProvidersUsed: string[] | null;
  readonly enrichedAt: string | null;
  readonly fieldStatuses: Record<string, string> | null;
  readonly currentWebsite: string | null;
  readonly currentIndustry: string | null;
  readonly currentDescription: string | null;
};

interface AccordionFieldInfo {
  readonly name: string;
  readonly label: string;
  readonly value: string;
  readonly currentValue: string | null;
  readonly score: number;
  readonly status: string;
}

/** Extract displayable fields with data from a pending confirmation record. */
function extractFields(item: PendingConfirmationItem): AccordionFieldInfo[] {
  const fields: AccordionFieldInfo[] = [];
  const statuses = item.fieldStatuses ?? {};

  const isDifferent = (current: string | null | undefined, suggested: string | null | undefined): boolean => {
    const c = (current ?? '').trim().toLowerCase();
    const s = (suggested ?? '').trim().toLowerCase();
    return c !== s;
  };

  const add = (
    name: string,
    value: string | null | undefined,
    currentValue: string | null | undefined,
    score: number | null | undefined
  ) => {
    if (!value) return;
    if (!isDifferent(currentValue, value)) return;
    fields.push({
      name,
      label: FIELD_LABELS[name] ?? name,
      value,
      currentValue: currentValue ?? null,
      score: score ?? 0,
      status: statuses[name] ?? 'PENDING',
    });
  };

  add('website', item.website, item.currentWebsite, item.websiteScore);
  add('industry', item.industry, item.currentIndustry, item.industryScore);
  add('description', item.description, item.currentDescription, item.descriptionScore);
  add('companySize', item.companySize, null, item.companySizeScore);
  add('address', item.address, null, item.addressScore);

  if (item.emails && item.emails.length > 0) {
    const emailStr = item.emails.map((e) => e.email).join(', ');
    fields.push({
      name: 'emails',
      label: FIELD_LABELS.emails,
      value: emailStr,
      currentValue: null,
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
      currentValue: null,
      score: 0.7,
      status: statuses.phones ?? 'PENDING',
    });
  }

  if (item.socialProfiles && Object.keys(item.socialProfiles).length > 0) {
    for (const [network, url] of Object.entries(item.socialProfiles)) {
      if (!url) continue;
      const fieldName = `social_${network}`;
      fields.push({
        name: fieldName,
        label: FIELD_LABELS[fieldName] ?? network.charAt(0).toUpperCase() + network.slice(1),
        value: url,
        currentValue: null,
        score: 0.6,
        status: statuses[fieldName] ?? 'PENDING',
      });
    }
  }

  return fields.filter((f) => f.status === 'PENDING');
}

interface BulkAccordionReviewProps {
  readonly bulkResult: BulkResult;
  readonly enrichedClientIds: string[];
  readonly pendingConfirmation: PendingConfirmationItem[];
  readonly isBulkLoading: boolean;
  readonly onConfirmBatch: (items: BatchFieldItem[]) => Promise<unknown>;
  readonly onRejectBatch: (items: BatchFieldItem[]) => Promise<unknown>;
  readonly isConfirming: boolean;
  readonly isRejecting: boolean;
  readonly onClose: () => void;
}

/**
 * Accordion-based bulk review: expand each client, select/deselect individual fields.
 */
export function BulkAccordionReview({
  bulkResult,
  enrichedClientIds,
  pendingConfirmation,
  isBulkLoading,
  onConfirmBatch,
  onRejectBatch,
  isConfirming,
  isRejecting,
  onClose,
}: BulkAccordionReviewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [reviewDone, setReviewDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const [selections, setSelections] = useState<Record<string, Set<string>>>(() => {
    const initial: Record<string, Set<string>> = {};
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

                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-white px-4 py-3">
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
                              <span className="mt-0.5 text-xs text-gray-700 break-words">
                                {field.value}
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
