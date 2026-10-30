import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { PedidoForm } from '@/components/pedidos/PedidoForm';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    getObras: vi.fn(),
    getFornecedores: vi.fn(),
    createPedido: vi.fn(),
  },
}));

function renderPedidoForm() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={null}>
        <PedidoForm
          obras={[{ id: '1', codigo: 'OBRA-001', nome: 'Obra 1', endereco: '', status: 'ATIVA', criadoEm: '' }]}
          fornecedores={[{ id: '1', nome: 'Fornecedor 1', documento: '', email: '', telefone: '', ativo: true, criadoEm: '' }]}
        />
      </SessionProvider>
    </QueryClientProvider>
  );
}

describe('PedidoForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getObras).mockResolvedValue([
      { id: '1', codigo: 'OBRA-001', nome: 'Obra 1', endereco: '', status: 'ATIVA', criadoEm: '' },
    ]);
    vi.mocked(api.getFornecedores).mockResolvedValue([
      { id: '1', nome: 'Fornecedor 1', documento: '', email: '', telefone: '', ativo: true, criadoEm: '' },
    ]);
  });

  it('renders form with required fields', async () => {
    renderPedidoForm();

    await waitFor(() => {
      expect(screen.getByLabelText(/^Obra/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Fornecedor/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Data do Pedido/)).toBeInTheDocument();
    });
  });

  it('keeps submit button disabled while required fields are invalid', async () => {
    renderPedidoForm();

    const submitButton = screen.getByRole('button', { name: /cadastrar pedido/i });
    // Formulário inválido (sem obra/fornecedor) → botão desabilitado (mode: onChange)
    expect(submitButton).toBeDisabled();
  });

  it('adds and removes items', async () => {
    renderPedidoForm();

    await waitFor(() => {
      expect(screen.getByLabelText('Descrição *')).toBeInTheDocument();
    });

    // Add second item
    const addButton = screen.getByRole('button', { name: /adicionar item/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      const descricoes = screen.getAllByLabelText('Descrição *');
      expect(descricoes).toHaveLength(2);
    });

    // Remove second item
    const removeButtons = screen.getAllByRole('button', { name: /remover item/i });
    fireEvent.click(removeButtons[1]);

    await waitFor(() => {
      const descricoes = screen.getAllByLabelText('Descrição *');
      expect(descricoes).toHaveLength(1);
    });
  });

  it('calculates item total in real time', async () => {
    renderPedidoForm();

    await waitFor(() => {
      const quantidadeInput = screen.getByLabelText('Qtd *');
      const precoInput = screen.getByLabelText('Preço Unit. *');

      fireEvent.change(quantidadeInput, { target: { value: '10' } });
      fireEvent.change(precoInput, { target: { value: '100' } });
    });

    await waitFor(() => {
      expect(screen.getAllByText('R$ 1.000,00').length).toBeGreaterThan(0);
    });
  });

  it('calculates total do pedido', async () => {
    renderPedidoForm();

    await waitFor(() => {
      expect(screen.getAllByText('R$ 0,00').length).toBeGreaterThan(0);
    });

    // Add first item
    const qtd1 = screen.getAllByLabelText('Qtd *')[0];
    const preco1 = screen.getAllByLabelText('Preço Unit. *')[0];
    fireEvent.change(qtd1, { target: { value: '5' } });
    fireEvent.change(preco1, { target: { value: '100' } });

    // Add second item
    const addButton = screen.getByRole('button', { name: /adicionar item/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      const qtd2 = screen.getAllByLabelText('Qtd *')[1];
      const preco2 = screen.getAllByLabelText('Preço Unit. *')[1];
      fireEvent.change(qtd2, { target: { value: '2' } });
      fireEvent.change(preco2, { target: { value: '50' } });
    });

    await waitFor(() => {
      expect(screen.getAllByText('R$ 600,00').length).toBeGreaterThan(0);
    });
  });
});