import { and, desc, eq, gt, inArray } from 'drizzle-orm'
import { db } from '../../db/client.js'
import { approvalSteps, orderEvents, orderItems, purchaseOrders, sites, suppliers, type OrderStatus } from '../../db/schema.js'
import { resolveTier } from '../../domain/tiers.js'
import { AppError, notFound } from '../../lib/errors.js'
import { lineTotalCents } from '../../lib/quantity.js'
import { MAX_CENTS } from '../../lib/schemas.js'
import { findTiers } from '../tiers.js'
import type { CreateOrderInput } from './schemas.js'

const now = () => new Date().toISOString()

// `at` só existe para o seed criar um histórico com datas realistas
type When = { at?: string }

export function createOrder(input: CreateOrderInput, requesterId: number, { at = now() }: When = {}) {
  const items = input.items.map((it, position) => ({
    position,
    description: it.description,
    quantityMilli: it.quantity,
    unit: it.unit,
    unitPriceCents: it.unitPriceCents,
    totalCents: lineTotalCents(it.quantity, it.unitPriceCents),
  }))
  // O total é sempre recalculado aqui. O que o front mostra é só prévia.
  const totalCents = items.reduce((sum, it) => sum + it.totalCents, 0)
  if (totalCents > MAX_CENTS) throw new AppError(422, 'TOTAL_TOO_LARGE', 'O total do pedido passa do limite permitido.')

  const id = db.transaction(
    (tx) => {
      const site = tx.select().from(sites).where(eq(sites.id, input.siteId)).get()
      if (!site) throw new AppError(422, 'UNKNOWN_SITE', 'Obra não encontrada.')
      const supplier = tx.select().from(suppliers).where(eq(suppliers.id, input.supplierId)).get()
      if (!supplier) throw new AppError(422, 'UNKNOWN_SUPPLIER', 'Fornecedor não encontrado.')

      const tier = resolveTier(findTiers(site.id, tx), totalCents)
      if (!tier || tier.approvers.length === 0) {
        throw new AppError(
          422,
          'NO_APPLICABLE_TIER',
          `A obra ${site.code} não tem regra de alçada para este valor. Cadastre uma faixa que cubra o total antes de enviar.`,
        )
      }

      // Segregação de funções: quem pede não pode estar na cadeia que aprova o próprio pedido.
      if (tier.approvers.some((a) => a.userId === requesterId)) {
        throw new AppError(
          422,
          'REQUESTER_IN_CHAIN',
          'Você é aprovador(a) desta faixa e não pode aprovar o próprio pedido. Peça para outra pessoa cadastrar.',
        )
      }

      if (input.resubmissionOfId) {
        const original = tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.resubmissionOfId)).get()
        if (!original || original.status !== 'REJECTED') {
          throw new AppError(422, 'INVALID_RESUBMISSION', 'Só é possível reenviar a correção de um pedido rejeitado.')
        }
      }

      const order = tx
        .insert(purchaseOrders)
        .values({
          siteId: site.id,
          supplierId: supplier.id,
          requesterId,
          orderDate: input.orderDate,
          notes: input.notes,
          totalCents,
          status: 'PENDING',
          currentStep: 0,
          tierId: tier.id,
          tierUpToCents: tier.upToCents,
          resubmissionOfId: input.resubmissionOfId ?? null,
          createdAt: at,
        })
        .returning({ id: purchaseOrders.id })
        .get()

      tx.insert(orderItems)
        .values(items.map((it) => ({ ...it, orderId: order.id })))
        .run()

      // A cadeia é COPIADA da regra. Editar a regra depois não mexe neste pedido.
      tx.insert(approvalSteps)
        .values(
          tier.approvers.map((a, position) => ({
            orderId: order.id,
            position,
            approverId: a.userId,
            status: position === 0 ? ('PENDING' as const) : ('WAITING' as const),
          })),
        )
        .run()

      tx.insert(orderEvents).values({ orderId: order.id, type: 'CREATED', actorId: requesterId, createdAt: at }).run()
      return order.id
    },
    { behavior: 'immediate' },
  )

  return getOrder(id)!
}

type Decision = { type: 'APPROVE' } | { type: 'REJECT'; reason: string }

export function decide(orderId: number, actorId: number, decision: Decision, { at = now() }: When = {}) {
  db.transaction(
    (tx) => {
      const order = tx.query.purchaseOrders
        .findFirst({
          where: eq(purchaseOrders.id, orderId),
          with: { steps: { orderBy: approvalSteps.position, with: { approver: true } } },
        })
        .sync()
      if (!order) throw notFound('Pedido')

      if (order.status !== 'PENDING' || order.currentStep === null) {
        const label = order.status === 'APPROVED' ? 'aprovado' : 'rejeitado'
        throw new AppError(409, 'ORDER_CLOSED', `Este pedido já foi ${label}; a cadeia de alçada está concluída.`)
      }

      // a criação já impede isso; a checagem aqui é a segunda trava
      if (order.requesterId === actorId) {
        throw new AppError(403, 'SELF_APPROVAL', 'Quem cadastrou o pedido não pode decidir sobre ele.')
      }

      const step = order.steps[order.currentStep]
      if (step.approverId !== actorId) throw notYourTurn(order.steps, step.position, actorId)

      const isLast = step.position === order.steps.length - 1
      const next: { status: OrderStatus; currentStep: number | null } =
        decision.type === 'REJECT'
          ? { status: 'REJECTED', currentStep: null }
          : isLast
            ? { status: 'APPROVED', currentStep: null }
            : { status: 'PENDING', currentStep: step.position + 1 }

      // Compare-and-set: só avança se o pedido ainda estiver na etapa que lemos.
      // Se outro processo decidiu no meio do caminho, nenhuma linha muda.
      const changed = tx
        .update(purchaseOrders)
        .set(next)
        .where(and(eq(purchaseOrders.id, order.id), eq(purchaseOrders.status, 'PENDING'), eq(purchaseOrders.currentStep, step.position)))
        .run().changes
      if (changed === 0) {
        throw new AppError(409, 'STALE_ORDER', 'O pedido mudou enquanto você decidia. Recarregue e tente de novo.')
      }

      const reason = decision.type === 'REJECT' ? decision.reason : null
      tx.update(approvalSteps)
        .set({ status: decision.type === 'APPROVE' ? 'APPROVED' : 'REJECTED', decidedAt: at, reason })
        .where(eq(approvalSteps.id, step.id))
        .run()

      if (decision.type === 'REJECT') {
        // rejeição encerra o fluxo: as etapas seguintes nunca vão acontecer
        tx.update(approvalSteps)
          .set({ status: 'CANCELED' })
          .where(and(eq(approvalSteps.orderId, order.id), gt(approvalSteps.position, step.position)))
          .run()
      } else if (!isLast) {
        tx.update(approvalSteps)
          .set({ status: 'PENDING' })
          .where(and(eq(approvalSteps.orderId, order.id), eq(approvalSteps.position, step.position + 1)))
          .run()
      }

      tx.insert(orderEvents)
        .values({
          orderId: order.id,
          type: decision.type === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          actorId,
          reason,
          createdAt: at,
        })
        .run()
    },
    { behavior: 'immediate' },
  )

  return getOrder(orderId)!
}

type ChainStep = { position: number; approverId: number; approver: { name: string } }

function notYourTurn(steps: ChainStep[], current: number, actorId: number) {
  const waitingFor = steps[current].approver.name
  const mine = steps.find((s) => s.approverId === actorId)

  if (!mine) {
    return new AppError(403, 'NOT_IN_CHAIN', `Você não faz parte da alçada deste pedido. A decisão atual é de ${waitingFor}.`)
  }
  if (mine.position < current) {
    return new AppError(409, 'ALREADY_DECIDED', `Você já aprovou sua etapa. Agora a decisão é de ${waitingFor}.`)
  }
  return new AppError(
    409,
    'OUT_OF_ORDER',
    `Sua etapa é a ${mine.position + 1} de ${steps.length}. Aguarde a decisão de ${waitingFor} (etapa ${current + 1}).`,
  )
}

const stepsWith = { orderBy: approvalSteps.position, with: { approver: true } } as const

export function getOrder(id: number) {
  return db.query.purchaseOrders
    .findFirst({
      where: eq(purchaseOrders.id, id),
      with: {
        site: true,
        supplier: true,
        requester: true,
        resubmissionOf: { columns: { id: true } },
        resubmissions: { columns: { id: true } },
        items: { orderBy: orderItems.position },
        steps: stepsWith,
        events: { orderBy: orderEvents.id, with: { actor: true } },
      },
    })
    .sync()
}

export type FullOrder = NonNullable<ReturnType<typeof getOrder>>

export function listOrders(filter: { status?: OrderStatus; siteId?: number; awaitingUserId?: number }) {
  // "aguardando você" = existe uma etapa PENDING deste usuário
  const awaitingIds = filter.awaitingUserId
    ? db
        .select({ id: approvalSteps.orderId })
        .from(approvalSteps)
        .where(and(eq(approvalSteps.approverId, filter.awaitingUserId), eq(approvalSteps.status, 'PENDING')))
        .all()
        .map((r) => r.id)
    : undefined

  return db.query.purchaseOrders
    .findMany({
      where: and(
        filter.status ? eq(purchaseOrders.status, filter.status) : undefined,
        filter.siteId ? eq(purchaseOrders.siteId, filter.siteId) : undefined,
        awaitingIds ? inArray(purchaseOrders.id, awaitingIds) : undefined,
      ),
      // mais recentes primeiro; o id desempata pedidos criados no mesmo instante
      orderBy: [desc(purchaseOrders.createdAt), desc(purchaseOrders.id)],
      with: {
        site: true,
        supplier: true,
        requester: true,
        steps: stepsWith,
        items: { columns: { id: true, description: true }, orderBy: orderItems.position },
      },
    })
    .sync()
}

export type ListedOrder = ReturnType<typeof listOrders>[number]

export const STALLED_AFTER_DAYS = 3

// Desde quando a etapa atual está esperando: a última decisão ou, se ninguém
// decidiu ainda, a criação do pedido.
export function waitingSince(order: { status: string; createdAt: string; steps: { decidedAt: string | null }[] }) {
  if (order.status !== 'PENDING') return null
  return order.steps.reduce((latest, s) => (s.decidedAt && s.decidedAt > latest ? s.decidedAt : latest), order.createdAt)
}

export function isStalled(since: string | null, at = Date.now()) {
  return since !== null && at - Date.parse(since) >= STALLED_AFTER_DAYS * 86_400_000
}

// Números do topo da tela de aprovações.
export function orderStats(actorId?: number, siteId?: number) {
  const pending = listOrders({ status: 'PENDING', siteId })
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const sum = (list: { totalCents: number }[]) => list.reduce((acc, o) => acc + o.totalCents, 0)
  const mine = actorId ? pending.filter((o) => o.steps[o.currentStep!]?.approverId === actorId) : []
  const stalled = pending.filter((o) => isStalled(waitingSince(o)))

  // aprovado "no mês" = a última aprovação da cadeia aconteceu neste mês
  const approved = listOrders({ status: 'APPROVED', siteId }).filter((o) => {
    const last = o.steps.reduce((max, st) => (st.decidedAt && st.decidedAt > max ? st.decidedAt : max), '')
    return last >= monthStart.toISOString()
  })

  return {
    pending: { count: pending.length, totalCents: sum(pending) },
    awaitingMe: { count: mine.length, totalCents: sum(mine) },
    stalled: { count: stalled.length, afterDays: STALLED_AFTER_DAYS },
    approvedThisMonth: { count: approved.length, totalCents: sum(approved) },
  }
}
