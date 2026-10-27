import type { ChainStep, OrderStatus, UserSummary } from '@/types/api'

/** The fields needed to decide what the current user can do with an order. */
export interface DecidableOrder {
  id: string
  number: number
  total: string
  status: OrderStatus
  version: number
  steps: Pick<ChainStep, 'position' | 'status' | 'approver' | 'decidedAt' | 'reason'>[]
}

export type DecisionState =
  /** It is this user's turn. */
  | { kind: 'mine'; step: number; totalSteps: number; next: UserSummary | null }
  /** Pending, but waiting for someone else. myStep: the user's own step, if any. */
  | {
      kind: 'waiting'
      step: number
      totalSteps: number
      current: UserSummary
      myStep: { position: number; done: boolean } | null
    }
  | { kind: 'approved'; completedAt: string | null }
  | { kind: 'rejected'; by: UserSummary | null; reason: string | null; at: string | null }

/**
 * Derived from the chain persisted by the API: the UI never recalculates the
 * approval rule, it only reads which step is CURRENT.
 */
export function getDecisionState(order: DecidableOrder, userId: string): DecisionState {
  const totalSteps = order.steps.length

  if (order.status === 'APPROVED') {
    const last = order.steps[totalSteps - 1]
    return { kind: 'approved', completedAt: last?.decidedAt ?? null }
  }
  if (order.status === 'REJECTED') {
    const rejected = order.steps.find((step) => step.status === 'REJECTED')
    return {
      kind: 'rejected',
      by: rejected?.approver ?? null,
      reason: rejected?.reason ?? null,
      at: rejected?.decidedAt ?? null,
    }
  }

  const current = order.steps.find((step) => step.status === 'CURRENT')
  if (!current) {
    // Should not happen for a pending order; treat it as nothing to decide.
    return { kind: 'approved', completedAt: null }
  }
  if (current.approver.id === userId) {
    const next = order.steps.find((step) => step.position === current.position + 1)
    return { kind: 'mine', step: current.position, totalSteps, next: next?.approver ?? null }
  }
  const mine = order.steps.find((step) => step.approver.id === userId)
  return {
    kind: 'waiting',
    step: current.position,
    totalSteps,
    current: current.approver,
    myStep: mine ? { position: mine.position, done: mine.position < current.position } : null,
  }
}
