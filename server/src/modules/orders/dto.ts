import { formatQuantity } from '../../lib/quantity.js'
import { isStalled, waitingSince, type FullOrder, type ListedOrder } from './service.js'

export const orderCode = (id: number) => `PC-${String(id).padStart(5, '0')}`

type User = { id: number; name: string; role: string; phone: string | null }
const person = (u: User) => ({ id: u.id, name: u.name, role: u.role, phone: u.phone })

function header(o: ListedOrder | FullOrder) {
  const since = waitingSince(o)
  return {
    id: o.id,
    code: orderCode(o.id),
    site: { id: o.site.id, code: o.site.code, name: o.site.name },
    supplier: { id: o.supplier.id, name: o.supplier.name },
    requester: person(o.requester),
    notes: o.notes,
    // prévia do que está sendo comprado, para o card da lista
    itemsPreview: o.items.slice(0, 3).map((it) => it.description),
    orderDate: o.orderDate,
    itemCount: o.items.length,
    totalCents: o.totalCents,
    status: o.status,
    currentStep: o.currentStep,
    steps: o.steps.map((s) => ({
      position: s.position,
      status: s.status,
      decidedAt: s.decidedAt,
      reason: s.reason,
      approver: person(s.approver),
    })),
    createdAt: o.createdAt,
    // desde quando a etapa atual espera decisão, e se já passou do prazo
    waitingSince: since,
    stalled: isStalled(since),
  }
}

export const orderSummaryDto = (o: ListedOrder) => header(o)

export const orderDetailDto = (o: FullOrder) => ({
  ...header(o),
  supplier: { id: o.supplier.id, name: o.supplier.name, cnpj: o.supplier.cnpj },
  tierUpToCents: o.tierUpToCents,
  resubmissionOf: o.resubmissionOf && { id: o.resubmissionOf.id, code: orderCode(o.resubmissionOf.id) },
  resubmissions: o.resubmissions.map((r) => ({ id: r.id, code: orderCode(r.id) })),
  items: o.items.map((it) => ({
    position: it.position,
    description: it.description,
    quantity: formatQuantity(it.quantityMilli),
    unit: it.unit,
    unitPriceCents: it.unitPriceCents,
    totalCents: it.totalCents,
  })),
  history: o.events.map((e) => ({
    id: e.id,
    type: e.type,
    reason: e.reason,
    createdAt: e.createdAt,
    actor: { id: e.actor.id, name: e.actor.name },
  })),
})
