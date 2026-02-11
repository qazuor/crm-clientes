'use client';

import { useState } from 'react';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import type { QuotaInfo } from '@/hooks/useQuotas';

const SERVICE_LABELS: Record<string, { name: string; description: string }> = {
  screenshots: {
    name: 'Screenshots',
    description: 'Capturas de pantalla de sitios web',
  },
  pagespeed: {
    name: 'PageSpeed',
    description: 'Análisis de rendimiento',
  },
  serpapi: {
    name: 'SerpAPI',
    description: 'Búsqueda de información',
  },
  builtwith: {
    name: 'BuiltWith',
    description: 'Detección de tecnologías',
  },
};

export { SERVICE_LABELS };

export function QuotaCard({
  quota,
  onUpdateThreshold,
}: {
  quota: QuotaInfo;
  onUpdateThreshold?: (threshold: number) => void;
}) {
  const [showThresholdEditor, setShowThresholdEditor] = useState(false);
  const [newThreshold, setNewThreshold] = useState(quota.alertThreshold ?? 80);

  const info = SERVICE_LABELS[quota.service] ?? {
    name: quota.service,
    description: 'Servicio externo',
  };

  const isWarning = quota.percentage >= 80;
  const isCritical = quota.percentage >= 95;

  const getStatusColor = () => {
    if (isCritical) return 'text-red-600 bg-red-50';
    if (isWarning) return 'text-amber-600 bg-amber-50';
    return 'text-green-600 bg-green-50';
  };

  const getProgressColor = () => {
    if (isCritical) return 'bg-red-500';
    if (isWarning) return 'bg-amber-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{info.name}</h3>
          <p className="text-xs text-gray-500">{info.description}</p>
        </div>
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}
        >
          {isCritical ? (
            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
          ) : (
            <CheckCircleIcon className="h-3 w-3 mr-1" />
          )}
          {quota.available} disponibles
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>
            {quota.used} / {quota.limit}
          </span>
          <span>{quota.percentage.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${Math.min(quota.percentage, 100)}%` }}
          />
          {/* Alert threshold marker */}
          {quota.alertThreshold && (
            <div
              className="absolute top-0 h-full w-0.5 bg-amber-600"
              style={{ left: `${quota.alertThreshold}%` }}
              title={`Alerta: ${quota.alertThreshold}%`}
            />
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center py-2 border-t border-gray-100">
        <div>
          <div className="text-lg font-semibold text-gray-900">
            {quota.successCount ?? 0}
          </div>
          <div className="text-xs text-gray-500">Exitosas</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-gray-900">
            {quota.errorCount ?? 0}
          </div>
          <div className="text-xs text-gray-500">Errores</div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900 flex items-center justify-center gap-1">
            <ClockIcon className="h-4 w-4" />
            {quota.resetIn}
          </div>
          <div className="text-xs text-gray-500">Reset</div>
        </div>
      </div>

      {/* Alert Threshold Editor */}
      {onUpdateThreshold && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          {showThresholdEditor ? (
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="50"
                max="100"
                value={newThreshold}
                onChange={(e) => setNewThreshold(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-gray-600 w-10">{newThreshold}%</span>
              <Button
                size="sm"
                onClick={() => {
                  onUpdateThreshold(newThreshold);
                  setShowThresholdEditor(false);
                }}
              >
                Guardar
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowThresholdEditor(false)}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowThresholdEditor(true)}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <BellAlertIcon className="h-3 w-3" />
              Alerta al {quota.alertThreshold ?? 80}%
            </button>
          )}
        </div>
      )}

      {/* Last Error */}
      {quota.lastError && (
        <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
          <strong>Último error:</strong> {quota.lastError}
        </div>
      )}
    </div>
  );
}
