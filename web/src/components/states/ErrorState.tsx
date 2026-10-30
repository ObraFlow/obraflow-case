import { CloudOff, RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  error: unknown
  onRetry: () => void
  retrying?: boolean
  className?: string
}

/** Shown when a query fails (API down, 500...), always with a way to try again. */
export function ErrorState({ error, onRetry, retrying, className }: ErrorStateProps) {
  const serverProblem = !(error instanceof ApiError) || error.isServerProblem
  const Icon = serverProblem ? CloudOff : TriangleAlert
  const message =
    error instanceof ApiError ? error.message : 'Algo deu errado ao carregar os dados.'

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center',
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <Icon className="size-6 text-destructive" aria-hidden />
      </div>
      <div className="max-w-md space-y-1">
        <h3 className="font-medium">
          {serverProblem ? 'Servidor indisponível' : 'Não foi possível carregar'}
        </h3>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <Button variant="outline" onClick={onRetry} disabled={retrying}>
        <RefreshCw className={cn(retrying && 'animate-spin')} data-icon="inline-start" />
        {retrying ? 'Tentando...' : 'Tentar novamente'}
      </Button>
    </div>
  )
}
