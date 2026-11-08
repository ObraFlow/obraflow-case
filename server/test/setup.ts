import { beforeEach } from 'vitest'
import { runMigrations, sqlite } from '../src/db/client.js'
import { seed } from '../src/db/seed.js'

runMigrations()

const tables = [
  'order_events',
  'approval_steps',
  'order_items',
  'purchase_orders',
  'tier_approvers',
  'approval_tiers',
  'suppliers',
  'sites',
  'users',
]

// cada teste começa com os mesmos dados de demonstração e os mesmos ids
beforeEach(() => {
  sqlite.transaction(() => {
    for (const t of tables) sqlite.prepare(`DELETE FROM ${t}`).run()
    sqlite.prepare('DELETE FROM sqlite_sequence').run()
  })()
  // sem o histórico de meses anteriores: os testes contam pedidos e somam valores exatos
  seed({ history: false })
})
