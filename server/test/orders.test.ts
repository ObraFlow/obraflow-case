import { describe, expect, it } from 'vitest'
import { SITE, U, api, item, newOrder } from './helpers.js'

const chainOf = (order: { steps: { approver: { name: string }; status: string }[] }) =>
  order.steps.map((s) => `${s.approver.name.split(' ')[0]}:${s.status}`)

describe('criação de pedido', () => {
  it('recalcula o total no servidor e monta a cadeia da faixa correspondente', async () => {
    const res = await api('POST', '/orders', {
      as: U.pedro,
      body: newOrder(SITE.mirante, [item(25_00, '200'), item(1_250_00, '6')]), // 5.000 + 7.500
    })
    expect(res.statusCode).toBe(201)
    const order = res.json()
    expect(order.totalCents).toBe(12_500_00)
    expect(order.items.map((i: { totalCents: number }) => i.totalCents)).toEqual([5_000_00, 7_500_00])
    expect(chainOf(order)).toEqual(['João:PENDING', 'Amanda:WAITING'])
    expect(order.history).toMatchObject([{ type: 'CREATED', actor: { id: U.pedro } }])
  })

  it('pedido pequeno só precisa de um aprovador', async () => {
    const order = (await api('POST', '/orders', { as: U.pedro, body: newOrder(SITE.mirante) })).json()
    expect(chainOf(order)).toEqual(['João:PENDING'])
  })

  it('recusa pedido quando nenhuma faixa cobre o valor', async () => {
    const res = await api('POST', '/orders', { as: U.pedro, body: newOrder(SITE.galpao) })
    expect(res.statusCode).toBe(422)
    expect(res.json().error.code).toBe('NO_APPLICABLE_TIER')

    const acima = await api('POST', '/orders', { as: U.pedro, body: newOrder(SITE.horizonte, [item(50_000_01)]) })
    expect(acima.json().error.code).toBe('NO_APPLICABLE_TIER')
  })

  it('aponta cada campo inválido com o caminho do erro', async () => {
    const res = await api('POST', '/orders', {
      as: U.pedro,
      body: {
        siteId: SITE.mirante,
        orderDate: '2026-13-01',
        items: [{ description: ' ', quantity: '-2', unit: 'un', unitPriceCents: -1 }],
      },
    })
    expect(res.statusCode).toBe(400)
    const paths = res.json().error.details.map((d: { path: string }) => d.path)
    expect(paths).toEqual(
      expect.arrayContaining(['supplierId', 'orderDate', 'items.0.description', 'items.0.quantity', 'items.0.unitPriceCents']),
    )
  })

  it('exige ao menos um item', async () => {
    const res = await api('POST', '/orders', { as: U.pedro, body: newOrder(SITE.mirante, []) })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.message).toBe('Adicione ao menos um item.')
  })

  it('exige saber quem está criando', async () => {
    const res = await api('POST', '/orders', { body: newOrder(SITE.mirante) })
    expect(res.statusCode).toBe(401)
  })
})

describe('fluxo de aprovação', () => {
  async function bigOrder() {
    return (await api('POST', '/orders', { as: U.pedro, body: newOrder(SITE.mirante, [item(150_000_00)]) })).json()
  }

  it('avança etapa por etapa até aprovar', async () => {
    const order = await bigOrder()
    expect(chainOf(order)).toEqual(['João:PENDING', 'Amanda:WAITING', 'Ricardo:WAITING'])

    let res = await api('POST', `/orders/${order.id}/approve`, { as: U.joao })
    expect(res.json()).toMatchObject({ status: 'PENDING', currentStep: 1 })
    res = await api('POST', `/orders/${order.id}/approve`, { as: U.amanda })
    expect(res.json().currentStep).toBe(2)
    res = await api('POST', `/orders/${order.id}/approve`, { as: U.ricardo })

    const done = res.json()
    expect(done).toMatchObject({ status: 'APPROVED', currentStep: null })
    expect(chainOf(done)).toEqual(['João:APPROVED', 'Amanda:APPROVED', 'Ricardo:APPROVED'])
    expect(done.history.map((h: { type: string }) => h.type)).toEqual(['CREATED', 'APPROVED', 'APPROVED', 'APPROVED'])
  })

  it('impede decidir fora da ordem', async () => {
    const order = await bigOrder()
    const res = await api('POST', `/orders/${order.id}/approve`, { as: U.ricardo })
    expect(res.statusCode).toBe(409)
    expect(res.json().error.code).toBe('OUT_OF_ORDER')
    expect(res.json().error.message).toContain('João Menezes')
  })

  it('impede quem não está na cadeia e quem já decidiu', async () => {
    const order = await bigOrder()
    expect((await api('POST', `/orders/${order.id}/approve`, { as: U.carla })).statusCode).toBe(403)

    await api('POST', `/orders/${order.id}/approve`, { as: U.joao })
    const again = await api('POST', `/orders/${order.id}/approve`, { as: U.joao })
    expect(again.json().error.code).toBe('ALREADY_DECIDED')
  })

  it('rejeição exige motivo, encerra o fluxo e fica no histórico', async () => {
    const order = await bigOrder()
    const semMotivo = await api('POST', `/orders/${order.id}/reject`, { as: U.joao, body: { reason: '   ' } })
    expect(semMotivo.statusCode).toBe(400)

    await api('POST', `/orders/${order.id}/approve`, { as: U.joao })
    const res = await api('POST', `/orders/${order.id}/reject`, {
      as: U.amanda,
      body: { reason: 'Fornecedor fora do cadastro homologado.' },
    })
    const rejected = res.json()
    expect(rejected).toMatchObject({ status: 'REJECTED', currentStep: null })
    expect(chainOf(rejected)).toEqual(['João:APPROVED', 'Amanda:REJECTED', 'Ricardo:CANCELED'])
    expect(rejected.history.at(-1)).toMatchObject({ type: 'REJECTED', reason: 'Fornecedor fora do cadastro homologado.' })

    // nada mais pode ser decidido
    const depois = await api('POST', `/orders/${order.id}/approve`, { as: U.ricardo })
    expect(depois.statusCode).toBe(409)
    expect(depois.json().error.code).toBe('ORDER_CLOSED')
  })

  it('lista "aguardando você" segue a etapa atual persistida', async () => {
    const order = await bigOrder()
    const idsFor = async (user: number) => (await api('GET', '/orders?awaiting=me', { as: user })).json().map((o: { id: number }) => o.id)

    expect(await idsFor(U.joao)).toContain(order.id)
    expect(await idsFor(U.amanda)).not.toContain(order.id)
    await api('POST', `/orders/${order.id}/approve`, { as: U.joao })
    expect(await idsFor(U.joao)).not.toContain(order.id)
    expect(await idsFor(U.amanda)).toContain(order.id)
  })

  it('mudar a regra depois não altera a cadeia de pedidos já criados', async () => {
    const order = await bigOrder()
    const tiers = (await api('GET', `/sites/${SITE.mirante}/tiers`)).json()
    const open = tiers.find((t: { upToCents: number | null }) => t.upToCents === null)
    await api('PUT', `/tiers/${open.id}`, { body: { upToCents: null, approverIds: [U.carla] } })

    const same = (await api('GET', `/orders/${order.id}`)).json()
    expect(chainOf(same)).toEqual(['João:PENDING', 'Amanda:WAITING', 'Ricardo:WAITING'])
  })
})

describe('segregação de funções', () => {
  it('quem está na cadeia não pode cadastrar pedido que cairia nela', async () => {
    const res = await api('POST', '/orders', { as: U.amanda, body: newOrder(SITE.mirante, [item(50_000_00)]) })
    expect(res.statusCode).toBe(422)
    expect(res.json().error.code).toBe('REQUESTER_IN_CHAIN')
  })

  it('a mesma pessoa pode cadastrar um valor cuja faixa não a inclui', async () => {
    const res = await api('POST', '/orders', { as: U.amanda, body: newOrder(SITE.mirante, [item(2_000_00)]) })
    expect(res.statusCode).toBe(201)
  })
})

describe('corrigir e reenviar', () => {
  it('liga o pedido novo ao rejeitado, nos dois sentidos', async () => {
    const rejected = (await api('GET', '/orders?status=REJECTED')).json()[0]
    const res = await api('POST', '/orders', {
      as: U.pedro,
      body: { ...newOrder(SITE.mirante), resubmissionOfId: rejected.id },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().resubmissionOf.id).toBe(rejected.id)

    const original = (await api('GET', `/orders/${rejected.id}`)).json()
    expect(original.resubmissions.map((r: { id: number }) => r.id)).toContain(res.json().id)
  })

  it('só aceita reenvio de pedido rejeitado', async () => {
    const pending = (await api('GET', '/orders?status=PENDING')).json()[0]
    const res = await api('POST', '/orders', { as: U.pedro, body: { ...newOrder(SITE.mirante), resubmissionOfId: pending.id } })
    expect(res.json().error.code).toBe('INVALID_RESUBMISSION')
  })
})

describe('prazo e resumo', () => {
  it('marca como parado o pedido esperando há mais de 3 dias', async () => {
    const pending = (await api('GET', '/orders?status=PENDING')).json()
    const stalled = pending.filter((o: { stalled: boolean }) => o.stalled).map((o: { site: { code: string } }) => o.site.code)
    // seed: um parado com a Amanda (OB-101) e um com a Beatriz (OB-102)
    expect(stalled.sort()).toEqual(['OB-101', 'OB-102'])
    for (const o of pending) expect(o.waitingSince).toBeTruthy()
  })

  it('resume pendências do sistema e de quem está atuando', async () => {
    const all = (await api('GET', '/orders?status=PENDING')).json()
    const stats = (await api('GET', '/orders/stats', { as: U.joao })).json()
    expect(stats.pending.count).toBe(all.length)
    expect(stats.pending.totalCents).toBe(all.reduce((s: number, o: { totalCents: number }) => s + o.totalCents, 0))
    expect(stats.awaitingMe.count).toBe(2) // concreto e o reenvio do andaime
    expect(stats.stalled).toEqual({ count: 2, afterDays: 3 })

    const anon = (await api('GET', '/orders/stats')).json()
    expect(anon.awaitingMe.count).toBe(0)
  })
})
