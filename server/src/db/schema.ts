import { relations, sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text, uniqueIndex, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core'

// Dinheiro em centavos e quantidade em milésimos, sempre INTEGER.
// O INTEGER do SQLite é 64 bits; no JS isso é seguro até 2^53 (~R$ 90 trilhões).

const createdAt = () =>
  text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull(),
  // só dígitos com DDI (5571999990001); usado no link de lembrete por WhatsApp
  phone: text('phone'),
})

export const SITE_KINDS = ['residential', 'commercial', 'industrial'] as const

export const sites = sqliteTable(
  'sites',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    city: text('city').notNull(),
    // tipo da obra: dado da obra, não adivinhado pelo nome
    kind: text('kind', { enum: SITE_KINDS }).notNull().default('residential'),
    // orçamento de compras da obra, em centavos; 0 = ainda não definido
    budgetCents: integer('budget_cents').notNull().default(0),
  },
  (t) => [
    check('sites_kind_ck', sql`${t.kind} IN ('residential', 'commercial', 'industrial')`),
    check('sites_budget_ck', sql`${t.budgetCents} >= 0`),
  ],
)

export const suppliers = sqliteTable('suppliers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  cnpj: text('cnpj').notNull().unique(),
})

// Faixa de alçada. up_to_cents NULL = faixa sem teto ("acima de X").
export const approvalTiers = sqliteTable(
  'approval_tiers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    upToCents: integer('up_to_cents'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('tiers_site_limit_uq').on(t.siteId, t.upToCents),
    // UNIQUE comum aceita vários NULL; este índice parcial deixa só uma faixa sem teto por obra
    uniqueIndex('tiers_site_open_uq')
      .on(t.siteId)
      .where(sql`${t.upToCents} IS NULL`),
    check('tiers_limit_positive', sql`${t.upToCents} IS NULL OR ${t.upToCents} > 0`),
  ],
)

export const tierApprovers = sqliteTable(
  'tier_approvers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tierId: integer('tier_id')
      .notNull()
      .references(() => approvalTiers.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    position: integer('position').notNull(),
  },
  (t) => [uniqueIndex('tier_approvers_position_uq').on(t.tierId, t.position), uniqueIndex('tier_approvers_user_uq').on(t.tierId, t.userId)],
)

export const ORDER_STATUS = ['PENDING', 'APPROVED', 'REJECTED'] as const
export type OrderStatus = (typeof ORDER_STATUS)[number]

export const purchaseOrders = sqliteTable(
  'purchase_orders',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id),
    supplierId: integer('supplier_id')
      .notNull()
      .references(() => suppliers.id),
    requesterId: integer('requester_id')
      .notNull()
      .references(() => users.id),
    orderDate: text('order_date').notNull(), // AAAA-MM-DD
    notes: text('notes'),
    totalCents: integer('total_cents').notNull(),
    status: text('status', { enum: ORDER_STATUS }).notNull().default('PENDING'),
    // posição da etapa aguardando decisão; NULL quando a cadeia terminou
    currentStep: integer('current_step'),
    // retrato da faixa usada: a faixa pode ser editada ou removida depois
    tierId: integer('tier_id').references(() => approvalTiers.id, { onDelete: 'set null' }),
    tierUpToCents: integer('tier_up_to_cents'),
    // pedido rejeitado que este aqui corrige ("Corrigir e reenviar")
    resubmissionOfId: integer('resubmission_of_id').references((): AnySQLiteColumn => purchaseOrders.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [
    index('orders_status_site_idx').on(t.status, t.siteId),
    check('orders_status_ck', sql`${t.status} IN ('PENDING', 'APPROVED', 'REJECTED')`),
    check('orders_total_ck', sql`${t.totalCents} >= 0`),
    check(
      'orders_step_ck',
      sql`(${t.status} = 'PENDING' AND ${t.currentStep} IS NOT NULL) OR (${t.status} <> 'PENDING' AND ${t.currentStep} IS NULL)`,
    ),
  ],
)

export const orderItems = sqliteTable(
  'order_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderId: integer('order_id')
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    description: text('description').notNull(),
    quantityMilli: integer('quantity_milli').notNull(),
    unit: text('unit').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    totalCents: integer('total_cents').notNull(),
  },
  (t) => [
    uniqueIndex('order_items_position_uq').on(t.orderId, t.position),
    check('order_items_qty_ck', sql`${t.quantityMilli} > 0`),
    check('order_items_price_ck', sql`${t.unitPriceCents} >= 0`),
  ],
)

export const STEP_STATUS = ['WAITING', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELED'] as const
export type StepStatus = (typeof STEP_STATUS)[number]

// Cadeia de aprovação do pedido, copiada da faixa na criação.
export const approvalSteps = sqliteTable(
  'approval_steps',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderId: integer('order_id')
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    approverId: integer('approver_id')
      .notNull()
      .references(() => users.id),
    status: text('status', { enum: STEP_STATUS }).notNull(),
    decidedAt: text('decided_at'),
    reason: text('reason'),
  },
  (t) => [
    uniqueIndex('approval_steps_position_uq').on(t.orderId, t.position),
    check('approval_steps_status_ck', sql`${t.status} IN ('WAITING', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELED')`),
    check('approval_steps_reason_ck', sql`${t.status} <> 'REJECTED' OR length(trim(${t.reason})) > 0`),
  ],
)

export const EVENT_TYPES = ['CREATED', 'APPROVED', 'REJECTED'] as const

// Histórico append-only: o código nunca faz UPDATE ou DELETE aqui.
export const orderEvents = sqliteTable(
  'order_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderId: integer('order_id')
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    type: text('type', { enum: EVENT_TYPES }).notNull(),
    actorId: integer('actor_id')
      .notNull()
      .references(() => users.id),
    reason: text('reason'),
    createdAt: createdAt(),
  },
  (t) => [index('order_events_order_idx').on(t.orderId)],
)

export const sitesRelations = relations(sites, ({ many }) => ({ tiers: many(approvalTiers) }))

export const approvalTiersRelations = relations(approvalTiers, ({ one, many }) => ({
  site: one(sites, { fields: [approvalTiers.siteId], references: [sites.id] }),
  approvers: many(tierApprovers),
}))

export const tierApproversRelations = relations(tierApprovers, ({ one }) => ({
  tier: one(approvalTiers, { fields: [tierApprovers.tierId], references: [approvalTiers.id] }),
  user: one(users, { fields: [tierApprovers.userId], references: [users.id] }),
}))

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  site: one(sites, { fields: [purchaseOrders.siteId], references: [sites.id] }),
  supplier: one(suppliers, { fields: [purchaseOrders.supplierId], references: [suppliers.id] }),
  requester: one(users, { fields: [purchaseOrders.requesterId], references: [users.id] }),
  resubmissionOf: one(purchaseOrders, {
    fields: [purchaseOrders.resubmissionOfId],
    references: [purchaseOrders.id],
    relationName: 'resubmission',
  }),
  resubmissions: many(purchaseOrders, { relationName: 'resubmission' }),
  items: many(orderItems),
  steps: many(approvalSteps),
  events: many(orderEvents),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(purchaseOrders, { fields: [orderItems.orderId], references: [purchaseOrders.id] }),
}))

export const approvalStepsRelations = relations(approvalSteps, ({ one }) => ({
  order: one(purchaseOrders, { fields: [approvalSteps.orderId], references: [purchaseOrders.id] }),
  approver: one(users, { fields: [approvalSteps.approverId], references: [users.id] }),
}))

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(purchaseOrders, { fields: [orderEvents.orderId], references: [purchaseOrders.id] }),
  actor: one(users, { fields: [orderEvents.actorId], references: [users.id] }),
}))
