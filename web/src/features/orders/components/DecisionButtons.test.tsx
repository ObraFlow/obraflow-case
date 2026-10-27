import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DecidableOrder } from '../decision'
import { RejectButton } from './DecisionButtons'

const order: DecidableOrder = {
  id: 'order-1',
  number: 6,
  total: '110500',
  status: 'PENDING',
  version: 1,
  steps: [],
}

function renderButton() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RejectButton order={order} />
    </QueryClientProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe('RejectButton', () => {
  it('requires a reason before sending anything to the API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const user = userEvent.setup()
    renderButton()

    await user.click(screen.getByRole('button', { name: 'Rejeitar' }))
    await user.type(screen.getByLabelText('Motivo da rejeição'), '   ')
    await user.click(screen.getByRole('button', { name: 'Rejeitar pedido' }))

    expect(await screen.findByText('Informe o motivo da rejeição.')).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('sends the reason and the version the user saw', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ...order, status: 'REJECTED', steps: [] }), { status: 200 }),
      )
    const user = userEvent.setup()
    renderButton()

    await user.click(screen.getByRole('button', { name: 'Rejeitar' }))
    await user.type(screen.getByLabelText('Motivo da rejeição'), '  Preço acima do contrato ')
    await user.click(screen.getByRole('button', { name: 'Rejeitar pedido' }))

    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('/api/purchase-orders/order-1/reject')
    expect(JSON.parse(init!.body as string)).toEqual({
      version: 1,
      reason: 'Preço acima do contrato',
    })
  })
})
