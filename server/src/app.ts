import Fastify from 'fastify'
import { ZodError } from 'zod'
import { AppError } from './lib/errors.js'
import { catalogRoutes } from './modules/catalog.js'
import { tierRoutes } from './modules/tiers.js'
import { orderRoutes } from './modules/orders/routes.js'
import { dashboardRoutes } from './modules/dashboard.js'
import { registerDocs } from './openapi.js'

export function buildApp(opts: { logger?: boolean } = {}) {
  // sem log por requisição: no dev polui o terminal; erros 500 continuam logados
  const app = Fastify({ logger: opts.logger ? { level: 'warn' } : false })

  // Todo erro sai no mesmo formato: { error: { code, message, details? } }
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message, details: err.details } })
    }
    if (err instanceof ZodError) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: err.issues[0]?.message ?? 'Dados inválidos.',
          details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      })
    }
    const e = err as { code?: string; statusCode?: number; message: string }
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return reply.code(409).send({ error: { code: 'DUPLICATE', message: 'Já existe um registro com estes dados.' } })
    }
    if (e.statusCode && e.statusCode < 500) {
      // erros do próprio Fastify (JSON malformado, body grande demais...)
      return reply.code(e.statusCode).send({ error: { code: 'BAD_REQUEST', message: e.message } })
    }
    req.log.error(err)
    return reply.code(500).send({ error: { code: 'INTERNAL', message: 'Erro inesperado no servidor.' } })
  })

  app.get('/api/health', () => ({ ok: true }))
  app.register(registerDocs)
  app.register(
    async (api) => {
      await api.register(catalogRoutes)
      await api.register(tierRoutes)
      await api.register(orderRoutes)
      await api.register(dashboardRoutes)
    },
    { prefix: '/api' },
  )
  return app
}
