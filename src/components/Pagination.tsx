'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  searchParams: Record<string, string>;
}

export function Pagination({ currentPage, totalPages, baseUrl, searchParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams({ ...searchParams, page: page.toString() });
    return `${baseUrl}?${params.toString()}`;
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    // Always show first page
    if (currentPage > 6) {
      pages.push(1);
      if (currentPage > 7) pages.push('...');
    }
    
    // Show 5 pages before current
    for (let i = Math.max(1, currentPage - 5); i < currentPage; i++) {
      pages.push(i);
    }
    
    // Current page
    pages.push(currentPage);
    
    // Show 5 pages after current
    for (let i = currentPage + 1; i <= Math.min(totalPages, currentPage + 5); i++) {
      pages.push(i);
    }
    
    // Always show last page
    if (currentPage < totalPages - 5) {
      if (currentPage < totalPages - 6) pages.push('...');
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
      <div className="flex items-center text-sm text-gray-500">
        <span>
          Página {currentPage} de {totalPages}
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        {/* Previous button */}
        {currentPage > 1 ? (
          <a
            href={createPageUrl(currentPage - 1)}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700"
          >
            Anterior
          </a>
        ) : (
          <span className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-100 border border-gray-200 rounded-md cursor-not-allowed">
            Anterior
          </span>
        )}

        {/* Page numbers */}
        <div className="flex space-x-1">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-3 py-2 text-sm text-gray-500">
                  ...
                </span>
              );
            }
            
            const pageNum = page as number;
            const isCurrent = pageNum === currentPage;
            
            return (
              <a
                key={pageNum}
                href={createPageUrl(pageNum)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  isCurrent
                    ? 'bg-blue-500 text-white border border-blue-500'
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {pageNum}
              </a>
            );
          })}
        </div>

        {/* Next button */}
        {currentPage < totalPages ? (
          <a
            href={createPageUrl(currentPage + 1)}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700"
          >
            Siguiente
          </a>
        ) : (
          <span className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-100 border border-gray-200 rounded-md cursor-not-allowed">
            Siguiente
          </span>
        )}
      </div>
    </div>
  );
}