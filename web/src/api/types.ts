export type OrderStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type StepStatus = 'WAITING' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED'

export interface User {
  id: number
  name: string
  email: string
  role: string
}

export type SiteKind = 'residential' | 'commercial' | 'industrial'

export interface Site {
  id: number
  code: string
  name: string
  city: string
  kind: SiteKind
  budgetCents: number
  approvedCents: number
  tierCount: number
  pendingCount: number
  pendingCents: number
}

export interface Supplier {
  id: number
  name: string
  cnpj: string
}

export interface Person {
  id: number
  name: string
  role: string
  phone?: string | null
}

export interface Tier {
  id: number
  siteId: number
  fromCents: number
  upToCents: number | null
  approvers: Person[]
}

export interface Step {
  position: number
  status: StepStatus
  decidedAt: string | null
  reason: string | null
  approver: Person
}

export interface OrderSummary {
  id: number
  code: string
  site: { id: number; code: string; name: string }
  supplier: { id: number; name: string }
  requester: Person
  notes: string | null
  /** descrição dos primeiros itens, para o card */
  itemsPreview: string[]
  orderDate: string
  itemCount: number
  totalCents: number
  status: OrderStatus
  currentStep: number | null
  steps: Step[]
  createdAt: string
  /** desde quando a etapa atual espera decisão (null se encerrado) */
  waitingSince: string | null
  /** esperando há 3 dias ou mais */
  stalled: boolean
}

export interface OrderRef {
  id: number
  code: string
}

export interface CountTotal {
  count: number
  totalCents: number
}

export interface OrderStats {
  pending: CountTotal
  awaitingMe: CountTotal
  approvedThisMonth: CountTotal
  stalled: { count: number; afterDays: number }
}

export interface OrderDetail extends OrderSummary {
  supplier: { id: number; name: string; cnpj: string }
  tierUpToCents: number | null
  resubmissionOf: OrderRef | null
  resubmissions: OrderRef[]
  items: Array<{
    position: number
    description: string
    quantity: string
    unit: string
    unitPriceCents: number
    totalCents: number
  }>
  history: Array<{
    id: number
    type: 'CREATED' | 'APPROVED' | 'REJECTED'
    reason: string | null
    createdAt: string
    actor: { id: number; name: string }
  }>
}

export interface NewOrderPayload {
  siteId: number
  supplierId: number
  orderDate: string
  notes: string | null
  resubmissionOfId?: number | null
  items: Array<{ description: string; quantity: string; unit: string; unitPriceCents: number }>
}

export interface TierPayload {
  upToCents: number | null
  approverIds: number[]
}

export interface Dashboard {
  budgetCents: number
  approvedCents: number
  pendingCents: number
  availableCents: number
  counts: { approved: number; pending: number; rejected: number }
  avgApprovalHours: number | null
  months: { month: string; approvedCents: number; count: number }[]
  suppliers: { id: number; name: string; approvedCents: number; count: number }[]
  sites: {
    id: number
    code: string
    name: string
    city: string
    budgetCents: number
    approvedCents: number
    pendingCents: number
    pendingCount: number
  }[]
  activity: {
    id: number
    type: 'CREATED' | 'APPROVED' | 'REJECTED'
    at: string
    orderId: number
    code: string
    totalCents: number
    siteCode: string
    actor: string
  }[]
}
