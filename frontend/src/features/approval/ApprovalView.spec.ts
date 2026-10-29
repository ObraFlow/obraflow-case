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
    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/api/orders/1/decisions'))).toBe(false)

    await wrapper.get('textarea').setValue('Pedido fora do orçamento')
    await wrapper.get('button.reject-button').trigger('click')
    await flushPromises()
    const decisionCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith('/api/orders/1/decisions'))
    expect(JSON.parse(String(decisionCall?.[1]?.body))).toEqual({ approverId: 10, outcome: 'REJECTED', reason: 'Pedido fora do orçamento' })
    expect(wrapper.text()).toContain('Pedido fora do orçamento')
    expect(wrapper.text()).toContain('O fluxo foi encerrado após a rejeição.')
  })
})
