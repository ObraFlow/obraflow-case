import type { Prisma } from '../../prisma/generated/client.js';
import { formatMoney } from '../common/domain/money.js';
import { toUserSummary } from '../users/user.mapper.js';

// Formas de carregar o pedido do banco (include) e de convertê-lo para a resposta da API.

export const ORDER_SUMMARY_INCLUDE = {
  project: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
  requester: true,
  steps: { orderBy: { position: 'asc' }, include: { approver: true } },
  _count: { select: { items: true } },
} as const satisfies Prisma.PurchaseOrderInclude;

export const ORDER_DETAIL_INCLUDE = {
  ...ORDER_SUMMARY_INCLUDE,
  items: { orderBy: { position: 'asc' } },
  events: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: { actor: true },
  },
} as const satisfies Prisma.PurchaseOrderInclude;

type OrderSummaryRow = Prisma.PurchaseOrderGetPayload<{
  include: typeof ORDER_SUMMARY_INCLUDE;
}>;
type OrderDetailRow = Prisma.PurchaseOrderGetPayload<{
  include: typeof ORDER_DETAIL_INCLUDE;
}>;

/** Código legível derivado do id: 9 → "PED-009". */
export function orderCode(id: number) {
  return `PED-${String(id).padStart(3, '0')}`;
}

/** Coluna date do Postgres → "AAAA-MM-DD". */
function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function toOrderSummary(order: OrderSummaryRow) {
  return {
    id: order.id,
    code: orderCode(order.id),
    orderDate: formatDate(order.orderDate),
    project: order.project,
    supplier: order.supplier,
    requester: toUserSummary(order.requester),
    itemCount: order._count.items,
    totalAmount: formatMoney(order.totalAmount),
    status: order.status,
    currentStep: order.currentStep,
    steps: order.steps.map((step) => ({
      id: step.id,
      position: step.position,
      status: step.status,
      approver: toUserSummary(step.approver),
      decidedAt: step.decidedAt,
    })),
    createdAt: order.createdAt,
  };
}

export function toOrderDetail(order: OrderDetailRow) {
  return {
    ...toOrderSummary(order),
    notes: order.notes,
    appliedRule: {
      fromAmount: formatMoney(order.ruleFromAmount),
      maxAmount: order.ruleMaxAmount ? formatMoney(order.ruleMaxAmount) : null,
    },
    items: order.items.map((item) => ({
      id: item.id,
      position: item.position,
      description: item.description,
      quantity: item.quantity.toString(),
      unit: item.unit,
      unitPrice: formatMoney(item.unitPrice),
      total: formatMoney(item.total),
    })),
    history: order.events.map((event) => ({
      id: event.id,
      type: event.type,
      actor: { id: event.actor.id, name: event.actor.name },
      at: event.createdAt,
      stepPosition: event.stepPosition,
      reason: event.reason,
    })),
  };
}
