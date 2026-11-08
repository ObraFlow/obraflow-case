import type { FastifyRequest } from 'fastify'
import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { users } from '../db/schema.js'
import { AppError } from './errors.js'

// Não há login no desafio: o front manda quem está "atuando" no header
// X-User-Id. Em produção isso viria de um token validado (ver README).
export function requireActor(req: FastifyRequest) {
  const user = optionalActor(req)
  if (!user) throw new AppError(401, 'NO_ACTOR', 'Informe o usuário que está realizando a ação (header X-User-Id).')
  return user
}

export function optionalActor(req: FastifyRequest) {
  if (req.headers['x-user-id'] === undefined) return null
  const raw = req.headers['x-user-id']
  const id = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(401, 'NO_ACTOR', 'Informe o usuário que está realizando a ação (header X-User-Id).')
  }
  const user = db.select().from(users).where(eq(users.id, id)).get()
  if (!user) throw new AppError(401, 'NO_ACTOR', 'O usuário informado no header X-User-Id não existe.')
  return user
}
