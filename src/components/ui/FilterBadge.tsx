'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface FilterBadgeProps {
  /** Label shown on the badge */
  readonly label: string;
  /** Value displayed next to the label */
  readonly value: string;
  /** Callback when the badge is dismissed */
  readonly onRemove: () => void;
  /** Additional CSS classes */
  readonly className?: string;
}

/**
 * A badge that shows an active filter with a remove button.
 * Used in filter bars to indicate and clear active filters.
 */
function FilterBadge({ label, value, onRemove, className }: FilterBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200',
        className,
      )}
    >
      <span className="text-blue-500">{label}:</span>
      <span>{value}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600 transition-colors"
        aria-label={`Eliminar filtro ${label}`}
      >
        <XMarkIcon className="h-3 w-3" />
      </button>
    </span>
  );
}

interface FilterBadgeGroupProps {
  /** Total number of active filters */
  readonly count: number;
  /** Callback to clear all filters */
  readonly onClearAll: () => void;
  /** The individual FilterBadge components */
  readonly children: React.ReactNode;
  /** Additional CSS classes */
  readonly className?: string;
}

/**
 * Container for FilterBadge components with a counter and clear all button.
 */
function FilterBadgeGroup({ count, onClearAll, children, className }: FilterBadgeGroupProps) {
  if (count === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-xs font-medium text-gray-500">
        {count} filtro{count !== 1 ? 's' : ''} activo{count !== 1 ? 's' : ''}:
      </span>
      {children}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
      >
        Limpiar todos
      </button>
    </div>
  );
}

export { FilterBadge, FilterBadgeGroup };
export type { FilterBadgeProps, FilterBadgeGroupProps };
