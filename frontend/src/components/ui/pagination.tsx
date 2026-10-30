'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ChevronFirst, ChevronLast } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showTotal?: boolean;
  totalItems?: number;
  pageSize?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showTotal = false,
  totalItems,
  pageSize = 20,
}: PaginationProps) {
  const pages = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <nav className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" aria-label="Paginação">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        {showTotal && totalItems !== undefined && (
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            Mostrando <strong>{(currentPage - 1) * (pageSize || 20) + 1}</strong> a{' '}
            <strong>{Math.min(currentPage * (pageSize || 20), totalItems!)}</strong> de{' '}
            <strong>{totalItems}</strong> resultados
          </span>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className={cn(
              'p-2 rounded-md text-neutral-500 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed',
              'dark:text-neutral-400 dark:hover:bg-neutral-800'
            )}
            aria-label="Primeira página"
            aria-disabled={currentPage === 1}
          >
            <ChevronFirst className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={cn(
              'p-2 rounded-md text-neutral-500 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed',
              'dark:text-neutral-400 dark:hover:bg-neutral-800'
            )}
            aria-label="Página anterior"
            aria-disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1" role="navigation" aria-label="Páginas">
            {pages.map((page) => {
                if (typeof page === 'number') {
                  return (
                    <button
                      key={page}
                      onClick={() => onPageChange(page)}
                      className={cn(
                        'w-8 h-8 rounded-md text-sm font-medium transition-colors',
                        currentPage === page
                          ? 'bg-primary-600 text-white'
                          : 'text-neutral-600 hover:bg-neutral-100',
                        'dark:text-neutral-300 dark:hover:bg-neutral-800 dark:bg-primary-600 dark:text-white'
                      )}
                      aria-current={currentPage === page ? 'page' : undefined}
                      aria-label={`Página ${page}`}
                    >
                      {page}
                    </button>
                  );
                }
                return (
                  <span key={`ellipsis-${page}`} className="px-2 text-neutral-500 dark:text-neutral-400">
                    ...
                  </span>
                );
              })}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={cn(
              'p-2 rounded-md text-neutral-500 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed',
              'dark:text-neutral-400 dark:hover:bg-neutral-800'
            )}
            aria-label="Próxima página"
            aria-disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className={cn(
              'p-2 rounded-md text-neutral-500 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed',
              'dark:text-neutral-400 dark:hover:bg-neutral-800'
            )}
            aria-label="Última página"
            aria-disabled={currentPage === totalPages}
          >
            <ChevronLast className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}