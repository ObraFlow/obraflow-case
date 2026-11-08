import type { FastifyInstance } from 'fastify'
import { asc, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/client.js'
import { SITE_KINDS, sites, suppliers, users } from '../db/schema.js'
import { UNITS } from './orders/schemas.js'

export const userBody = z.object({
  name: z.string().trim().min(2, 'Informe o nome.'),
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  role: z.string().trim().min(2, 'Informe o cargo.'),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length >= 12 && v.length <= 13, 'Informe o celular com DDI e DDD, ex.: 55 71 99999-0000.')
    .nullish(),
})

export const siteBody = z.object({
  code: z.string().trim().min(2, 'Informe o código da obra.').max(20),
  name: z.string().trim().min(2, 'Informe o nome da obra.'),
  city: z.string().trim().min(2, 'Informe a cidade.'),
  kind: z.enum(SITE_KINDS).default('residential'),
  budgetCents: z.number().int().min(0, 'O orçamento não pode ser negativo.').default(0),
})

export const supplierBody = z.object({
  name: z.string().trim().min(2, 'Informe a razão social.'),
  cnpj: z
    .string({ required_error: 'Informe o CNPJ.' })
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length === 14, 'O CNPJ deve ter 14 dígitos.'),
})

export async function catalogRoutes(app: FastifyInstance) {
  app.get('/units', () => UNITS)

  app.get('/users', () => db.select().from(users).orderBy(asc(users.name)).all())

  app.post('/users', (req, reply) => {
    const user = db.insert(users).values(userBody.parse(req.body)).returning().get()
    return reply.code(201).send(user)
  })

  // tierCount deixa o front avisar "esta obra ainda não tem regras" antes de montar o pedido;
  // pendentes e orçamento alimentam a lista de obras
  app.get('/sites', () =>
    db
      .select({
        id: sites.id,
        code: sites.code,
        name: sites.name,
        city: sites.city,
        kind: sites.kind,
        budgetCents: sites.budgetCents,
        // subconsultas correlacionadas: nomes qualificados para o "id" não ser o da tabela de dentro
        tierCount: sql<number>`(SELECT count(*) FROM approval_tiers t WHERE t.site_id = ${sites}.id)`,
        approvedCents: sql<number>`(SELECT coalesce(sum(o.total_cents), 0) FROM purchase_orders o WHERE o.site_id = ${sites}.id AND o.status = 'APPROVED')`,
        pendingCount: sql<number>`(SELECT count(*) FROM purchase_orders o WHERE o.site_id = ${sites}.id AND o.status = 'PENDING')`,
        pendingCents: sql<number>`(SELECT coalesce(sum(o.total_cents), 0) FROM purchase_orders o WHERE o.site_id = ${sites}.id AND o.status = 'PENDING')`,
      })
      .from(sites)
      .orderBy(asc(sites.code))
      .all(),
  )

  app.post('/sites', (req, reply) => {
    const site = db.insert(sites).values(siteBody.parse(req.body)).returning().get()
    return reply.code(201).send({ ...site, tierCount: 0, approvedCents: 0, pendingCount: 0, pendingCents: 0 })
  })

  app.get('/suppliers', () => db.select().from(suppliers).orderBy(asc(suppliers.name)).all())

  app.post('/suppliers', (req, reply) => {
    const supplier = db.insert(suppliers).values(supplierBody.parse(req.body)).returning().get()
    return reply.code(201).send(supplier)
  })
}
