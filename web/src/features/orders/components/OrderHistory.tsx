import { CheckCircle2, FilePlus2, Flag, XCircle } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import { formatBRL } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { OrderEvent } from '@/types/api'

const eventConfig = {
  CREATED: { icon: FilePlus2, tone: 'bg-sky-100 text-sky-700' },
  APPROVED: { icon: CheckCircle2, tone: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { icon: XCircle, tone: 'bg-red-100 text-red-700' },
  COMPLETED: { icon: Flag, tone: 'bg-emerald-100 text-emerald-700' },
} satisfies Record<OrderEvent['type'], unknown>

function describe(event: OrderEvent): { title: string; detail?: string } {
  const actor = event.actor?.name ?? 'Sistema'
  const step = event.metadata?.step ? ` (etapa ${event.metadata.step})` : ''
  switch (event.type) {
    case 'CREATED': {
      const limit = event.metadata?.tierMaxAmount
      const tier = limit ? `faixa até ${formatBRL(limit)}` : 'faixa sem limite superior'
      const total = event.metadata?.total ? `Total de ${formatBRL(event.metadata.total)}; ` : ''
      return { title: `Pedido criado por ${actor}`, detail: `${total}regra aplicada: ${tier}.` }
    }
    case 'APPROVED':
      return { title: `Aprovado por ${actor}${step}` }
    case 'REJECTED':
      return { title: `Rejeitado por ${actor}${step}` }
    case 'COMPLETED':
      return { title: 'Cadeia de aprovação concluída', detail: 'Pedido aprovado.' }
  }
}

/** Append-only audit trail recorded by the API. */
export function OrderHistory({ events }: { events: OrderEvent[] }) {
  return (
    <ol className="space-y-4">
      {events.map((event) => {
        const { icon: Icon, tone } = eventConfig[event.type]
        const { title, detail } = describe(event)
        return (
          <li key={event.id} className="flex gap-3">
            <span
              className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', tone)}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</p>
              {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
              {event.reason && (
                <blockquote className="mt-2 rounded-md border-l-2 border-red-300 bg-red-50 px-3 py-2 text-sm text-red-950">
                  {event.reason}
                </blockquote>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
