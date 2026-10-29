import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import OrderView from './OrderView.vue'

function response(payload: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => payload,
  })
}

describe('order creation form', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('starts with one blank item and calculates the order total before submission', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      if (path.endsWith('/api/works')) return response([{ id: 1, name: 'Obra Centro', code: 'OC-1' }])
      if (path.endsWith('/api/suppliers')) return response([{ id: 2, name: 'Fornecedor', taxId: '123', active: true }])
      if (path.endsWith('/api/orders') && init?.method === 'POST') return response({ id: 35, total: 8.5 })
      return response([])
    })
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(OrderView)
    await flushPromises()
    expect(wrapper.text()).toContain('Item 01')
    expect(wrapper.text()).toContain('Selecione um fornecedor.')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()

    await wrapper.get('select[aria-label="Fornecedor"]').setValue('2')
    await wrapper.get('input[placeholder="Ex.: Cimento CP-II 50 kg"]').setValue('Cimento')
    await wrapper.get('input[placeholder="0,000"]').setValue('2')
    await wrapper.get('input[placeholder="un, kg, m²…"]').setValue('un')
    await wrapper.get('input[placeholder="0,00"]').setValue('4,25')

    expect(wrapper.text()).toContain('R$ 8,50')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const createCall = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith('/api/orders') && init?.method === 'POST')
    expect(createCall).toBeDefined()
    expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
      workId: 1, supplierId: 2, items: [{ quantity: '2.000', unitPrice: '4.25' }],
    })
    expect(wrapper.text()).toContain('Pedido cadastrado com sucesso')
  })

  it('shows an empty state when there are no works', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, _init?: RequestInit) => String(input).endsWith('/api/works')
      ? response([])
      : response([{ id: 2, name: 'Fornecedor', taxId: '123', active: true }])))

    const wrapper = mount(OrderView)
    await flushPromises()
    expect(wrapper.text()).toContain('Nenhuma obra cadastrada')
    expect(wrapper.find('form').exists()).toBe(false)
  })
})
