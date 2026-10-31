import { ChainCompact } from '@/components/domain/ChainCompact';
import { OrderDetailSheet } from '@/components/domain/OrderDetailSheet';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { Switch } from '@/components/ui/switch';
import { useOrders } from '@/hooks/queries';
import type { OrderStatus, PurchaseOrder } from '@/lib/types';
import { cn, formatCurrency, formatDate, shortId } from '@/lib/utils';
import { useActingUser } from '@/providers/ActingUserProvider';
import { ClipboardCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

type StatusFilter = 'ALL' | OrderStatus;
const COLS = 'grid grid-cols-[72px_minmax(0,1.5fr)_84px_44px_116px_104px_minmax(0,2.1fr)] gap-3 min-w-[940px]';

export function AprovacoesPage() {
  const { actingUserId } = useActingUser();
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [onlyMine, setOnlyMine] = useState(false);
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);

  const filters = useMemo(
    () => ({
      status: onlyMine ? undefined : status === 'ALL' ? undefined : status,
      currentApproverId: onlyMine && actingUserId ? actingUserId : undefined,
    }),
    [status, onlyMine, actingUserId],
  );

  const orders = useOrders(filters);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Aprovações</h1>
          <p className="text-sm text-muted-foreground">Pedidos de compra nas alçadas. Decida quando for a sua vez.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented<StatusFilter>
            value={status}
            onChange={(v) => {
              setStatus(v);
              if (v !== 'ALL') setOnlyMine(false);
            }}
            items={[
              { value: 'ALL', label: 'Todas' },
              { value: 'PENDING', label: 'Pendentes' },
              { value: 'APPROVED', label: 'Aprovados' },
              { value: 'REJECTED', label: 'Rejeitados' },
            ]}
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Switch checked={onlyMine} disabled={!actingUserId} onCheckedChange={setOnlyMine} />
            Pendentes no meu nível
          </label>
        </div>
      </header>

      <Card className="overflow-hidden">
        {orders.isLoading ? (
          <TableSkeleton />
        ) : orders.isError ? (
          <ErrorState message={(orders.error as Error)?.message} onRetry={() => orders.refetch()} />
        ) : !orders.data?.length ? (
          <EmptyState
            icon={ClipboardCheck}
            title={onlyMine ? 'Nada pendente no seu nível' : 'Nenhum pedido encontrado'}
            description={
              onlyMine
                ? 'Quando um pedido chegar à sua alçada, ele aparece aqui.'
                : 'Ajuste os filtros ou cadastre um novo pedido de compra.'
            }
          />
        ) : (
          <>
            {/* Tabela (desktop) */}
            <div className="hidden overflow-x-auto lg:block">
              <div className={cn(COLS, 'h-[34px] items-center border-b px-4 text-xs font-medium text-subtle-foreground')}>
                <span>Pedido</span>
                <span>Obra / Fornecedor</span>
                <span>Data</span>
                <span className="text-center">Itens</span>
                <span className="text-right">Total</span>
                <span>Situação</span>
                <span>Alçada atual</span>
              </div>
              {orders.data.map((o) => (
                <div
                  key={o.id}
                  role="button"
                  tabIndex={0}
                  data-selected={selected?.id === o.id}
                  onClick={() => setSelected(o)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelected(o))}
                  className={cn(
                    COLS,
                    'min-h-13 cursor-pointer items-center border-t border-border/60 px-4 py-1.5 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40 data-[selected=true]:bg-primary-soft',
                  )}
                >
                  <span className="num text-xs font-medium text-muted-foreground">{shortId(o.id)}</span>
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate font-medium">{o.project.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{o.supplier.name}</span>
                  </span>
                  <span className="num whitespace-nowrap text-xs text-muted-foreground">{formatDate(o.orderDate)}</span>
                  <span className="num text-center text-muted-foreground">{o.items.length}</span>
                  <span className="num text-right font-medium">{formatCurrency(o.totalValue)}</span>
                  <span>
                    <StatusBadge status={o.status} />
                  </span>
                  <span className="min-w-0">
                    <ChainCompact order={o} />
                  </span>
                </div>
              ))}
            </div>

            {/* Cards (mobile) */}
            <div className="divide-y lg:hidden">
              {orders.data.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelected(o)}
                  className="flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:bg-surface-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="num text-xs font-medium text-muted-foreground">{shortId(o.id)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{o.project.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{o.supplier.name}</span>
                    </span>
                    <span className="num shrink-0 font-semibold">{formatCurrency(o.totalValue)}</span>
                  </div>
                  <ChainCompact order={o} />
                </button>
              ))}
            </div>
          </>
        )}
      </Card>

      <OrderDetailSheet order={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="p-4">
      <span className="sr-only">Carregando pedidos…</span>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-2.5 w-16" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-2.5 w-40" />
              <Skeleton className="h-2 w-24 opacity-70" />
            </div>
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-5 w-[76px] rounded-full" />
            <Skeleton className="h-2.5 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
