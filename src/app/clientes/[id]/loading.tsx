import { Skeleton, SkeletonLine, SkeletonCircle, SkeletonCard } from '@/components/ui/Skeleton';

/**
 * Loading skeleton for client detail page.
 * Displays during server-side data fetching and page transitions.
 */
export default function ClienteDetallesLoading() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb & Actions skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <SkeletonLine className="w-20" />
          <Skeleton className="h-3.5 w-3.5" />
          <SkeletonLine className="w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>

      {/* Client Header Card skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Skeleton className="w-16 h-16 rounded-xl" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
              <SkeletonLine className="w-40" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-center px-4 py-2 bg-gray-50 rounded-lg">
              <Skeleton className="h-8 w-12 mx-auto mb-1" />
              <SkeletonLine className="w-20" />
            </div>
            <div className="text-center px-4 py-2 bg-gray-50 rounded-lg">
              <Skeleton className="h-8 w-12 mx-auto mb-1" />
              <SkeletonLine className="w-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Sidebar skeleton */}
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Right Column - Content skeleton */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notes skeleton */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <Skeleton className="h-5 w-20 mb-3" />
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <SkeletonLine className="w-full" />
              <SkeletonLine className="w-5/6" />
              <SkeletonLine className="w-4/6" />
            </div>
          </div>

          {/* Activities skeleton */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`act-${i}`} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                  <SkeletonCircle className="w-8 h-8" />
                  <div className="flex-1 space-y-2">
                    <SkeletonLine className="w-48" />
                    <SkeletonLine className="w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enrichment skeleton */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Skeleton className="h-8 w-64 mx-auto mb-3" />
            <SkeletonLine className="w-80 mx-auto" />
          </div>
        </div>
      </div>
    </main>
  );
}
