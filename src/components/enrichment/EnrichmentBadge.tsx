'use client';

import { useAIEnrichmentData } from '@/hooks/useAIEnrichment';

interface EnrichmentBadgeProps {
  clienteId: string;
}

/**
 * Small badge showing enrichment status for a client
 */
export function EnrichmentBadge({ clienteId }: EnrichmentBadgeProps) {
  const { data, isLoading } = useAIEnrichmentData(clienteId);

  if (isLoading) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
        ...
      </span>
    );
  }

  if (!data?.enrichment) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
        Sin datos IA
      </span>
    );
  }

  // Count how many fields have data
  const enrichment = data.enrichment;
  let fieldsWithData = 0;
  let totalScore = 0;
  let scoreCount = 0;

  if (enrichment.website) {
    fieldsWithData++;
    if (enrichment.websiteScore) {
      totalScore += enrichment.websiteScore;
      scoreCount++;
    }
  }
  if (enrichment.industry) {
    fieldsWithData++;
    if (enrichment.industryScore) {
      totalScore += enrichment.industryScore;
      scoreCount++;
    }
  }
  if (enrichment.description) {
    fieldsWithData++;
    if (enrichment.descriptionScore) {
      totalScore += enrichment.descriptionScore;
      scoreCount++;
    }
  }
  if (enrichment.emails && enrichment.emails.length > 0) fieldsWithData++;
  if (enrichment.phones && enrichment.phones.length > 0) fieldsWithData++;
  if (enrichment.socialProfiles && Object.keys(enrichment.socialProfiles).length > 0) fieldsWithData++;

  const avgScore = scoreCount > 0 ? totalScore / scoreCount : 0;
  const percentage = Math.round(avgScore * 100);

  let colorClass = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  if (avgScore >= 0.8) {
    colorClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  } else if (avgScore >= 0.6) {
    colorClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  } else if (avgScore >= 0.4) {
    colorClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}
      title={`${fieldsWithData} campos enriquecidos, confianza promedio: ${percentage}%`}
    >
      IA: {fieldsWithData} campos ({percentage}%)
    </span>
  );
}

export default EnrichmentBadge;
