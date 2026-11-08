// Demo online: a mesma API, rodando como função da Vercel.
// O SQLite vive em /tmp e é criado com o seed quando a instância nasce, então
// a demo volta ao estado inicial de tempos em tempos (e cada instância tem o seu).
import { freshDatabase } from './env.js'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../server/src/app.js'
import { runMigrations } from '../server/src/db/client.js'
import { seed } from '../server/src/db/seed.js'

let ready: Promise<FastifyInstance> | null = null

async function boot() {
  runMigrations()
  if (freshDatabase) seed()
  const app = buildApp()
  await app.ready()
  return app
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await (ready ??= boot())
  app.server.emit('request', req, res)
}
