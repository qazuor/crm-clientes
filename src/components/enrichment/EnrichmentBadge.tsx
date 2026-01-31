'use client';

import { useEnrichment } from '@/hooks/useEnrichment';

interface EnrichmentBadgeProps {
  clienteId: string;
}

/**
 * Small badge showing enrichment status for a client.
 * Uses the unified useEnrichment hook.
 */
export function EnrichmentBadge({ clienteId }: EnrichmentBadgeProps) {
  const { latestEnrichment, enrichmentStatus, isLoading } = useEnrichment(clienteId);

  if (isLoading) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
        ...
      </span>
    );
  }

  if (enrichmentStatus === 'NONE' || !latestEnrichment) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
        Sin datos IA
      </span>
    );
  }

  if (enrichmentStatus === 'PENDING') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
        IA: Pendiente
      </span>
    );
  }

  // Count fields with data and compute average score
  let fieldsWithData = 0;
  let totalScore = 0;
  let scoreCount = 0;

  if (latestEnrichment.website) {
    fieldsWithData++;
    if (latestEnrichment.websiteScore) {
      totalScore += latestEnrichment.websiteScore;
      scoreCount++;
    }
  }
  if (latestEnrichment.industry) {
    fieldsWithData++;
    if (latestEnrichment.industryScore) {
      totalScore += latestEnrichment.industryScore;
      scoreCount++;
    }
  }
  if (latestEnrichment.description) {
    fieldsWithData++;
    if (latestEnrichment.descriptionScore) {
      totalScore += latestEnrichment.descriptionScore;
      scoreCount++;
    }
  }
  if (latestEnrichment.emails && Array.isArray(latestEnrichment.emails) && latestEnrichment.emails.length > 0) fieldsWithData++;
  if (latestEnrichment.phones && Array.isArray(latestEnrichment.phones) && latestEnrichment.phones.length > 0) fieldsWithData++;
  if (latestEnrichment.socialProfiles && typeof latestEnrichment.socialProfiles === 'object' && Object.keys(latestEnrichment.socialProfiles).length > 0) fieldsWithData++;

  const avgScore = scoreCount > 0 ? totalScore / scoreCount : 0;
  const percentage = Math.round(avgScore * 100);

  let colorClass = 'bg-red-100 text-red-800';
  if (avgScore >= 0.8) {
    colorClass = 'bg-green-100 text-green-800';
  } else if (avgScore >= 0.6) {
    colorClass = 'bg-yellow-100 text-yellow-800';
  } else if (avgScore >= 0.4) {
    colorClass = 'bg-orange-100 text-orange-800';
  }

  const statusLabel = enrichmentStatus === 'COMPLETE' ? '✓' : enrichmentStatus === 'PARTIAL' ? '~' : '';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}
      title={`${fieldsWithData} campos enriquecidos, confianza promedio: ${percentage}%`}
    >
      IA: {fieldsWithData} campos ({percentage}%) {statusLabel}
    </span>
  );
}

export default EnrichmentBadge;
