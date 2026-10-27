// Shapes returned by the API (see /api/docs). Money and quantities are decimal
// strings ("10000.5"), never numbers, to avoid floating point errors.

export type DecimalString = string

export interface User {
  id: string
  name: string
  email: string
  role: string | null
}

export interface UserSummary {
  id: string
  name: string
  role?: string | null
}

export interface ConstructionSite {
  id: string
  code: string
  name: string
}

export interface Supplier {
  id: string
  name: string
  taxId: string
}

// ---------------------------------------------------------------------------
// Approval tiers
// ---------------------------------------------------------------------------

export interface TierApprover {
  position: number
  userId: string
  user: UserSummary
}

export interface ApprovalTier {
  id: string
  siteId: string
  /** null = no upper limit */
  maxAmount: DecimalString | null
  approvers: TierApprover[]
}

export interface ApprovalTierWithRange extends ApprovalTier {
  /** Previous tier's limit (exclusive); null for the first tier. */
  minAmount: DecimalString | null
}

export interface ApprovalChainPreview {
  amount: DecimalString
  tier: ApprovalTier | null
}

export interface ApprovalTierInput {
  maxAmount: DecimalString | null
  approverIds: string[]
}

// ---------------------------------------------------------------------------
// Purchase orders
// ---------------------------------------------------------------------------

export type OrderStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type StepStatus = 'WAITING' | 'CURRENT' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface ChainStep {
  position: number
  status: StepStatus
  approver: UserSummary
  decidedAt?: string | null
  reason?: string | null
}

interface OrderBase {
  id: string
  number: number
  siteId: string
  supplierId: string
  requesterId: string
  /** Date only, serialized as midnight UTC. */
  orderDate: string
  notes: string | null
  total: DecimalString
  status: OrderStatus
  /** Position of the step waiting for a decision; null when finished. */
  currentStep: number | null
  /** Sent back on decisions (optimistic lock). */
  version: number
  createdAt: string
  updatedAt: string
}

export interface OrderListItem extends OrderBase {
  site: ConstructionSite
  supplier: Pick<Supplier, 'id' | 'name'>
  requester: UserSummary
  steps: ChainStep[]
  itemCount: number
  currentApprover: UserSummary | null
}

export interface OrderItem {
  id: string
  position: number
  description: string
  quantity: DecimalString
  unit: string
  unitPrice: DecimalString
  total: DecimalString
}

export type OrderEventType = 'CREATED' | 'APPROVED' | 'REJECTED' | 'COMPLETED'

export interface OrderEvent {
  id: string
  sequence: number
  type: OrderEventType
  actor: { id: string; name: string } | null
  reason: string | null
  metadata: {
    tierMaxAmount?: DecimalString | null
    total?: DecimalString
    step?: number
  } | null
  createdAt: string
}

export interface OrderDetail extends OrderBase {
  site: ConstructionSite
  supplier: Supplier
  requester: UserSummary
  items: OrderItem[]
  steps: (ChainStep & { id: string })[]
  events: OrderEvent[]
}

export interface Page<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface CreateOrderInput {
  siteId: string
  supplierId: string
  orderDate: string
  notes?: string
  items: {
    description: string
    quantity: DecimalString
    unit: string
    unitPrice: DecimalString
  }[]
}
