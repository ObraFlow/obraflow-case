import { describe, expect, it } from 'vitest'
import { sqlite } from '../src/db/client.js'
import { SITE, U, api } from './helpers.js'

type Tier = { id: number; fromCents: number; upToCents: number | null; approvers: { id: number }[] }
const tiersOf = async (siteId: number): Promise<Tier[]> => (await api('GET', `/sites/${siteId}/tiers`)).json()

describe('regras de alçada', () => {
  it('lista as faixas em ordem crescente com o piso calculado', async () => {
    const tiers = await tiersOf(SITE.mirante)
    expect(tiers.map((t) => [t.fromCents, t.upToCents])).toEqual([
      [0, 10_000_00],
      [10_000_01, 100_000_00],
      [100_000_01, null],
    ])
  })

  it('cria faixa e reordena aprovadores', async () => {
    const created = await api('POST', `/sites/${SITE.horizonte}/tiers`, {
      body: { upToCents: null, approverIds: [U.beatriz, U.carla, U.ricardo] },
    })
    expect(created.statusCode).toBe(201)
    const open = created.json().find((t: Tier) => t.upToCents === null)

    const updated = await api('PUT', `/tiers/${open.id}`, { body: { upToCents: null, approverIds: [U.ricardo, U.beatriz] } })
    const after = updated.json().find((t: Tier) => t.id === open.id)
    expect(after.approvers.map((a: { id: number }) => a.id)).toEqual([U.ricardo, U.beatriz])
  })

  it('remove faixa', async () => {
    const [first] = await tiersOf(SITE.horizonte)
    const res = await api('DELETE', `/tiers/${first.id}`)
    expect(res.json()).toHaveLength(1)
  })

  it('não aceita limite repetido, segunda faixa aberta, cadeia vazia ou aprovador duplicado', async () => {
    const post = (body: unknown) => api('POST', `/sites/${SITE.mirante}/tiers`, { body })
    expect((await post({ upToCents: 10_000_00, approverIds: [U.joao] })).json().error.code).toBe('TIER_LIMIT_TAKEN')
    expect((await post({ upToCents: null, approverIds: [U.joao] })).json().error.code).toBe('OPEN_TIER_EXISTS')
    expect((await post({ upToCents: 500_00, approverIds: [] })).statusCode).toBe(400)
    expect((await post({ upToCents: 500_00, approverIds: [U.joao, U.joao] })).statusCode).toBe(400)
    expect((await post({ upToCents: 0, approverIds: [U.joao] })).statusCode).toBe(400)
  })

  it('o banco também barra uma segunda faixa aberta, mesmo fora da API', () => {
    expect(() => sqlite.prepare('INSERT INTO approval_tiers (site_id, up_to_cents) VALUES (?, NULL)').run(SITE.mirante)).toThrow(/UNIQUE/)
  })

  it('o banco recusa pedido em estado incoerente', () => {
    // APPROVED com etapa atual preenchida viola o CHECK
    expect(() => sqlite.prepare("UPDATE purchase_orders SET status = 'APPROVED', current_step = 0 WHERE id = 3").run()).toThrow(/CHECK/)
  })

  it('prévia de cadeia por valor', async () => {
    const res = await api('GET', `/sites/${SITE.mirante}/chain-preview?totalCents=1250000`)
    expect(res.json().tier.approvers.map((a: { id: number }) => a.id)).toEqual([U.joao, U.amanda])
    const none = await api('GET', `/sites/${SITE.galpao}/chain-preview?totalCents=100`)
    expect(none.json().tier).toBeNull()
  })
})

describe('obras', () => {
  it('cada obra vem com tipo, faixas e o que espera aprovação', async () => {
    const sites = (await api('GET', '/sites')).json()
    const pending = (await api('GET', '/orders?status=PENDING')).json()
    for (const site of sites) {
      const mine = pending.filter((o: { site: { id: number } }) => o.site.id === site.id)
      expect(site.pendingCount).toBe(mine.length)
      expect(site.pendingCents).toBe(mine.reduce((s: number, o: { totalCents: number }) => s + o.totalCents, 0))
    }
    expect(sites.map((s: { kind: string; tierCount: number }) => [s.kind, s.tierCount])).toEqual([
      ['residential', 3],
      ['commercial', 2],
      ['industrial', 0],
    ])
  })

  it('o banco recusa tipo de obra desconhecido', () => {
    expect(() => sqlite.prepare("INSERT INTO sites (code, name, city, kind) VALUES ('X', 'X', 'X', 'castelo')").run()).toThrow(/CHECK/)
  })
})
