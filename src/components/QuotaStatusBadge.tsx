'use client';

import { useQuotaStatus, QuotaInfo } from '@/hooks/useQuotas';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface QuotaStatusBadgeProps {
  service?: 'screenshots' | 'pagespeed' | 'serpapi' | 'builtwith';
  showAll?: boolean;
  compact?: boolean;
}

const SERVICE_NAMES: Record<string, string> = {
  screenshots: 'Screenshots',
  pagespeed: 'PageSpeed',
  serpapi: 'SerpAPI',
  builtwith: 'BuiltWith',
};

/**
 * Compact quota status badge for display in client detail or enrichment UI
 */
export function QuotaStatusBadge({
  service,
  showAll = false,
  compact = true,
}: QuotaStatusBadgeProps) {
  const { data: quotas = [], isLoading, isError } = useQuotaStatus();

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-1 text-xs text-gray-400">
        <div className="h-2 w-2 rounded-full bg-gray-300 animate-pulse" />
        Cargando...
      </div>
    );
  }

  if (isError || quotas.length === 0) {
    return null;
  }

  const filteredQuotas = service
    ? quotas.filter((q) => q.service === service)
    : showAll
      ? quotas
      : quotas.filter((q) => q.percentage >= 80); // Only show critical ones by default

  if (filteredQuotas.length === 0 && !service) {
    return (
      <div className="inline-flex items-center gap-1 text-xs text-green-600">
        <CheckCircleIcon className="h-3 w-3" />
        Quotas OK
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {filteredQuotas.map((quota) => {
          const isWarning = quota.percentage >= 80;
          const isCritical = quota.percentage >= 95;
          const colorClass = isCritical
            ? 'bg-red-100 text-red-700 border-red-200'
            : isWarning
              ? 'bg-amber-100 text-amber-700 border-amber-200'
              : 'bg-green-100 text-green-700 border-green-200';

          return (
            <div
              key={quota.service}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${colorClass}`}
              title={`${SERVICE_NAMES[quota.service]}: ${quota.used}/${quota.limit} (${quota.percentage.toFixed(1)}%)`}
            >
              {isCritical && <ExclamationTriangleIcon className="h-3 w-3" />}
              <span className="font-medium">{SERVICE_NAMES[quota.service]}</span>
              <span>{quota.available}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Detailed view
  return (
    <div className="space-y-2">
      {filteredQuotas.map((quota) => {
        const isWarning = quota.percentage >= 80;
        const isCritical = quota.percentage >= 95;
        const progressColor = isCritical
          ? 'bg-red-500'
          : isWarning
            ? 'bg-amber-500'
            : 'bg-green-500';

        return (
          <div key={quota.service} className="text-sm">
            <div className="flex justify-between text-gray-600 mb-1">
              <span>{SERVICE_NAMES[quota.service]}</span>
              <span className="font-medium">
                {quota.used}/{quota.limit} ({quota.available} disp.)
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progressColor}`}
                style={{ width: `${Math.min(quota.percentage, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Mini quota indicator for enrichment buttons
 */
export function QuotaMiniIndicator({
  services,
}: {
  services: ('screenshots' | 'pagespeed' | 'serpapi' | 'builtwith')[];
}) {
  const { data: quotas = [], isLoading } = useQuotaStatus();

  if (isLoading) return null;

  const relevantQuotas = quotas.filter((q) =>
    services.includes(q.service as 'screenshots' | 'pagespeed' | 'serpapi' | 'builtwith')
  );

  const hasQuota = relevantQuotas.every((q) => q.available > 0);
  const anyWarning = relevantQuotas.some((q) => q.percentage >= 80);
  const anyCritical = relevantQuotas.some((q) => q.percentage >= 95);

  if (!hasQuota) {
    return (
      <span className="text-xs text-red-600" title="Sin quota disponible">
        (sin quota)
      </span>
    );
  }

  if (anyCritical) {
    return (
      <span className="text-xs text-red-500" title="Quota crítica">
        <ExclamationTriangleIcon className="h-3 w-3 inline" />
      </span>
    );
  }

  if (anyWarning) {
    return (
      <span className="text-xs text-amber-500" title="Quota baja">
        <ExclamationTriangleIcon className="h-3 w-3 inline" />
      </span>
    );
  }

  return null;
}

/**
 * Full quota panel for enrichment modal
 */
export function QuotaPanel() {
  const { data: quotas = [], isLoading } = useQuotaStatus();

  // Calculate totals
  const totalUsed = quotas.reduce((sum, q) => sum + q.used, 0);
  const totalLimit = quotas.reduce((sum, q) => sum + q.limit, 0);
  const totalPercentage = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
        <div className="h-2 bg-gray-200 rounded w-full" />
      </div>
    );
  }

  const isCritical = totalPercentage >= 90;
  const isWarning = totalPercentage >= 70;

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">Quotas de APIs</h4>
        <span
          className={`text-xs font-medium ${
            isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-green-600'
          }`}
        >
          {totalUsed}/{totalLimit} usados
        </span>
      </div>

      <div className="space-y-2">
        {quotas.map((quota) => {
          const percentage = quota.percentage;
          const barColor =
            percentage >= 95
              ? 'bg-red-500'
              : percentage >= 80
                ? 'bg-amber-500'
                : 'bg-green-500';

          return (
            <div key={quota.service}>
              <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                <span>{SERVICE_NAMES[quota.service]}</span>
                <span>
                  {quota.available} disponibles
                </span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-gray-500 text-center">
        Reset diario a medianoche
      </div>
    </div>
  );
}
