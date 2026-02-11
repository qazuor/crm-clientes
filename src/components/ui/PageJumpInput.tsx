'use client';

import { useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { cn } from '@/lib/utils';

interface PageJumpInputProps {
  /** Current active page (1-based) */
  readonly currentPage: number;
  /** Total number of pages */
  readonly totalPages: number;
  /** Callback when user jumps to a page */
  readonly onPageChange: (page: number) => void;
  /** Additional CSS classes */
  readonly className?: string;
}

/**
 * Input component for jumping to a specific page in paginated data.
 * Validates that the entered page is within the valid range.
 */
function PageJumpInput({ currentPage, totalPages, onPageChange, className }: PageJumpInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const page = parseInt(value, 10);
      if (!Number.isNaN(page) && page >= 1 && page <= totalPages) {
        onPageChange(page);
        setValue('');
      }
    },
    [value, totalPages, onPageChange],
  );

  if (totalPages <= 1) return null;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('flex items-center gap-1.5 text-sm', className)}
    >
      <label htmlFor="page-jump" className="text-gray-500 whitespace-nowrap">
        Ir a:
      </label>
      <input
        id="page-jump"
        type="number"
        min={1}
        max={totalPages}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={String(currentPage)}
        className="w-14 rounded-md border border-gray-300 px-2 py-1 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        aria-label={`Jump to page (1-${totalPages})`}
      />
      <span className="text-gray-400">/ {totalPages}</span>
    </form>
  );
}

export { PageJumpInput };
export type { PageJumpInputProps };
