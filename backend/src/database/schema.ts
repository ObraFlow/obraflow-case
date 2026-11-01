import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';

export const orderStatus = pgEnum('order_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
]);
export const approvalStatus = pgEnum('approval_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
]);

export const works = pgTable('works', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 180 }).notNull(),
  document: varchar('document', { length: 30 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const approvalRules = pgTable(
  'approval_rules',
  {
    id: serial('id').primaryKey(),
    workId: integer('work_id')
      .notNull()
      .references(() => works.id, { onDelete: 'cascade' }),
    minimumTotalCents: integer('minimum_total_cents').notNull(),
    maximumTotalCents: integer('maximum_total_cents'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('approval_rules_work_range').on(
      table.workId,
      table.minimumTotalCents,
    ),
  ],
);

export const approvalRuleApprovers = pgTable(
  'approval_rule_approvers',
  {
    id: serial('id').primaryKey(),
    ruleId: integer('rule_id')
      .notNull()
      .references(() => approvalRules.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    position: integer('position').notNull(),
  },
  (table) => [
    unique('approval_rule_approvers_order').on(table.ruleId, table.position),
  ],
);

export const purchaseOrders = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  workId: integer('work_id')
    .notNull()
    .references(() => works.id),
  supplierId: integer('supplier_id')
    .notNull()
    .references(() => suppliers.id),
  orderDate: timestamp('order_date', { withTimezone: true }).notNull(),
  notes: varchar('notes', { length: 2000 }),
  totalCents: integer('total_cents').notNull(),
  status: orderStatus('status').default('PENDING').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 500 }).notNull(),
  quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
  unit: varchar('unit', { length: 20 }).notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  totalCents: integer('total_cents').notNull(),
});

export const purchaseOrderApprovals = pgTable(
  'purchase_order_approvals',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    approverId: integer('approver_id')
      .notNull()
      .references(() => users.id),
    position: integer('position').notNull(),
    status: approvalStatus('status').default('PENDING').notNull(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    rejectionReason: varchar('rejection_reason', { length: 1000 }),
  },
  (table) => [
    unique('purchase_order_approvals_order_position').on(
      table.orderId,
      table.position,
    ),
  ],
);
