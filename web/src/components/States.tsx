import type { ReactNode } from 'react'
import { ApiError } from '../api/client'
import { Icon, type IconName } from './Icon'

export function ListSkeleton({ rows = 5, label = 'Carregando…' }: { rows?: number; label?: string }) {
  return (
    <div className="skeleton-list" role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-row" aria-hidden="true">
          <span className="skeleton" style={{ width: '18%' }} />
          <span className="skeleton" style={{ width: `${40 + ((i * 17) % 30)}%` }} />
          <span className="skeleton" style={{ width: '14%', marginLeft: 'auto' }} />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({
  icon = 'inbox',
  title,
  children,
  action,
}: {
  icon?: IconName
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="state">
      <span className="state-icon">
        <Icon name={icon} size={20} />
      </span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry, title }: { error: unknown; onRetry: () => void; title?: string }) {
  const unavailable = error instanceof ApiError ? error.isUnavailable : true
  return (
    <div className="state state-error" role="alert">
      <span className="state-icon">
        <Icon name="alert" size={20} />
      </span>
      <h3>{title ?? (unavailable ? 'Não conseguimos carregar agora' : 'Algo deu errado')}</h3>
      <p>
        {unavailable
          ? 'O servidor não respondeu. Pode ser instabilidade ou a API estar fora do ar.'
          : error instanceof Error
            ? error.message
            : 'Erro desconhecido.'}
      </p>
      <button type="button" className="btn" onClick={onRetry}>
        <Icon name="refresh" /> Tentar novamente
      </button>
    </div>
  )
}
