import { firstName } from '@/lib/format'
import { useCurrentUser } from '@/features/session/api'
import { getDecisionState, type DecidableOrder } from '../decision'
import { ApproveButton, RejectButton } from './DecisionButtons'

/** Decision buttons when it is the user's turn; otherwise who the order is waiting for. */
export function OrderActions({ order }: { order: DecidableOrder }) {
  const user = useCurrentUser()
  const state = getDecisionState(order, user.id)

  if (state.kind === 'mine') {
    return (
      <div className="flex gap-2">
        <ApproveButton order={order} nextApprover={state.next?.name ?? null} size="sm" />
        <RejectButton order={order} size="sm" />
      </div>
    )
  }
  if (state.kind === 'waiting') {
    return (
      <span className="text-xs text-muted-foreground">
        Aguardando {firstName(state.current.name)}
      </span>
    )
  }
  return <span className="text-xs text-muted-foreground">Sem decisões pendentes</span>
}
