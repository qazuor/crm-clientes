'use client';

import { useState } from 'react';
import { useBulkEnrichment } from '@/hooks/useBulkEnrichment';
import { Button } from '@/components/ui/Button';
import {
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

export default function BulkEnrichmentPage() {
  const {
    stats,
    pendingClients,
    isLoading,
    isEnriching,
    enrich,
    enrichResult,
    enrichError,
    refetch,
  } = useBulkEnrichment();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [includeAI, setIncludeAI] = useState(true);
  const [includeWebsite, setIncludeWebsite] = useState(true);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === pendingClients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingClients.map((c) => c.id)));
    }
  };

  const handleEnrich = async () => {
    if (selectedIds.size === 0) return;

    try {
      await enrich({
        clienteIds: Array.from(selectedIds),
        includeAI,
        includeWebsiteAnalysis: includeWebsite,
      });
      setSelectedIds(new Set());
    } catch {
      // Error handled by hook
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enriquecimiento en Bloque</h1>
          <p className="text-sm text-gray-500 mt-1">
            Enriquece multiples clientes a la vez (maximo 50)
          </p>
        </div>
        <Button onClick={() => refetch()} variant="secondary" disabled={isLoading}>
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total Clientes" value={stats.totalClients} />
          <StatCard
            label="Con Enriquecimiento IA"
            value={stats.enrichedClients}
            color="green"
          />
          <StatCard
            label="Con Analisis Web"
            value={stats.analyzedWebsites}
            color="blue"
          />
          <StatCard
            label="Pendientes IA"
            value={stats.pendingEnrichment}
            color="yellow"
          />
          <StatCard
            label="Pendientes Web"
            value={stats.pendingAnalysis}
            color="orange"
          />
        </div>
      )}

      {/* Error Display */}
      {enrichError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <XCircleIcon className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-sm text-red-600">{enrichError.message}</p>
          </div>
        </div>
      )}

      {/* Results Display */}
      {enrichResult && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center mb-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
            <p className="text-sm font-medium text-green-800">
              Enriquecimiento completado: {enrichResult.successful} exitosos, {enrichResult.failed}{' '}
              fallidos
            </p>
          </div>
          {enrichResult.failed > 0 && (
            <div className="mt-2 text-sm text-green-700">
              <p className="font-medium">Errores:</p>
              <ul className="list-disc list-inside">
                {enrichResult.results
                  .filter((r) => !r.success)
                  .map((r) => (
                    <li key={r.clienteId}>
                      {r.clienteName}: {r.error}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Options */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Opciones de Enriquecimiento</h3>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAI}
              onChange={(e) => setIncludeAI(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Enriquecimiento IA</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeWebsite}
              onChange={(e) => setIncludeWebsite(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Analisis de Website</span>
          </label>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-lg border p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.size === pendingClients.length && pendingClients.length > 0}
              onChange={selectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Seleccionar todos</span>
          </label>
          <span className="text-sm text-gray-500">
            {selectedIds.size} de {pendingClients.length} seleccionados
          </span>
        </div>
        <Button
          onClick={handleEnrich}
          disabled={selectedIds.size === 0 || isEnriching || (!includeAI && !includeWebsite)}
        >
          {isEnriching ? (
            <>
              <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <SparklesIcon className="h-4 w-4 mr-2" />
              Enriquecer ({selectedIds.size})
            </>
          )}
        </Button>
      </div>

      {/* Pending Clients List */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900">
            Clientes Pendientes de Enriquecimiento
          </h3>
        </div>

        {pendingClients.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
            <p className="mt-2 text-sm text-gray-500">
              Todos los clientes estan enriquecidos
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {pendingClients.map((client) => (
              <div
                key={client.id}
                className={`px-4 py-3 flex items-center justify-between hover:bg-gray-50 ${
                  selectedIds.has(client.id) ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(client.id)}
                    onChange={() => toggleSelect(client.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{client.nombre}</p>
                    {client.sitioWeb && (
                      <p className="text-xs text-gray-500">{client.sitioWeb}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {client.hasEnrichment ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      IA OK
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      Sin IA
                    </span>
                  )}
                  {client.sitioWeb && (
                    client.hasWebsiteAnalysis ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Web OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        Sin Web
                      </span>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Warning */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
          <div className="text-sm text-yellow-700">
            <p className="font-medium">Consideraciones importantes:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>El enriquecimiento consume cuota de APIs (IA, screenshots, PageSpeed)</li>
              <li>Maximo 50 clientes por operacion</li>
              <li>El proceso puede tomar varios minutos dependiendo de la cantidad</li>
              <li>Los screenshots consumen ~33/dia (limite gratuito)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  color?: 'default' | 'green' | 'blue' | 'yellow' | 'orange';
}

function StatCard({ label, value, color = 'default' }: StatCardProps) {
  const colors = {
    default: 'bg-gray-100 text-gray-900',
    green: 'bg-green-100 text-green-900',
    blue: 'bg-blue-100 text-blue-900',
    yellow: 'bg-yellow-100 text-yellow-900',
    orange: 'bg-orange-100 text-orange-900',
  };

  return (
    <div className={`rounded-lg p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
