import { CheckCircle2, FilePlus2, Flag, XCircle } from 'lucide-react'
import { FlowArrow } from '@/components/FlowArrow'
import { RejectionReason } from '@/components/RejectionReason'
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

/** Append-only audit trail recorded by the API, oldest first. */
export function OrderHistory({ events }: { events: OrderEvent[] }) {
  return (
    <ol>
      {events.map((event, index) => {
        const { icon: Icon, tone } = eventConfig[event.type]
        const { title, detail } = describe(event)
        const last = index === events.length - 1
        return (
          <li key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full',
                  tone,
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              {!last && <FlowArrow className="my-1 flex-1" />}
            </div>
            <div className={cn('min-w-0 flex-1 pt-1', !last && 'pb-5')}>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</p>
              {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
              {event.reason && <RejectionReason reason={event.reason} />}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
