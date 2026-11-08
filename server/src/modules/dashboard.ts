import type { FastifyInstance } from 'fastify'
import { asc } from 'drizzle-orm'
import { z } from 'zod'
import { db, sqlite } from '../db/client.js'
import { sites } from '../db/schema.js'
import { orderCode } from './orders/dto.js'
import { listOrders, type ListedOrder } from './orders/service.js'

export const dashboardQuery = z.object({ siteId: z.coerce.number().int().positive().optional() })

const MONTHS = 6
const TOP_SUPPLIERS = 5
const ACTIVITY = 8

// Gasto "aprovado" é o pedido que terminou a cadeia; a data que conta é a da
// última aprovação, não a da criação (é quando o dinheiro fica comprometido).
export const approvedAt = (o: Pick<ListedOrder, 'steps'>) =>
  o.steps.reduce((max, s) => (s.decidedAt && s.decidedAt > max ? s.decidedAt : max), '')

const sum = (list: { totalCents: number }[]) => list.reduce((acc, o) => acc + o.totalCents, 0)

// "2026-10" dos últimos N meses, do mais antigo para o atual (em UTC, como as datas gravadas)
export function lastMonths(n: number, now = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1 - i), 1))
    return d.toISOString().slice(0, 7)
  })
}

export function dashboard(siteId?: number) {
  const orders = listOrders({ siteId })
  const approved = orders.filter((o) => o.status === 'APPROVED')
  const pending = orders.filter((o) => o.status === 'PENDING')

  const siteRows = db.select().from(sites).orderBy(asc(sites.code)).all()
  const scope = siteId ? siteRows.filter((s) => s.id === siteId) : siteRows
  const budgetCents = scope.reduce((acc, s) => acc + s.budgetCents, 0)
  const approvedCents = sum(approved)
  const pendingCents = sum(pending)

  const months = lastMonths(MONTHS).map((month) => {
    const inMonth = approved.filter((o) => approvedAt(o).startsWith(month))
    return { month, approvedCents: sum(inMonth), count: inMonth.length }
  })

  const bySupplier = new Map<number, { id: number; name: string; approvedCents: number; count: number }>()
  for (const o of approved) {
    const row = bySupplier.get(o.supplierId) ?? { id: o.supplierId, name: o.supplier.name, approvedCents: 0, count: 0 }
    row.approvedCents += o.totalCents
    row.count += 1
    bySupplier.set(o.supplierId, row)
  }
  const suppliers = [...bySupplier.values()].sort((a, b) => b.approvedCents - a.approvedCents).slice(0, TOP_SUPPLIERS)

  // tempo médio entre criar o pedido e a última aprovação
  const hours = approved.map((o) => (Date.parse(approvedAt(o)) - Date.parse(o.createdAt)) / 3_600_000)
  const avgApprovalHours = hours.length ? Math.round(hours.reduce((a, b) => a + b, 0) / hours.length) : null

  // por obra sempre traz todas: a tabela do painel compara uma com a outra
  const all = siteId ? listOrders({}) : orders
  const perSite = siteRows.map((s) => {
    const mine = all.filter((o) => o.siteId === s.id)
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      city: s.city,
      budgetCents: s.budgetCents,
      approvedCents: sum(mine.filter((o) => o.status === 'APPROVED')),
      pendingCents: sum(mine.filter((o) => o.status === 'PENDING')),
      pendingCount: mine.filter((o) => o.status === 'PENDING').length,
    }
  })

  const activity = sqlite
    .prepare(
      `SELECT e.id, e.type, e.created_at AS at, o.id AS orderId, o.total_cents AS totalCents,
              s.code AS siteCode, u.name AS actor
         FROM order_events e
         JOIN purchase_orders o ON o.id = e.order_id
         JOIN sites s ON s.id = o.site_id
         JOIN users u ON u.id = e.actor_id
        WHERE (? IS NULL OR o.site_id = ?)
        ORDER BY e.created_at DESC, e.id DESC
        LIMIT ?`,
    )
    .all(siteId ?? null, siteId ?? null, ACTIVITY) as Array<{
    id: number
    type: string
    at: string
    orderId: number
    totalCents: number
    siteCode: string
    actor: string
  }>

  return {
    budgetCents,
    approvedCents,
    pendingCents,
    availableCents: budgetCents - approvedCents - pendingCents,
    counts: {
      approved: approved.length,
      pending: pending.length,
      rejected: orders.filter((o) => o.status === 'REJECTED').length,
    },
    avgApprovalHours,
    months,
    suppliers,
    sites: perSite,
    activity: activity.map((a) => ({ ...a, code: orderCode(a.orderId) })),
  }
}

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/dashboard', (req) => dashboard(dashboardQuery.parse(req.query).siteId))
}
