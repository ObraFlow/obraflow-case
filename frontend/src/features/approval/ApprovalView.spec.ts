import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ApprovalView from './ApprovalView.vue'

const pendingOrder = {
  id: 1, workName: 'Obra Centro', supplierName: 'Fornecedor A', orderDate: '2026-10-29',
  items: [{ id: 1, description: 'Cimento', quantity: 2, unit: 'sc', unitPrice: 35, total: 70 }],
  total: 70, status: 'PENDING', currentApproverPosition: 1,
  approvers: [
    { id: 10, name: 'Ana', email: 'ana@example.com', position: 1 },
    { id: 11, name: 'Beto', email: 'beto@example.com', position: 2 },
  ], decisions: [],
}
type TestOrder = {
  id: number; workName: string; supplierName: string; orderDate: string
  items: Array<{ id: number; description: string; quantity: number; unit: string; unitPrice: number; total: number }>
  total: number; status: string; currentApproverPosition: number | null
  approvers: Array<{ id: number; name: string; email: string; position: number }>
  decisions: Array<{ id: number; approverId: number; approverName: string; approverEmail: string; position: number; outcome: string; decidedAt: string; reason: string | null }>
}

function response(payload: unknown, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status,
    headers: new Headers({ 'Content-Type': 'application/json' }), json: async () => payload })
}

describe('approval view', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads orders and details, requires a rejection reason, then records it in history', async () => {
    let current: TestOrder = pendingOrder
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      if (path.endsWith('/api/orders/1/decisions')) {
        const body = JSON.parse(String(init?.body)) as { approverId: number; outcome: string; reason: string }
        current = { ...pendingOrder, status: 'REJECTED', currentApproverPosition: null,
          decisions: [{ id: 3, approverId: body.approverId, approverName: 'Ana', approverEmail: 'ana@example.com',
            position: 1, outcome: 'REJECTED', decidedAt: '2026-10-29T12:00:00Z', reason: body.reason }] }
        return response(current)
      }
      if (path.endsWith('/api/orders/1')) return response(current)
      if (path.endsWith('/api/orders')) return response([current])
      return response([])
    })
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(ApprovalView)
    await flushPromises()
    expect(wrapper.text()).toContain('Pedido #1')
    await wrapper.get('.approval-order').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Cimento')
    expect(wrapper.text()).toContain('Aguardando decisão')

    await wrapper.get('button.reject-button').trigger('click')
    expect(wrapper.text()).toContain('Informe o motivo da rejeição.')
    expect(wrapper.get('textarea').attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('textarea').attributes('aria-describedby')).toBe('decision-error')
    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/api/orders/1/decisions'))).toBe(false)

    await wrapper.get('textarea').setValue('Pedido fora do orçamento')
    expect(wrapper.find('#decision-error').exists()).toBe(false)
    await wrapper.get('button.reject-button').trigger('click')
    await flushPromises()
    const decisionCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith('/api/orders/1/decisions'))
    expect(JSON.parse(String(decisionCall?.[1]?.body))).toEqual({ approverId: 10, outcome: 'REJECTED', reason: 'Pedido fora do orçamento' })
    expect(wrapper.text()).toContain('Pedido fora do orçamento')
    expect(wrapper.text()).toContain('O fluxo foi encerrado após a rejeição.')
  })

  it('retries a failed order list request', async () => {
    let fail = true
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      if (String(input).endsWith('/api/orders') && fail) return response({ detail: 'Não foi possível carregar os pedidos.' }, 500)
      return response([pendingOrder])
    }))

    const wrapper = mount(ApprovalView)
    expect(wrapper.get('[role="status"]').text()).toContain('Carregando pedidos')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Não foi possível carregar os pedidos.')

    fail = false
    await wrapper.get('.load-error button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Pedido #1')
    expect(wrapper.text()).not.toContain('Não foi possível carregar os pedidos.')
  })

  it('retries a failed order details request', async () => {
    let failDetails = true
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input)
      if (path.endsWith('/api/orders/1') && failDetails) return response({ detail: 'Não foi possível carregar os detalhes.' }, 500)
      if (path.endsWith('/api/orders/1')) return response(pendingOrder)
      return response([pendingOrder])
    }))

    const wrapper = mount(ApprovalView)
    await flushPromises()
    await wrapper.get('.approval-order').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Não foi possível carregar os detalhes.')

    failDetails = false
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Cimento')
    expect(wrapper.text()).not.toContain('Não foi possível carregar os detalhes.')
  })

  it('explains that a fully approved order has no more available decisions', async () => {
    const completedOrder: TestOrder = { ...pendingOrder, status: 'APPROVED', currentApproverPosition: null,
      decisions: [
        { id: 3, approverId: 10, approverName: 'Ana', approverEmail: 'ana@example.com', position: 1, outcome: 'APPROVED', decidedAt: '2026-10-29T12:00:00Z', reason: null },
        { id: 4, approverId: 11, approverName: 'Beto', approverEmail: 'beto@example.com', position: 2, outcome: 'APPROVED', decidedAt: '2026-10-29T13:00:00Z', reason: null },
      ] }
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => String(input).endsWith('/api/orders/1')
      ? response(completedOrder)
      : response([completedOrder])))

    const wrapper = mount(ApprovalView)
    await flushPromises()
    await wrapper.get('.approval-order').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Todas as etapas foram aprovadas. Este pedido está concluído.')
    expect(wrapper.find('.decision-panel').exists()).toBe(false)
    expect(wrapper.find('button.reject-button').exists()).toBe(false)
  })

  it('shows a clear empty state when no orders exist', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response([])))
    const wrapper = mount(ApprovalView)
    await flushPromises()
    expect(wrapper.text()).toContain('Nenhum pedido cadastrado')
    expect(wrapper.find('.approval-layout').exists()).toBe(false)
  })
})
