import type { OrderStatus } from '../api/types'

const LABEL: Record<OrderStatus, string> = { PENDING: 'Pendente', APPROVED: 'Aprovado', REJECTED: 'Rejeitado' }

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge badge-${status}`}>{LABEL[status]}</span>
}
