'use client';

interface EnrichmentProgressProps {
  isLoading: boolean;
  currentStep?: string;
  totalProviders?: number;
  completedProviders?: number;
  fieldsFound?: number;
  /** Bulk mode: current client index */
  clientIndex?: number;
  /** Bulk mode: total clients */
  clientTotal?: number;
}

/**
 * Progress indicator shown during enrichment execution.
 */
export function EnrichmentProgress({
  isLoading,
  currentStep,
  totalProviders,
  completedProviders,
  fieldsFound,
  clientIndex,
  clientTotal,
}: EnrichmentProgressProps) {
  if (!isLoading) return null;

  const providerPct =
    totalProviders && completedProviders
      ? Math.round((completedProviders / totalProviders) * 100)
      : null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
      {/* Bulk client progress */}
      {clientTotal != null && clientTotal > 1 && clientIndex != null && (
        <div className="text-sm font-medium text-blue-800">
          Procesando cliente {clientIndex + 1} de {clientTotal}...
        </div>
      )}

      {/* Provider progress bar */}
      <div className="flex flex-col gap-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-blue-200">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${providerPct ?? 0}%` }}
          />
        </div>
        {totalProviders != null && completedProviders != null && (
          <span className="text-xs text-blue-700">
            {completedProviders} / {totalProviders} proveedores
          </span>
        )}
      </div>

      {/* Current step */}
      {currentStep && (
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {currentStep}
        </div>
      )}

      {/* Fields found counter */}
      {fieldsFound != null && fieldsFound > 0 && (
        <span className="text-xs text-blue-600">
          {fieldsFound} campo{fieldsFound !== 1 ? 's' : ''} encontrado
          {fieldsFound !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
