'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatCurrency, getSituacaoLabel, getSituacaoVariant } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Pagination } from '@/components/ui/pagination';
import { api, type PedidoFilters, type ObraResultado, type FornecedorResultado } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ShoppingCart, Trash2 } from 'lucide-react';

const TODAS = 'TODAS';

const SITUACAO_OPTIONS = [
  { value: TODAS, label: 'Todas' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'REJEITADO', label: 'Rejeitado' },
] as const;

export function PedidosList() {
  const { data: session, status: sessionStatus } = useSession();
  const accessToken = (session as any)?.accessToken;
  const [filters, setFilters] = useState<PedidoFilters>({
    pagina: 0,
    tamanho: 20,
  });
  const [obras, setObras] = useState<ObraResultado[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorResultado[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Debounce da busca: digita -> espera 400ms -> envia `busca` ao backend.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => {
        const busca = searchTerm.trim() || undefined;
        if (prev.busca === busca) return prev;
        return { ...prev, busca, pagina: 0 };
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const usuarioId = session?.user?.id;
  const ehAdmin = (session?.user?.roles || []).includes('ADMIN');

  useEffect(() => {
    if (!accessToken) return;
    api.getObras(accessToken).then(setObras).catch(() => setObras([]));
    api.getFornecedores(accessToken).then(setFornecedores).catch(() => setFornecedores([]));
  }, [accessToken]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['pedidos', filters, accessToken],
    queryFn: () => api.getPedidos(filters, accessToken),
    placeholderData: (previous) => previous,
    enabled: !!accessToken,
  });

  const excluirMutation = useMutation({
    mutationFn: (pedidoId: string) => api.deletePedido(pedidoId, accessToken),
    onSuccess: () => {
      toast.success('Pedido excluído com sucesso.');
      refetch();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Não foi possível excluir o pedido.');
    },
  });

  if (sessionStatus === 'loading') {
    return <LoadingState message="Carregando sessão..." />;
  }

  const handleFilterChange = (key: keyof PedidoFilters, value: string | number | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      pagina: 0, // Reset to first page when filtering
    }));
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleExcluir = (pedido: { id: string; numero: string }) => {
    const confirmado = window.confirm(
      `Excluir o pedido ${pedido.numero}? Esta ação não pode ser desfeita.`
    );
    if (confirmado) {
      excluirMutation.mutate(pedido.id);
    }
  };

  const podeExcluir = (pedido: { situacao: string; solicitanteId?: string }) =>
    (pedido.situacao === 'PENDENTE' || pedido.situacao === 'REJEITADO') &&
    (ehAdmin || (!!pedido.solicitanteId && pedido.solicitanteId === usuarioId));

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, pagina: page - 1 }));
  };

  if (isLoading && !data) {
    return <LoadingState message="Carregando pedidos..." />;
  }

  if (isError) {
    return (
      <ErrorState
        message="Erro ao carregar pedidos"
        onRetry={refetch}
        details={error instanceof Error ? error.message : undefined}
      />
    );
  }

  const pedidos = data?.conteudo || [];
  const totalPages = data?.totalPaginas || 1;
  const currentPage = (data?.pagina || 0) + 1;
  const totalItems = data?.totalElementos || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Pedidos de Compra</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            {totalItems} {totalItems === 1 ? 'pedido' : 'pedidos'} encontrado{totalItems !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild>
            <a href="/pedidos/novo">
              Novo Pedido
            </a>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="card-base p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">
              Buscar
            </label>
            <Input
              id="search"
              placeholder="Buscar por número, obra, fornecedor..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>

          <Select
            value={filters.situacao || TODAS}
            onValueChange={(value) => handleFilterChange('situacao', value === TODAS ? undefined : value)}
          >
            <SelectTrigger className="w-[200px]" aria-label="Situação">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              {SITUACAO_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

              <Select
                value={filters.obraId || TODAS}
                onValueChange={(value) => handleFilterChange('obraId', value === TODAS ? undefined : value)}
              >
                <SelectTrigger className="w-[200px]" aria-label="Obra">
                  <SelectValue placeholder="Obra" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todas as obras</SelectItem>
                  {obras.map((obra) => (
                    <SelectItem key={obra.id} value={obra.id}>
                      {obra.codigo} - {obra.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.fornecedorId || TODAS}
                onValueChange={(value) => handleFilterChange('fornecedorId', value === TODAS ? undefined : value)}
              >
                <SelectTrigger className="w-[200px]" aria-label="Fornecedor">
                  <SelectValue placeholder="Fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todos os fornecedores</SelectItem>
                  {fornecedores.map((fornecedor) => (
                    <SelectItem key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
        </div>
      </div>

      {/* Table */}
      <div className="card-base overflow-hidden">
        {pedidos.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Nenhum pedido encontrado"
            description="Nenhum pedido corresponde aos filtros selecionados."
            action={{
              label: 'Criar primeiro pedido',
              onClick: () => window.location.href = '/pedidos/novo',
            }}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Nº</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="w-32">Data</TableHead>
                    <TableHead className="w-20 text-center">Itens</TableHead>
                    <TableHead className="w-36 text-right">Valor Total</TableHead>
                    <TableHead className="w-36">Situação</TableHead>
                    <TableHead className="w-48">Alçada</TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidos.map((pedido) => (
                    <TableRow key={pedido.id}>
                      <TableCell className="font-mono text-sm">
                        {pedido.numero}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{pedido.obraNome}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {pedido.obraCodigo}
                        </div>
                      </TableCell>
                      <TableCell>{pedido.fornecedorNome}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(pedido.dataPedido), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-center">
                        {pedido.quantidadeItens}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(pedido.valorTotal)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSituacaoVariant(pedido.situacao)}>
                          {getSituacaoLabel(pedido.situacao)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="font-medium">
                            Etapa {pedido.alcada.etapaAtual} de {pedido.alcada.totalEtapas}
                          </span>
                          {pedido.alcada.aprovadorAtual && (
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              {pedido.alcada.aprovadorAtual.usuarioNome}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <a
                            href={`/pedidos/${pedido.id}`}
                            className="text-primary-600 hover:underline text-sm font-medium"
                          >
                            Ver detalhes
                          </a>
                          {podeExcluir(pedido) && (
                            <button
                              type="button"
                              onClick={() => handleExcluir(pedido)}
                              disabled={excluirMutation.isPending}
                              className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                              aria-label={`Excluir pedido ${pedido.numero}`}
                            >
                              <Trash2 className="h-4 w-4" />
                              Excluir
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-neutral-200 dark:border-neutral-700 p-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  showTotal={true}
                  totalItems={totalItems}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}