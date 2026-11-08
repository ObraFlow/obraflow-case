import { describe, expect, it } from 'vitest'
import { SITE, U, api } from './helpers.js'
import { lastMonths } from '../src/modules/dashboard.js'

const get = async (qs = '') => (await api('GET', `/dashboard${qs}`)).json()

describe('painel de gastos', () => {
  it('soma aprovado, em aprovação e o que sobra do orçamento', async () => {
    const d = await get()
    expect(d.budgetCents).toBe(1_790_000_00)
    expect(d.approvedCents).toBe(24_606_00)
    expect(d.pendingCents).toBe(167_347_15)
    expect(d.availableCents).toBe(1_790_000_00 - 24_606_00 - 167_347_15)
    expect(d.counts).toEqual({ approved: 2, pending: 5, rejected: 1 })
  })

  it('filtra por obra, mas a tabela de obras continua com todas', async () => {
    const d = await get(`?siteId=${SITE.horizonte}`)
    expect(d.budgetCents).toBe(140_000_00)
    expect(d.approvedCents).toBe(21_700_00)
    expect(d.sites).toHaveLength(3)
    expect(d.activity.every((a: { siteCode: string }) => a.siteCode === 'OB-102')).toBe(true)
  })

  it('o gasto entra no mês da última aprovação, quando a cadeia termina', async () => {
    const before = (await get()).months.at(-1).approvedCents
    // PC-00002 está com a Amanda, última etapa: ao aprovar, vira gasto deste mês
    await api('POST', '/orders/2/approve', { as: U.amanda })
    const d = await get()
    expect(d.months.at(-1).approvedCents).toBe(before + 18_304_95)
    expect(d.pendingCents).toBe(167_347_15 - 18_304_95)
    expect(d.activity[0]).toMatchObject({ type: 'APPROVED', code: 'PC-00002', actor: 'Amanda Ribeiro' })
  })

  it('ranking de fornecedores pelo valor aprovado', async () => {
    const d = await get()
    expect(d.suppliers.map((s: { approvedCents: number }) => s.approvedCents)).toEqual([21_700_00, 2_906_00])
  })

  it('meses em ordem, do mais antigo ao atual', () => {
    expect(lastMonths(3, new Date('2026-01-15T12:00:00Z'))).toEqual(['2025-11', '2025-12', '2026-01'])
  })

  it('orçamento não aceita valor negativo', async () => {
    const res = await api('POST', '/sites', { body: { code: 'OB-900', name: 'Teste', city: 'Salvador', budgetCents: -1 } })
    expect(res.statusCode).toBe(400)
  })
})
