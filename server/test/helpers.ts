import { buildApp } from '../src/app.js'

export const app = buildApp()

// ids fixos vindos do seed
export const U = { pedro: 1, joao: 2, amanda: 3, carla: 4, ricardo: 5, beatriz: 6 }
export const SITE = { mirante: 1, horizonte: 2, galpao: 3 }

export function api(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, opts: { as?: number; body?: unknown } = {}) {
  return app.inject({
    method,
    url: `/api${url}`,
    headers: opts.as ? { 'x-user-id': String(opts.as) } : {},
    payload: opts.body as Record<string, unknown> | undefined,
  })
}

export const item = (unitPriceCents: number, quantity = '1') => ({
  description: 'Cimento CP-II 50 kg',
  quantity,
  unit: 'sc',
  unitPriceCents,
})

export const newOrder = (siteId: number, items = [item(8_000_00)]) => ({
  siteId,
  supplierId: 1,
  orderDate: '2026-10-23',
  items,
})
