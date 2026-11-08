import type { FastifyInstance } from 'fastify'
import { and, eq, inArray, isNull, ne } from 'drizzle-orm'
import { z } from 'zod'
import { db, type DB } from '../db/client.js'
import { approvalTiers, sites, tierApprovers, users } from '../db/schema.js'
import { resolveTier, withLowerBounds } from '../domain/tiers.js'
import { AppError, notFound } from '../lib/errors.js'
import { cents, idParam } from '../lib/schemas.js'

type Tx = Parameters<Parameters<DB['transaction']>[0]>[0]

export const tierBody = z.object({
  // null = faixa sem teto ("acima de ...")
  upToCents: cents.positive('O limite deve ser maior que zero.').nullable(),
  approverIds: z
    .array(z.number().int().positive(), { required_error: 'Informe os aprovadores.' })
    .min(1, 'A faixa precisa de pelo menos um aprovador.')
    .max(10, 'No máximo 10 aprovadores por faixa.')
    .refine((ids) => new Set(ids).size === ids.length, 'O mesmo usuário aparece duas vezes na cadeia.'),
})
export type TierInput = z.infer<typeof tierBody>

export function findTiers(siteId: number, tx: Tx | DB = db) {
  return tx.query.approvalTiers
    .findMany({
      where: eq(approvalTiers.siteId, siteId),
      with: { approvers: { orderBy: tierApprovers.position, with: { user: true } } },
    })
    .sync()
}

function listTiers(siteId: number) {
  return withLowerBounds(findTiers(siteId)).map(toTierDto)
}

const toTierDto = (t: ReturnType<typeof findTiers>[number] & { fromCents: number }) => ({
  id: t.id,
  siteId: t.siteId,
  fromCents: t.fromCents,
  upToCents: t.upToCents,
  approvers: t.approvers.map((a) => ({ id: a.user.id, name: a.user.name, role: a.user.role })),
})

function assertSite(tx: Tx, siteId: number) {
  if (!tx.select({ id: sites.id }).from(sites).where(eq(sites.id, siteId)).get()) throw notFound('Obra')
}

// Mensagens amigáveis para o que o banco também barraria (índices únicos).
function assertTierFits(tx: Tx, siteId: number, input: TierInput, ignoreTierId?: number) {
  const clash = tx
    .select({ id: approvalTiers.id })
    .from(approvalTiers)
    .where(
      and(
        eq(approvalTiers.siteId, siteId),
        input.upToCents === null ? isNull(approvalTiers.upToCents) : eq(approvalTiers.upToCents, input.upToCents),
        ignoreTierId ? ne(approvalTiers.id, ignoreTierId) : undefined,
      ),
    )
    .get()

  if (clash) {
    throw input.upToCents === null
      ? new AppError(409, 'OPEN_TIER_EXISTS', 'Esta obra já tem uma faixa sem limite ("acima de"). Edite a existente.')
      : new AppError(409, 'TIER_LIMIT_TAKEN', 'Já existe uma faixa com este limite nesta obra.')
  }

  const found = tx.select({ id: users.id }).from(users).where(inArray(users.id, input.approverIds)).all()
  if (found.length !== input.approverIds.length) {
    throw new AppError(422, 'UNKNOWN_APPROVER', 'Um ou mais aprovadores não existem.')
  }
}

// a ordem do array é a ordem do fluxo
function writeApprovers(tx: Tx, tierId: number, approverIds: number[]) {
  tx.delete(tierApprovers).where(eq(tierApprovers.tierId, tierId)).run()
  tx.insert(tierApprovers)
    .values(approverIds.map((userId, position) => ({ tierId, userId, position })))
    .run()
}

export function createTier(siteId: number, input: TierInput) {
  db.transaction(
    (tx) => {
      assertSite(tx, siteId)
      assertTierFits(tx, siteId, input)
      const tier = tx.insert(approvalTiers).values({ siteId, upToCents: input.upToCents }).returning().get()
      writeApprovers(tx, tier.id, input.approverIds)
    },
    { behavior: 'immediate' },
  )
}

export async function tierRoutes(app: FastifyInstance) {
  app.get('/sites/:id/tiers', (req) => {
    const { id } = idParam.parse(req.params)
    db.transaction((tx) => assertSite(tx, id))
    return listTiers(id)
  })

  app.post('/sites/:id/tiers', (req, reply) => {
    const { id: siteId } = idParam.parse(req.params)
    createTier(siteId, tierBody.parse(req.body))
    return reply.code(201).send(listTiers(siteId))
  })

  // PUT substitui a faixa inteira (limite + cadeia). É assim que se
  // reordena, adiciona ou remove aprovadores: o front manda a lista nova.
  app.put('/tiers/:id', (req) => {
    const { id } = idParam.parse(req.params)
    const input = tierBody.parse(req.body)
    const siteId = db.transaction(
      (tx) => {
        const tier = tx.select().from(approvalTiers).where(eq(approvalTiers.id, id)).get()
        if (!tier) throw notFound('Faixa')
        assertTierFits(tx, tier.siteId, input, id)
        tx.update(approvalTiers).set({ upToCents: input.upToCents }).where(eq(approvalTiers.id, id)).run()
        writeApprovers(tx, id, input.approverIds)
        return tier.siteId
      },
      { behavior: 'immediate' },
    )
    return listTiers(siteId)
  })

  // Pedidos já criados não mudam: a cadeia deles foi copiada na criação.
  app.delete('/tiers/:id', (req) => {
    const { id } = idParam.parse(req.params)
    const tier = db.delete(approvalTiers).where(eq(approvalTiers.id, id)).returning().get()
    if (!tier) throw notFound('Faixa')
    return listTiers(tier.siteId)
  })

  // Prévia para a tela de pedido mostrar a cadeia antes do envio.
  app.get('/sites/:id/chain-preview', (req) => {
    const { id } = idParam.parse(req.params)
    const { totalCents } = z.object({ totalCents: z.coerce.number().pipe(cents) }).parse(req.query)
    const tier = resolveTier(withLowerBounds(findTiers(id)), totalCents)
    return { tier: tier ? toTierDto(tier) : null }
  })
}
