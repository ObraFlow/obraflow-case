import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { PedidosList } from '@/components/pedidos/PedidosList';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    getPedidos: vi.fn(),
    getObras: vi.fn(),
    getFornecedores: vi.fn(),
  },
}));

function renderPedidosList() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={null}>
        <PedidosList />
      </SessionProvider>
    </QueryClientProvider>
  );
}

describe('PedidosList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getObras).mockResolvedValue([]);
    vi.mocked(api.getFornecedores).mockResolvedValue([]);
  });

  it('renders loading state initially', () => {
    vi.mocked(api.getPedidos).mockReturnValue(new Promise(() => {}));
    renderPedidosList();
    expect(screen.getByText('Carregando pedidos...')).toBeInTheDocument();
  });

  it('renders empty state when no pedidos', async () => {
    vi.mocked(api.getPedidos).mockResolvedValue({
      conteudo: [],
      pagina: 0,
      tamanho: 20,
      totalElementos: 0,
      totalPaginas: 1,
    });

    renderPedidosList();

    await waitFor(() => {
      expect(screen.getByText('Nenhum pedido encontrado')).toBeInTheDocument();
    });
  });

  it('renders pedidos table with data', async () => {
    vi.mocked(api.getPedidos).mockResolvedValue({
      conteudo: [
        {
          id: '1',
          numero: 'PC-001',
          obraCodigo: 'OBRA-001',
          obraNome: 'Edifício Horizonte',
          fornecedorNome: 'Cimentos ABC',
          dataPedido: '2026-01-15',
          quantidadeItens: 2,
          valorTotal: 5000.00,
          situacao: 'PENDENTE',
          alcada: {
            etapaAtual: 1,
            totalEtapas: 2,
            aprovadorAtual: { usuarioId: '1', usuarioNome: 'Amanda' },
            etapasConcluidas: [],
            proximasEtapas: [{ usuarioId: '2', usuarioNome: 'João' }],
          },
        },
      ],
      pagina: 0,
      tamanho: 20,
      totalElementos: 1,
      totalPaginas: 1,
    });

    renderPedidosList();

    await waitFor(() => {
      expect(screen.getByText('PC-001')).toBeInTheDocument();
      expect(screen.getByText('Edifício Horizonte')).toBeInTheDocument();
      expect(screen.getByText('Cimentos ABC')).toBeInTheDocument();
    });
  });

  it('filters by situacao when select changes', async () => {
    vi.mocked(api.getPedidos).mockResolvedValue({
      conteudo: [],
      pagina: 0,
      tamanho: 20,
      totalElementos: 0,
      totalPaginas: 1,
    });

    renderPedidosList();

    await waitFor(() => {
      expect(screen.getByLabelText('Situação')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByLabelText('Situação'));
    await user.click(await screen.findByRole('option', { name: 'Aprovado' }));

    await waitFor(() => {
      expect(api.getPedidos).toHaveBeenCalledWith(
        expect.objectContaining({ situacao: 'APROVADO' }),
        'test-token'
      );
    });
  });
});