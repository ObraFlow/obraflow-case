'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export function LoadingState({
  message = 'Carregando...',
  className,
  size = 'md',
  fullScreen = false,
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className={cn('animate-spin text-primary-600', sizeClasses[size])} />
      {message && <span className="text-sm text-neutral-500 dark:text-neutral-400">{message}</span>}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm',
          className
        )}
      >
        <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-lg">{content}</div>
      </div>
    );
  }

  return <div className={cn('flex items-center justify-center py-8', className)}>{content}</div>;
}