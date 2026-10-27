import { describe, expect, it } from 'vitest'
import type { StepStatus } from '@/types/api'
import { getDecisionState, type DecidableOrder } from './decision'

const carla = { id: 'carla', name: 'Carla Mendes' }
const amanda = { id: 'amanda', name: 'Amanda Costa' }
const ricardo = { id: 'ricardo', name: 'Ricardo Alves' }

function order(status: DecidableOrder['status'], statuses: StepStatus[]): DecidableOrder {
  return {
    id: 'order',
    number: 6,
    total: '110500',
    status,
    version: 1,
    steps: [carla, amanda, ricardo].map((approver, index) => ({
      position: index + 1,
      status: statuses[index],
      approver,
      decidedAt: null,
      reason: statuses[index] === 'REJECTED' ? 'Fora do orçamento' : null,
    })),
  }
}

const pending = order('PENDING', ['APPROVED', 'CURRENT', 'WAITING'])

describe('getDecisionState', () => {
  it('lets the current approver decide and tells who is next', () => {
    expect(getDecisionState(pending, 'amanda')).toEqual({
      kind: 'mine',
      step: 2,
      totalSteps: 3,
      next: ricardo,
    })
  })

  it('makes the others wait, knowing whether they already decided or decide later', () => {
    expect(getDecisionState(pending, 'carla')).toMatchObject({
      kind: 'waiting',
      current: amanda,
      myStep: { position: 1, done: true },
    })
    expect(getDecisionState(pending, 'ricardo')).toMatchObject({
      kind: 'waiting',
      myStep: { position: 3, done: false },
    })
    expect(getDecisionState(pending, 'someone-else')).toMatchObject({
      kind: 'waiting',
      myStep: null,
    })
  })

  it('has no decision once the chain is complete', () => {
    const approved = order('APPROVED', ['APPROVED', 'APPROVED', 'APPROVED'])
    expect(getDecisionState(approved, 'ricardo').kind).toBe('approved')
  })

  it('has no decision after a rejection, and reports who rejected and why', () => {
    const rejected = order('REJECTED', ['APPROVED', 'REJECTED', 'CANCELLED'])
    expect(getDecisionState(rejected, 'ricardo')).toEqual({
      kind: 'rejected',
      by: amanda,
      reason: 'Fora do orçamento',
      at: null,
    })
  })
})
