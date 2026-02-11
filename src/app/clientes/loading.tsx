import { Skeleton, SkeletonLine, SkeletonTable } from '@/components/ui/Skeleton';

/**
 * Loading skeleton for client list page.
 * Displays during server-side data fetching and page transitions.
 */
export default function ClientesLoading() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header skeleton */}
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <SkeletonLine className="w-64" />
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      {/* Filter area skeleton */}
      <div className="bg-white shadow-sm rounded-lg border mb-0">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-24 rounded-md" />
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        </div>

        {/* Table skeleton */}
        <div className="p-6">
          <SkeletonTable rows={10} columns={7} />
        </div>

        {/* Pagination skeleton */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <SkeletonLine className="w-32" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>
        </div>
      </div>
    </main>
  );
}
