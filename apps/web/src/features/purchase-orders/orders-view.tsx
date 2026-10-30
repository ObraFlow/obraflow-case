'use client';

import {
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Inbox,
  SearchX,
} from 'lucide-react';
import { useEffect, useEffectEvent, useState } from 'react';
import { useViewer } from '@/components/providers/viewer-provider';
import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { useProjects, usePurchaseOrders } from '@/lib/api/queries';
import type { PurchaseOrderSummary } from '@/lib/api/types';
import { OrderDrawer } from './order-drawer';
import { OrdersList, OrdersListSkeleton } from './orders-list';
import { OrderFilters, OrderTabs } from './orders-toolbar';
import { RejectDialog } from './reject-dialog';
import { useDecisionActions } from './use-decision-actions';
import {
  PAGE_SIZE,
  type TabId,
  useListFilters,
  useOrderFilters,
} from './use-order-filters';

/** Tela "Pedidos": central de aprovação. */
export function OrdersView() {
  const filters = useOrderFilters();
  const { viewer, usersError, retryUsers } = useViewer();
  const listFilters = useListFilters(filters, viewer?.id);
  const decisions = useDecisionActions();
  const [rejecting, setRejecting] = useState<PurchaseOrderSummary | null>(null);

  const projects = useProjects();
  // A aba "minha" precisa saber quem é o usuário antes de buscar.
  const list = usePurchaseOrders(listFilters, {
    enabled: filters.tab !== 'minha' || viewer !== undefined,
  });
  // Contadores das abas: a API calcula "aguardando" quando recebe awaitingUserId, que também filtra
  // a lista. Por isso uma consulta leve (1 item) só para os contadores, independente da aba aberta.
  const counts = usePurchaseOrders(
    {
      awaitingUserId: viewer?.id,
      projectId: filters.projectId,
      q: filters.search || undefined,
      pageSize: 1,
    },
    { enabled: viewer !== undefined },
  );

  // Destaque do pedido recém-cadastrado: some depois de alguns segundos.
  const { highlightId } = filters;
  // useEffectEvent: chama a versão mais recente de clearHighlight sem reiniciar o timer a cada renderização.
  const clearHighlight = useEffectEvent(() => filters.clearHighlight());
  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(clearHighlight, 4000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const total = list.data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <OrderTabs
        tab={filters.tab}
        counts={counts.data?.counts}
        onChange={filters.setTab}
      />

      <OrderFilters
        search={filters.search}
        projectId={filters.projectId}
        projects={projects.data?.data ?? []}
        onSearch={filters.setSearch}
        onProject={filters.setProjectId}
      />

      {filters.tab === 'minha' && !viewer && usersError ? (
        // A aba "minha decisão" depende de saber quem é o usuário.
        <ErrorState
          className="rounded-lg border bg-card"
          title="Não foi possível carregar os usuários"
          error={usersError}
          onRetry={retryUsers}
        />
      ) : list.isError && !list.data ? (
        <ErrorState
          className="rounded-lg border bg-card"
          title="Não foi possível carregar os pedidos"
          error={list.error}
          onRetry={() => list.refetch()}
          isRetrying={list.isFetching}
        />
      ) : !list.data ? (
        <OrdersListSkeleton />
      ) : list.data.data.length === 0 ? (
        <div className="rounded-lg border bg-card">
          <ListEmpty
            tab={filters.tab}
            filtered={Boolean(filters.search || filters.projectId)}
          />
        </div>
      ) : (
        <div
          className={
            list.isPlaceholderData
              ? 'opacity-60 transition-opacity'
              : 'transition-opacity'
          }
          aria-busy={list.isFetching}
        >
          <OrdersList
            orders={list.data.data}
            viewerId={viewer?.id}
            highlightId={highlightId}
            deciding={{
              orderId: decisions.pendingOrderId,
              isBusy: decisions.isPending,
            }}
            onOpen={(order) => filters.openOrder(order.id)}
            onApprove={decisions.approve}
            onReject={setRejecting}
          />
          {total > PAGE_SIZE && (
            <Pagination
              page={filters.page}
              pageCount={pageCount}
              total={total}
              onPage={filters.setPage}
            />
          )}
        </div>
      )}

      <OrderDrawer
        orderId={filters.openOrderId}
        isDeciding={decisions.pendingOrderId === filters.openOrderId}
        onClose={filters.closeOrder}
        onApprove={decisions.approve}
        onReject={setRejecting}
      />

      <RejectDialog
        order={rejecting}
        isSubmitting={decisions.isPending}
        onClose={() => setRejecting(null)}
        onConfirm={(reason) => {
          if (rejecting)
            decisions.reject(rejecting, reason, () => setRejecting(null));
        }}
      />
    </div>
  );
}

function ListEmpty({ tab, filtered }: { tab: TabId; filtered: boolean }) {
  if (filtered) {
    return (
      <EmptyState
        icon={SearchX}
        title="Nenhum pedido encontrado"
        description="Nenhum pedido corresponde à busca ou à obra selecionada. Tente outros filtros."
      />
    );
  }
  if (tab === 'minha') {
    return (
      <EmptyState
        icon={CheckCheck}
        title="Nenhum pedido aguardando sua decisão"
        description="Tudo em dia por aqui. Quando um pedido chegar à sua etapa da alçada, ele aparece nesta aba."
      />
    );
  }
  return (
    <EmptyState
      icon={Inbox}
      title="Nenhum pedido por aqui"
      description="Ainda não há pedidos nesta situação."
    />
  );
}

function Pagination({
  page,
  pageCount,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  return (
    <nav
      aria-label="Paginação"
      className="mt-3 flex items-center justify-between text-sm text-muted-foreground"
    >
      <span className="tabular-nums">
        {from}–{to} de {total} pedidos
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft aria-hidden="true" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
        >
          Próxima
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
