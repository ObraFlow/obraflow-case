import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.vue'

describe('application health indicator', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the connected state after the API and database respond', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const path = String(input)
      const payload = path.endsWith('/api/health')
        ? { status: 'UP', database: 'UP' }
        : path.endsWith('/api/works') ? [{ id: 1, name: 'Obra Centro', code: 'OC-1' }]
          : path.endsWith('/api/suppliers') ? [{ id: 1, name: 'Fornecedor', taxId: '123', active: true }] : []
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => payload,
      })
    }))

    const wrapper = mount(App)
    expect(wrapper.text()).toContain('Conectando aos serviços')

    await flushPromises()

    expect(wrapper.text()).toContain('Ambiente pronto para começar')
    expect(wrapper.text()).toContain('API e banco de dados conectados.')
    wrapper.unmount()
  })
})
