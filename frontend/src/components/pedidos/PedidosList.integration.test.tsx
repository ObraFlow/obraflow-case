import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/mocks/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { PedidosList } from '@/components/pedidos/PedidosList';

function renderPedidosList() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={{ expires: '', user: { id: '1', name: 'Amanda', roles: ['ADMIN', 'APROVADOR'] } }}>
        <PedidosList />
      </SessionProvider>
    </QueryClientProvider>
  );
}

describe('PedidosList - Integration Tests', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());

  it('loads and displays pedidos from API', async () => {
    renderPedidosList();

    await waitFor(() => {
      expect(screen.getByText('PC-2026-000001')).toBeInTheDocument();
    });
  });

  it('filters by situacao', async () => {
    renderPedidosList();

    await waitFor(() => {
      expect(screen.getByText('PC-2026-000001')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByLabelText('Situação'));
    await user.click(await screen.findByRole('option', { name: 'Aprovado' }));

    await waitFor(() => {
      // O mock só possui pedidos PENDENTE, então o filtro retorna vazio
      expect(screen.getByText('Nenhum pedido encontrado')).toBeInTheDocument();
    });
  });

  it('navigates to pedido detail', async () => {
    renderPedidosList();

    await waitFor(() => {
      expect(screen.getByText('PC-2026-000001')).toBeInTheDocument();
    });

    // Click on the view details link
    const link = screen.getByRole('link', { name: /ver detalhes/i });
    fireEvent.click(link);

    // Note: In real test, we'd use Next.js router mock
    // For now, just verify the link exists
    expect(screen.getByRole('link', { name: /ver detalhes/i })).toHaveAttribute('href', '/pedidos/1');
  });
});