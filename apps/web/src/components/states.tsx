import { CircleAlert, type LucideIcon, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';

// Estados de tela compartilhados: vazio e erro (com "Tentar novamente").

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-16 text-center',
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        {description && (
          <p className="max-w-md text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

interface ErrorStateProps {
  title: string;
  error: unknown;
  onRetry: () => void;
  isRetrying?: boolean;
  className?: string;
}

/** API fora do ar ou erro 500: mensagem clara e botão para tentar de novo (nunca tela branca). */
export function ErrorState({
  title,
  error,
  onRetry,
  isRetrying,
  className,
}: ErrorStateProps) {
  const message =
    error instanceof ApiError
      ? error.message
      : 'Ocorreu um erro inesperado. Tente novamente.';

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-16 text-center',
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
        <CircleAlert className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      </div>
      <Button variant="outline" onClick={onRetry} disabled={isRetrying}>
        <RotateCw
          className={cn('size-4', isRetrying && 'animate-spin')}
          aria-hidden="true"
        />
        Tentar novamente
      </Button>
    </div>
  );
}
