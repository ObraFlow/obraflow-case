import { useState } from 'react'
import { useDecision } from '../api/hooks'
import type { OrderDetail, OrderSummary } from '../api/types'
import { formatDateTime } from '../lib/format'
import { decisionState } from '../lib/decision'
import { useActor } from '../lib/actor'
import { Icon } from './Icon'
import { RejectDialog } from './RejectDialog'
import { useToast } from './Toasts'

function afterDecision(order: OrderDetail, approved: boolean) {
  if (!approved) return `${order.code} rejeitado. O motivo ficou no histórico.`
  if (order.status === 'APPROVED') return `${order.code} aprovado. Cadeia concluída.`
  return `${order.code} aprovado. Segue para ${order.steps[order.currentStep!].approver.name}.`
}

export function DecisionActions({ order, variant }: { order: OrderSummary; variant: 'row' | 'bar' }) {
  const { actorId } = useActor()
  const decision = useDecision()
  const toast = useToast()
  const [rejecting, setRejecting] = useState(false)
  const [rejectError, setRejectError] = useState<string | null>(null)

  const state = decisionState(order, actorId)
  const busy = decision.isPending

  async function approve() {
    try {
      toast(afterDecision(await decision.mutateAsync({ id: order.id }), true))
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível aprovar.', 'error')
    }
  }

  async function reject(reason: string) {
    setRejectError(null)
    try {
      const updated = await decision.mutateAsync({ id: order.id, reason })
      setRejecting(false)
      toast(afterDecision(updated, false))
    } catch (err) {
      setRejectError(err instanceof Error ? err.message : 'Não foi possível rejeitar.')
    }
  }

  const buttons = (enabled: boolean) => (
    <div className="decision-buttons">
      <button
        type="button"
        className={`btn btn-reject ${variant === 'row' ? 'btn-sm' : ''}`}
        disabled={!enabled || busy}
        onClick={() => setRejecting(true)}
      >
        <Icon name="x" /> Rejeitar
      </button>
      <button
        type="button"
        className={`btn btn-approve ${variant === 'row' ? 'btn-sm' : ''}`}
        disabled={!enabled || busy}
        onClick={approve}
      >
        <Icon name="check" /> {busy && !rejecting ? 'Aprovando…' : 'Aprovar'}
      </button>
    </div>
  )

  const dialog = (
    <RejectDialog
      open={rejecting}
      orderCode={order.code}
      busy={busy}
      serverError={rejectError}
      onSubmit={reject}
      onClose={() => {
        setRejecting(false)
        setRejectError(null)
      }}
    />
  )

  if (variant === 'row') {
    if (state.kind === 'mine')
      return (
        <>
          {buttons(true)}
          {dialog}
        </>
      )
    // a coluna "Etapa atual" já diz com quem está; aqui só aparece o que a pessoa pode fazer
    return null
  }

  let text: React.ReactNode
  if (state.kind === 'mine') {
    text = (
      <>
        <strong>É a sua vez.</strong> Etapa {state.step} de {state.total}
        {state.step < state.total ? '; ao aprovar, o pedido segue para a próxima pessoa.' : ', a última da cadeia.'}
      </>
    )
  } else if (state.kind === 'waiting') {
    text = (
      <>
        Aguardando <strong>{state.who}</strong> (etapa {state.step} de {state.total}).{' '}
        {state.alreadyDecided
          ? 'Você já aprovou sua etapa.'
          : state.mine
            ? `Sua etapa é a ${state.mine}: você só decide depois.`
            : 'Você não faz parte desta alçada.'}
      </>
    )
  } else {
    text =
      state.status === 'APPROVED' ? (
        <>
          <strong>Cadeia concluída.</strong> Aprovado por todos{state.at ? ` em ${formatDateTime(state.at)}` : ''}; não há decisão pendente.
        </>
      ) : (
        <>
          <strong>Fluxo encerrado.</strong> Rejeitado por {state.by}
          {state.at ? ` em ${formatDateTime(state.at)}` : ''}; não há decisão pendente.
        </>
      )
  }

  return (
    <div className={`decision-bar decision-${state.kind}`}>
      <p id={`decision-why-${order.id}`}>
        <Icon name="info" /> <span>{text}</span>
      </p>
      {buttons(state.kind === 'mine')}
      {dialog}
    </div>
  )
}
