import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest } from './http'

describe('API client', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns the decoded JSON response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ id: 7 }),
    }))

    await expect(apiRequest<{ id: number }>('/api/works/7')).resolves.toEqual({ id: 7 })
  })

  it('uses the problem detail when a request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ title: 'Requisição inválida', detail: 'Informe o nome da obra.' }),
    }))

    await expect(apiRequest('/api/works')).rejects.toEqual(new ApiError('Informe o nome da obra.', 400))
  })
})
