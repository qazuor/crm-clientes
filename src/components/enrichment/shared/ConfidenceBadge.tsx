'use client';

interface ConfidenceBadgeProps {
  /** Score between 0 and 1 (or 0 and 100). Values > 1 are treated as percentages. */
  score: number;
  size?: 'sm' | 'md';
}

/**
 * Color-coded badge showing a confidence percentage.
 */
export function ConfidenceBadge({ score, size = 'sm' }: ConfidenceBadgeProps) {
  const pct = score > 1 ? Math.round(score) : Math.round(score * 100);

  let colorClass: string;
  if (pct >= 80) {
    colorClass = 'bg-green-100 text-green-800';
  } else if (pct >= 60) {
    colorClass = 'bg-yellow-100 text-yellow-800';
  } else if (pct >= 40) {
    colorClass = 'bg-orange-100 text-orange-800';
  } else {
    colorClass = 'bg-red-100 text-red-800';
  }

  const sizeClass = size === 'md' ? 'px-2 py-0.5 text-sm' : 'px-1.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded font-medium ${colorClass} ${sizeClass}`}
      title={`Confianza: ${pct}%`}
    >
      {pct}%
    </span>
  );
}
