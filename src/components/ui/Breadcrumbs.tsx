import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  /** Display label */
  readonly label: string;
  /** URL to navigate to. If omitted, item is rendered as text (current page). */
  readonly href?: string;
}

interface BreadcrumbsProps {
  /** Array of breadcrumb items from root to current page */
  readonly items: readonly BreadcrumbItem[];
  /** Additional CSS classes */
  readonly className?: string;
}

/**
 * Breadcrumb navigation component.
 * Renders a breadcrumb trail with links to parent pages.
 * The last item is rendered as plain text (current page).
 */
function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center text-sm', className)}>
      <ol className="flex items-center gap-1.5">
        <li>
          <Link
            href="/"
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Inicio"
          >
            <HomeIcon className="h-4 w-4" />
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              <ChevronRightIcon className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
              {isLast || !item.href ? (
                <span className="font-medium text-gray-700 truncate max-w-[200px]" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-gray-500 hover:text-gray-700 transition-colors truncate max-w-[200px]"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { Breadcrumbs };
export type { BreadcrumbsProps, BreadcrumbItem };
