'use client';

import { useState } from 'react';
import { DiffLine } from './DiffLine';
import { ConfidenceBadge } from './ConfidenceBadge';
import { FieldEditInput } from './FieldEditInput';
import { ProviderBadges } from './ProviderBadges';
import type { FieldReviewStatus } from '@/types/enrichment';

type FieldType = 'text' | 'email' | 'phone' | 'url';

interface FieldReviewCardProps {
  fieldName: string;
  fieldLabel: string;
  currentValue: string | null;
  suggestedValue: string;
  confidence: number;
  providers?: string[];
  status: FieldReviewStatus;
  fieldType?: FieldType;
  onConfirm: () => void;
  onReject: () => void;
  onEdit: (editedValue: string) => void;
  disabled?: boolean;
}

const STATUS_LABELS: Record<FieldReviewStatus, { text: string; color: string }> = {
  PENDING: { text: 'Pendiente', color: 'bg-amber-100 text-amber-800' },
  CONFIRMED: { text: 'Aceptado', color: 'bg-green-100 text-green-800' },
  REJECTED: { text: 'Rechazado', color: 'bg-red-100 text-red-800' },
};

/**
 * Card component for reviewing a single enriched field.
 * Shows current vs suggested value, confidence, and accept/reject/edit actions.
 */
export function FieldReviewCard({
  fieldName,
  fieldLabel,
  currentValue,
  suggestedValue,
  confidence,
  providers,
  status,
  fieldType = 'text',
  onConfirm,
  onReject,
  onEdit,
  disabled = false,
}: FieldReviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(suggestedValue);

  const isReviewed = status !== 'PENDING';
  const statusInfo = STATUS_LABELS[status];

  const handleEditSave = () => {
    onEdit(editValue);
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditValue(suggestedValue);
    setIsEditing(false);
  };

  return (
    <div
      className={`rounded-lg border p-4 ${
        status === 'PENDING'
          ? 'border-amber-200 bg-amber-50/50'
          : status === 'CONFIRMED'
            ? 'border-green-200 bg-green-50/30'
            : 'border-red-200 bg-red-50/30'
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-gray-900">{fieldLabel}</h4>
          <ConfidenceBadge score={confidence} />
        </div>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>
          {statusInfo.text}
        </span>
      </div>

      {/* Value diff or edit input */}
      {isEditing ? (
        <FieldEditInput
          value={editValue}
          onChange={setEditValue}
          onSave={handleEditSave}
          onCancel={handleEditCancel}
          fieldType={fieldType}
        />
      ) : (
        <DiffLine
          fieldName={fieldName}
          currentValue={currentValue}
          suggestedValue={suggestedValue}
        />
      )}

      {/* Providers */}
      {providers && providers.length > 0 && (
        <div className="mt-2">
          <ProviderBadges providers={providers} />
        </div>
      )}

      {/* Actions */}
      {!isReviewed && !isEditing && !disabled && (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
          >
            Aceptar
          </button>
          <button
            type="button"
            onClick={onReject}
            className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Editar
          </button>
        </div>
      )}
    </div>
  );
}
