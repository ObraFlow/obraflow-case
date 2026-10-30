'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  details?: string;
  onRetry?: () => void;
  className?: string;
  fullScreen?: boolean;
}

export function ErrorState({
  message,
  details,
  onRetry,
  className,
  fullScreen = false,
}: ErrorStateProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-4 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-100 dark:bg-danger-900/30">
        <AlertCircle className="h-6 w-6 text-danger-600 dark:text-danger-400" />
      </div>
      <div>
        <h3 className="mb-1 text-lg font-medium text-neutral-900 dark:text-white">
          {message}
        </h3>
        {details && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md">{details}</p>
        )}
      </div>
      {onRetry && (
        <Button
          variant="default"
          size="lg"
          onClick={onRetry}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-lg max-w-md w-full">{content}</div>
      </div>
    );
  }

  return <div className={cn('py-8', className)}>{content}</div>;
}