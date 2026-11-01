import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, afterEach } from 'vitest'
import RulesView from './RulesView.vue'

describe('approval rules screen', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads a work configuration and saves the approver order', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      const headers = new Headers({ 'Content-Type': 'application/json' })
      if (url.endsWith('/api/works')) return { ok: true, status: 200, headers, json: async () => [{ id: 1, name: 'Obra Centro', code: 'OC-1' }] } as Response
      if (url.endsWith('/api/users')) return { ok: true, status: 200, headers, json: async () => [{ id: 4, name: 'Ana', email: 'ana@obraflow.test', active: true }, { id: 5, name: 'Caio', email: 'caio@obraflow.test', active: true }] } as Response
      if (init?.method === 'PUT') return { ok: true, status: 200, headers, json: async () => [{ id: 9, minAmount: 0, maxAmount: null, approvers: [{ id: 5 }, { id: 4 }] }] } as Response
      return { ok: true, status: 200, headers, json: async () => [{ id: 9, minAmount: 0, maxAmount: null, approvers: [{ id: 4 }, { id: 5 }] }] } as Response
    })
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mount(RulesView)
    await flushPromises()
    await wrapper.findAll('.approver')[0].findAll('button')[1].trigger('click')
    await wrapper.get('button.primary-button').trigger('click')
    await flushPromises()
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')
    expect(JSON.parse(String(put?.[1]?.body))).toEqual([{ minAmount: 0, maxAmount: null, approverIds: [5, 4] }])
    expect(wrapper.text()).toContain('Regras salvas com sucesso.')
  })

  it('shows an API error and retries after reference data fails to load', async () => {
    let fail = true
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      if (String(input).endsWith('/api/works')) {
        if (fail) return { ok: false, status: 500, json: async () => ({ detail: 'Falha ao consultar obras.' }) } as Response
        return { ok: true, status: 200, headers: new Headers({ 'Content-Type': 'application/json' }), json: async () => [{ id: 1, name: 'Obra Centro', code: 'OC-1' }] } as Response
      }
      return { ok: true, status: 200, headers: new Headers({ 'Content-Type': 'application/json' }), json: async () => [] } as Response
    }))

    const wrapper = mount(RulesView)
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Falha ao consultar obras.')
    fail = false
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Obra Centro')
    expect(wrapper.text()).not.toContain('Falha ao consultar obras.')
  })

  it('shows a server validation error without reporting a successful save', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      const headers = new Headers({ 'Content-Type': 'application/json' })
      if (url.endsWith('/api/works')) return { ok: true, status: 200, headers, json: async () => [{ id: 1, name: 'Obra Centro', code: 'OC-1' }] } as Response
      if (url.endsWith('/api/users')) return { ok: true, status: 200, headers, json: async () => [{ id: 4, name: 'Ana', email: 'ana@obraflow.test', active: true }] } as Response
      if (init?.method === 'PUT') return { ok: false, status: 400, json: async () => ({ detail: 'Cada faixa precisa de aprovador.' }) } as Response
      return { ok: true, status: 200, headers, json: async () => [{ id: 9, minAmount: 0, maxAmount: null, approvers: [{ id: 4 }] }] } as Response
    })
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(RulesView)
    await flushPromises()
    await wrapper.get('button.primary-button').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Cada faixa precisa de aprovador.')
    expect(wrapper.text()).not.toContain('Regras salvas com sucesso.')
  })

  it('keeps the work registration form available when there are no works', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => ({
      ok: true, status: 200, headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => String(input).endsWith('/api/works') ? [] : [],
    }) as Response))

    const wrapper = mount(RulesView)
    await flushPromises()

    expect(wrapper.text()).toContain('Comece cadastrando uma obra')
    expect(wrapper.get('input[placeholder="Ex.: Residencial Horizonte"]')).toBeDefined()
    expect(wrapper.findAll('.reference-card form')[0].find('button').text()).toContain('Cadastrar obra')
  })

  it('clears the previous work bands on selection failure and can retry the new work', async () => {
    let failSecondWork = true
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      const payload = url.endsWith('/api/works')
        ? [{ id: 1, name: 'Obra Centro', code: 'OC-1' }, { id: 2, name: 'Obra Norte', code: 'ON-2' }]
        : url.endsWith('/api/users')
          ? [{ id: 4, name: 'Ana', email: 'ana@obraflow.test', active: true }]
          : url.endsWith('/api/works/1/approval-bands')
            ? [{ id: 9, minAmount: 0, maxAmount: null, approvers: [{ id: 4 }] }]
            : [{ id: 10, minAmount: 0, maxAmount: null, approvers: [{ id: 4 }] }]
      if (url.endsWith('/api/works/2/approval-bands') && failSecondWork) {
        return { ok: false, status: 500, json: async () => ({ detail: 'Falha ao consultar regras.' }) } as Response
      }
      return { ok: true, status: 200, headers: new Headers({ 'Content-Type': 'application/json' }), json: async () => payload } as Response
    })
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(RulesView)
    await flushPromises()
    expect(wrapper.text()).toContain('Faixa 1')

    await wrapper.get('select').setValue('2')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Falha ao consultar regras.')
    expect(wrapper.text()).not.toContain('Faixa 1')

    failSecondWork = false
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Faixa 1')
    expect(wrapper.text()).not.toContain('Falha ao consultar regras.')
  })

  it('exposes selected approvers and names each reorder and removal control', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      const payload = url.endsWith('/api/works') ? [{ id: 1, name: 'Obra Centro', code: 'OC-1' }]
        : url.endsWith('/api/users') ? [{ id: 4, name: 'Ana', email: 'ana@obraflow.test', active: true }, { id: 5, name: 'Beto', email: 'beto@obraflow.test', active: true }]
          : [{ id: 9, minAmount: 0, maxAmount: null, approvers: [{ id: 4 }, { id: 5 }] }]
      return { ok: true, status: 200, headers: new Headers({ 'Content-Type': 'application/json' }), json: async () => payload } as Response
    }))

    const wrapper = mount(RulesView)
    await flushPromises()

    const anaOption = wrapper.get('.user-options button')
    expect(anaOption.attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('button[aria-label="Mover Ana para cima"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Mover Ana para baixo"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Remover Ana dos aprovadores"]').exists()).toBe(true)
  })
})
