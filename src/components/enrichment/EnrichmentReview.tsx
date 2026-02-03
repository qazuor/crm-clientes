'use client';

import { useState, useMemo } from 'react';
import { FieldReviewCard } from './shared/FieldReviewCard';
import { ConfidenceBadge } from './shared/ConfidenceBadge';
import type { FieldReviewStatus } from '@/types/enrichment';

type FieldType = 'text' | 'email' | 'phone' | 'url';

export interface ReviewField {
  name: string;
  label: string;
  currentValue: string | null;
  suggestedValue: string;
  confidence: number;
  providers?: string[];
  status: FieldReviewStatus;
  fieldType?: FieldType;
}

interface EnrichmentReviewProps {
  fields: ReviewField[];
  confidenceThreshold: number;
  onConfirm: (fieldNames: string[]) => void;
  onReject: (fieldNames: string[]) => void;
  onEdit: (fieldName: string, editedValue: string) => void;
  isReviewing: boolean;
}

type ReviewMode = 'quick' | 'detailed';

/**
 * Review UI for enrichment results. Two modes:
 * - Quick: checkbox list with pre-selection based on confidence threshold
 * - Detailed: stepper showing one FieldReviewCard at a time
 */
export function EnrichmentReview({
  fields,
  confidenceThreshold,
  onConfirm,
  onReject,
  onEdit,
  isReviewing,
}: EnrichmentReviewProps) {
  const [mode, setMode] = useState<ReviewMode>('quick');

  // Quick mode state
  const [selectedFields, setSelectedFields] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const f of fields) {
      if (f.status === 'PENDING' && f.confidence >= confidenceThreshold) {
        initial.add(f.name);
      }
    }
    return initial;
  });

  // Detailed mode state
  const [currentStep, setCurrentStep] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, 'confirm' | 'reject' | 'edit'>>({});

  // Filter pending fields, excluding those where current and suggested values are identical
  const pendingFields = useMemo(() => {
    return fields.filter((f) => {
      if (f.status !== 'PENDING') return false;
      // Normalize values for comparison (trim, lowercase, treat null/empty as equal)
      const current = (f.currentValue ?? '').trim().toLowerCase();
      const suggested = (f.suggestedValue ?? '').trim().toLowerCase();
      // Skip if values are the same
      if (current === suggested) return false;
      return true;
    });
  }, [fields]);
  const reviewedFields = useMemo(() => fields.filter((f) => f.status !== 'PENDING'), [fields]);

  // Quick mode toggle
  const toggleField = (name: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleQuickConfirm = () => {
    const toConfirm = Array.from(selectedFields);
    if (toConfirm.length > 0) {
      onConfirm(toConfirm);
    }
  };

  const handleQuickRejectRest = () => {
    const toReject = pendingFields
      .filter((f) => !selectedFields.has(f.name))
      .map((f) => f.name);
    if (toReject.length > 0) {
      onReject(toReject);
    }
  };

  const handleQuickConfirmAndRejectRest = () => {
    const toConfirm = Array.from(selectedFields);
    const toReject = pendingFields
      .filter((f) => !selectedFields.has(f.name))
      .map((f) => f.name);
    if (toConfirm.length > 0) onConfirm(toConfirm);
    if (toReject.length > 0) onReject(toReject);
  };

  // Detailed mode handlers
  const currentField = pendingFields[currentStep];
  const isLastStep = currentStep >= pendingFields.length - 1;
  const showSummary = currentStep >= pendingFields.length;

  const handleDetailedConfirm = () => {
    if (!currentField) return;
    setDecisions((prev) => ({ ...prev, [currentField.name]: 'confirm' }));
    onConfirm([currentField.name]);
    if (isLastStep) {
      setCurrentStep(pendingFields.length); // show summary
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleDetailedReject = () => {
    if (!currentField) return;
    setDecisions((prev) => ({ ...prev, [currentField.name]: 'reject' }));
    onReject([currentField.name]);
    if (isLastStep) {
      setCurrentStep(pendingFields.length);
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleDetailedEdit = (editedValue: string) => {
    if (!currentField) return;
    setDecisions((prev) => ({ ...prev, [currentField.name]: 'edit' }));
    onEdit(currentField.name, editedValue);
    if (isLastStep) {
      setCurrentStep(pendingFields.length);
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  if (pendingFields.length === 0 && reviewedFields.length > 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
        <p className="text-sm font-medium text-green-800">
          Todos los campos han sido revisados
        </p>
        <p className="mt-1 text-xs text-green-600">
          {reviewedFields.filter((f) => f.status === 'CONFIRMED').length} aceptados,{' '}
          {reviewedFields.filter((f) => f.status === 'REJECTED').length} rechazados
        </p>
      </div>
    );
  }

  if (pendingFields.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
        No hay campos para revisar
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Mode toggle */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() => setMode('quick')}
          className={`rounded px-3 py-1.5 text-xs font-medium ${
            mode === 'quick'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Revisión Rápida
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('detailed');
            setCurrentStep(0);
          }}
          className={`rounded px-3 py-1.5 text-xs font-medium ${
            mode === 'detailed'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Revisión Detallada
        </button>
        <span className="ml-auto text-xs text-gray-500">
          {pendingFields.length} campo{pendingFields.length !== 1 ? 's' : ''} pendiente
          {pendingFields.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Quick mode */}
      {mode === 'quick' && (
        <div className="flex flex-col gap-3">
          {pendingFields.map((field) => (
            <label
              key={field.name}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                selectedFields.has(field.name)
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedFields.has(field.name)}
                onChange={() => toggleField(field.name)}
                disabled={isReviewing}
                className="rounded text-blue-600"
              />
              <div className="flex flex-1 flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{field.label}</span>
                  <ConfidenceBadge score={field.confidence} />
                </div>
                <div className="mt-1 text-xs text-gray-500 break-words">
                  {field.currentValue ? (
                    <span className="block text-gray-400 line-through">{field.currentValue}</span>
                  ) : (
                    <span className="block text-gray-400 italic">(vacío)</span>
                  )}
                  <span className="block text-gray-700">{field.suggestedValue}</span>
                </div>
              </div>
            </label>
          ))}

          {/* Quick mode actions */}
          <div className="flex items-center gap-3 border-t border-gray-200 pt-3">
            <button
              type="button"
              onClick={handleQuickConfirmAndRejectRest}
              disabled={isReviewing || selectedFields.size === 0}
              className="flex-1 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isReviewing
                ? 'Procesando...'
                : `Aceptar ${selectedFields.size} / Rechazar ${pendingFields.length - selectedFields.size}`}
            </button>
            <button
              type="button"
              onClick={handleQuickConfirm}
              disabled={isReviewing || selectedFields.size === 0}
              className="rounded border border-green-300 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
            >
              Solo aceptar
            </button>
            <button
              type="button"
              onClick={handleQuickRejectRest}
              disabled={isReviewing || selectedFields.size === pendingFields.length}
              className="rounded border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Rechazar resto
            </button>
          </div>
        </div>
      )}

      {/* Detailed mode */}
      {mode === 'detailed' && !showSummary && currentField && (
        <div className="flex flex-col gap-4">
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-1.5">
            {pendingFields.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentStep(i)}
                className={`h-2.5 w-2.5 rounded-full transition-colors ${
                  i === currentStep
                    ? 'bg-blue-600'
                    : i < currentStep
                      ? decisions[pendingFields[i].name] === 'confirm' ||
                        decisions[pendingFields[i].name] === 'edit'
                        ? 'bg-green-400'
                        : 'bg-red-400'
                      : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Step counter */}
          <p className="text-center text-xs text-gray-500">
            Campo {currentStep + 1} de {pendingFields.length}
          </p>

          {/* Current field card */}
          <FieldReviewCard
            fieldName={currentField.name}
            fieldLabel={currentField.label}
            currentValue={currentField.currentValue}
            suggestedValue={currentField.suggestedValue}
            confidence={currentField.confidence}
            providers={currentField.providers}
            status={currentField.status}
            fieldType={currentField.fieldType}
            onConfirm={handleDetailedConfirm}
            onReject={handleDetailedReject}
            onEdit={handleDetailedEdit}
            disabled={isReviewing}
          />

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
              disabled={currentStep === 0}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30"
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.min(pendingFields.length, s + 1))}
              disabled={isLastStep}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Detailed mode summary */}
      {mode === 'detailed' && showSummary && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <h4 className="mb-2 text-sm font-semibold text-green-800">
            Revisión completada
          </h4>
          <ul className="flex flex-col gap-1">
            {pendingFields.map((f) => {
              const decision = decisions[f.name];
              return (
                <li key={f.name} className="flex items-center gap-2 text-xs">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      decision === 'confirm' || decision === 'edit'
                        ? 'bg-green-500'
                        : decision === 'reject'
                          ? 'bg-red-500'
                          : 'bg-gray-300'
                    }`}
                  />
                  <span className="text-gray-700">{f.label}</span>
                  <span className="text-gray-500">
                    {decision === 'confirm'
                      ? '— aceptado'
                      : decision === 'edit'
                        ? '— editado y aceptado'
                        : decision === 'reject'
                          ? '— rechazado'
                          : '— sin revisar'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
