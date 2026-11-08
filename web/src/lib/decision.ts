import type { OrderSummary } from '../api/types'

// Quem pode decidir o quê, do ponto de vista de quem está atuando.
// Só serve para a interface; a regra de verdade é validada no backend.
export type DecisionState =
  | { kind: 'mine'; step: number; total: number }
  | { kind: 'waiting'; who: string; step: number; total: number; mine: number | null; alreadyDecided: boolean }
  | { kind: 'closed'; status: 'APPROVED' | 'REJECTED'; by: string | null; at: string | null }

export function decisionState(order: Pick<OrderSummary, 'status' | 'currentStep' | 'steps'>, actorId: number | null): DecisionState {
  const total = order.steps.length
  if (order.status !== 'PENDING' || order.currentStep === null) {
    const last = [...order.steps].reverse().find((s) => s.decidedAt)
    return { kind: 'closed', status: order.status as 'APPROVED' | 'REJECTED', by: last?.approver.name ?? null, at: last?.decidedAt ?? null }
  }
  const current = order.steps[order.currentStep]
  if (current.approver.id === actorId) return { kind: 'mine', step: order.currentStep + 1, total }

  const mine = order.steps.find((s) => s.approver.id === actorId)
  return {
    kind: 'waiting',
    who: current.approver.name,
    step: order.currentStep + 1,
    total,
    mine: mine ? mine.position + 1 : null,
    alreadyDecided: !!mine && mine.position < order.currentStep,
  }
}
