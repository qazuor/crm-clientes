'use client';

import { useState } from 'react';
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { useQuotas, QuotaInfo, QuotaHistoryEntry } from '@/hooks/useQuotas';

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

type TabType = 'status' | 'history' | 'alerts';

function QuotaCard({
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

function MiniBarChart({
  data,
  maxValue,
  label,
  color = 'bg-blue-500',
}: {
  data: number[];
  maxValue: number;
  label: string;
  color?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="text-center text-gray-400 text-xs py-4">Sin datos</div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-end justify-center gap-1 h-16">
        {data.map((value, index) => {
          const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
          return (
            <div
              key={index}
              className={`w-3 ${color} rounded-t transition-all duration-300 opacity-70 hover:opacity-100`}
              style={{ height: `${Math.max(height, 4)}%` }}
              title={`${value}`}
            />
          );
        })}
      </div>
      <div className="text-xs text-gray-500 text-center">{label}</div>
    </div>
  );
}

function HistoryChart({
  history,
  service,
}: {
  history: QuotaHistoryEntry[];
  service: string;
}) {
  const info = SERVICE_LABELS[service] ?? { name: service };
  const usedData = history.map((h) => h.used);
  const successData = history.map((h) => h.success);
  const errorData = history.map((h) => h.errors);
  const maxUsed = Math.max(...usedData, 1);
  const maxSuccess = Math.max(...successData, 1);
  const maxErrors = Math.max(...errorData, 1);

  const totalUsed = usedData.reduce((a, b) => a + b, 0);
  const totalSuccess = successData.reduce((a, b) => a + b, 0);
  const totalErrors = errorData.reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-medium text-gray-900 mb-4">{info.name}</h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <MiniBarChart
            data={usedData}
            maxValue={maxUsed}
            label={`Uso (${totalUsed})`}
            color="bg-blue-500"
          />
        </div>
        <div>
          <MiniBarChart
            data={successData}
            maxValue={maxSuccess}
            label={`Éxitos (${totalSuccess})`}
            color="bg-green-500"
          />
        </div>
        <div>
          <MiniBarChart
            data={errorData}
            maxValue={maxErrors}
            label={`Errores (${totalErrors})`}
            color="bg-red-500"
          />
        </div>
      </div>
      {history.length > 0 && (
        <div className="mt-3 text-xs text-gray-400 text-center">
          Últimos {history.length} días
        </div>
      )}
    </div>
  );
}

function AlertsList({
  alerts,
}: {
  alerts: Array<{
    service: string;
    percentage: number;
    used: number;
    limit: number;
    threshold: number;
  }>;
}) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <BellAlertIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No hay alertas activas</p>
        <p className="text-xs text-gray-400 mt-1">
          Las alertas se generan cuando el uso supera el umbral configurado
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => {
        const info = SERVICE_LABELS[alert.service] ?? { name: alert.service };
        return (
          <div
            key={index}
            className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg"
          >
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-amber-800">{info.name}</div>
              <div className="text-sm text-amber-600">
                Uso al {alert.percentage.toFixed(1)}% ({alert.used}/{alert.limit}) - Umbral: {alert.threshold}%
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function QuotaDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('status');
  const [historyDays, setHistoryDays] = useState(7);

  const {
    quotas,
    totalUsed,
    totalLimit,
    totalPercentage,
    isLoading,
    error,
    refetch,
    history,
    alerts,
    isLoadingHistory,
    updateThreshold,
    isUpdating,
  } = useQuotas(historyDays);

  const tabs: { id: TabType; label: string; icon: typeof ChartBarIcon }[] = [
    { id: 'status', label: 'Estado Actual', icon: CheckCircleIcon },
    { id: 'history', label: 'Historial', icon: ChartBarIcon },
    { id: 'alerts', label: `Alertas${alerts.length > 0 ? ` (${alerts.length})` : ''}`, icon: BellAlertIcon },
  ];

  if (isLoading && quotas.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Dashboard de Quotas
          </h2>
          <p className="text-sm text-gray-500">
            Monitorea el uso de las APIs externas
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <ArrowPathIcon
            className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
          />
          Actualizar
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error instanceof Error ? error.message : 'Error desconocido'}
        </div>
      )}

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium opacity-90">Uso Total</h3>
            <div className="text-3xl font-bold mt-1">
              {totalUsed.toLocaleString()} / {totalLimit.toLocaleString()}
            </div>
            <p className="text-sm opacity-75 mt-1">
              {totalPercentage.toFixed(1)}% del límite diario
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-75">Servicios activos</div>
            <div className="text-2xl font-bold">{quotas.length}</div>
            {alerts.length > 0 && (
              <div className="text-sm opacity-75 mt-1">
                <BellAlertIcon className="h-4 w-4 inline mr-1" />
                {alerts.length} alerta{alerts.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
        <div className="mt-4">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${Math.min(totalPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'status' && (
        <>
          {quotas.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <p className="text-gray-500">No hay datos de quotas disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quotas.map((quota) => (
                <QuotaCard
                  key={quota.service}
                  quota={quota}
                  onUpdateThreshold={(threshold) =>
                    updateThreshold(quota.service, threshold)
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Period selector */}
          <div className="flex items-center justify-end gap-2">
            <span className="text-sm text-gray-500">Período:</span>
            <select
              value={historyDays}
              onChange={(e) => setHistoryDays(Number(e.target.value))}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value={7}>7 días</option>
              <option value={14}>14 días</option>
              <option value={30}>30 días</option>
            </select>
          </div>

          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
            </div>
          ) : Object.keys(history).length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <ChartBarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No hay historial disponible</p>
              <p className="text-xs text-gray-400 mt-1">
                El historial se genera automáticamente cada día
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(history).map(([service, serviceHistory]) => (
                <HistoryChart
                  key={service}
                  service={service}
                  history={serviceHistory}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'alerts' && <AlertsList alerts={alerts} />}

      {/* Info */}
      <div className="text-xs text-gray-400 text-center">
        Las quotas se resetean automáticamente cada día a medianoche (hora del
        servidor)
        {isUpdating && ' • Guardando cambios...'}
      </div>
    </div>
  );
}
