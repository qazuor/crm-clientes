import { cn } from '@/lib/utils';

interface SkeletonProps {
  /** Additional CSS classes for custom sizing */
  readonly className?: string;
}

/**
 * Base skeleton loading placeholder.
 * Renders an animated pulse block used as a content placeholder.
 */
function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200', className)}
      role="status"
      aria-label="Loading"
    />
  );
}

/**
 * Skeleton line for text content.
 * Renders a single line placeholder with default text height.
 */
function SkeletonLine({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-4 w-full', className)} />;
}

/**
 * Skeleton circle for avatars and icons.
 */
function SkeletonCircle({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-10 w-10 rounded-full', className)} />;
}

interface SkeletonTableProps {
  /** Number of rows to display */
  readonly rows?: number;
  /** Number of columns to display */
  readonly columns?: number;
  /** Additional CSS classes */
  readonly className?: string;
}

/**
 * Skeleton table placeholder.
 * Renders a table-like skeleton with configurable rows and columns.
 */
function SkeletonTable({ rows = 5, columns = 4, className }: SkeletonTableProps) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Loading table">
      {/* Header row */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={`header-${colIndex}`} className="h-8 flex-1" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-6 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  /** Additional CSS classes */
  readonly className?: string;
}

/**
 * Skeleton card placeholder.
 * Mimics a typical card layout with title, description, and metadata.
 */
function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div
      className={cn('rounded-lg border border-gray-200 p-4 space-y-3', className)}
      role="status"
      aria-label="Loading card"
    >
      <div className="flex items-center gap-3">
        <SkeletonCircle className="h-8 w-8" />
        <Skeleton className="h-5 w-1/3" />
      </div>
      <SkeletonLine className="w-full" />
      <SkeletonLine className="w-2/3" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

export { Skeleton, SkeletonLine, SkeletonCircle, SkeletonTable, SkeletonCard };
export type { SkeletonProps, SkeletonTableProps, SkeletonCardProps };
