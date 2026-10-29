import { CheckCircle2, Clock, Info, XCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCurrentUser } from '@/features/session/api'
import { formatDateTime } from '@/lib/format'
import { getDecisionState, type DecidableOrder, type DecisionState } from '../decision'
import { ApproveButton, RejectButton } from './DecisionButtons'

/**
 * What the current user can do with the order. When there is no decision
 * available, the buttons stay visible but disabled, with the reason.
 */
export function DecisionPanel({ order }: { order: DecidableOrder }) {
  const user = useCurrentUser()
  const state = getDecisionState(order, user.id)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Decisão</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <StateMessage state={state} />
        {state.kind === 'mine' ? (
          <div className="grid grid-cols-2 gap-2">
            <ApproveButton order={order} nextApprover={state.next?.name ?? null} />
            <RejectButton order={order} />
          </div>
        ) : (
          <DisabledButtons reason={disabledReason(state)} />
        )}
      </CardContent>
    </Card>
  )
}

function disabledReason(state: Exclude<DecisionState, { kind: 'mine' }>) {
  switch (state.kind) {
    case 'waiting':
      return 'Somente o aprovador da etapa atual pode decidir.'
    case 'approved':
      return 'A cadeia de aprovação já foi concluída.'
    case 'rejected':
      return 'O pedido foi rejeitado e o fluxo foi encerrado.'
  }
}

function DisabledButtons({ reason }: { reason: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* The wrapper receives hover/focus, since disabled buttons do not. */}
        <div className="grid grid-cols-2 gap-2" tabIndex={0} aria-label={reason}>
          <Button disabled>Aprovar</Button>
          <Button disabled variant="destructive">
            Rejeitar
          </Button>
        </div>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  )
}

function StateMessage({ state }: { state: DecisionState }) {
  switch (state.kind) {
    case 'mine':
      return (
        <Alert className="border-amber-200 bg-amber-50 text-amber-950">
          <Clock />
          <AlertTitle>É a sua vez de decidir</AlertTitle>
          <AlertDescription className="text-amber-900">
            Etapa {state.step} de {state.totalSteps}.{' '}
            {state.next
              ? `Se aprovar, o pedido segue para ${state.next.name}.`
              : 'Você é o último aprovador: sua aprovação conclui o pedido.'}
          </AlertDescription>
        </Alert>
      )
    case 'waiting':
      return (
        <Alert>
          <Info />
          <AlertTitle>Aguardando {state.current.name}</AlertTitle>
          <AlertDescription>
            Etapa {state.step} de {state.totalSteps}.{' '}
            {!state.myStep
              ? 'Você não faz parte da cadeia de aprovação deste pedido.'
              : state.myStep.done
                ? `Você já aprovou na etapa ${state.myStep.position}.`
                : `Você decide na etapa ${state.myStep.position}.`}
          </AlertDescription>
        </Alert>
      )
    case 'approved':
      return (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
          <CheckCircle2 />
          <AlertTitle>Cadeia de aprovação concluída</AlertTitle>
          <AlertDescription className="text-emerald-900">
            Todos os aprovadores aprovaram
            {state.completedAt ? ` (concluído em ${formatDateTime(state.completedAt)})` : ''}. Não
            há decisões pendentes.
          </AlertDescription>
        </Alert>
      )
    case 'rejected':
      return (
        <Alert className="border-red-200 bg-red-50 text-red-950">
          <XCircle />
          <AlertTitle>Pedido rejeitado</AlertTitle>
          <AlertDescription className="text-red-900">
            {state.by ? `Rejeitado por ${state.by.name}` : 'Rejeitado'}
            {state.at ? ` em ${formatDateTime(state.at)}` : ''}. As etapas seguintes foram
            canceladas.
          </AlertDescription>
        </Alert>
      )
  }
}
