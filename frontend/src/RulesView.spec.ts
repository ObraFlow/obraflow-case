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

  it('shows the API detail when reference data fails to load', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      if (String(input).endsWith('/api/works')) {
        return { ok: false, status: 400, json: async () => ({ detail: 'Falha ao consultar obras.' }) } as Response
      }
      return { ok: true, status: 200, headers: new Headers({ 'Content-Type': 'application/json' }), json: async () => [] } as Response
    }))

    const wrapper = mount(RulesView)
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Falha ao consultar obras.')
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
})
