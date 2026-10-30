'use client';

import type { KeyboardEvent } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PurchaseOrderSummary } from '@/lib/api/types';
import { formatBRL, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ApprovalChain } from './approval-chain';
import { OrderActions } from './order-actions';
import { OrderStatusBadge } from './order-status-badge';

export interface OrdersListProps {
  orders: PurchaseOrderSummary[];
  viewerId: number | undefined;
  highlightId: number | undefined;
  deciding: { orderId: number | undefined; isBusy: boolean };
  onOpen: (order: PurchaseOrderSummary) => void;
  onApprove: (order: PurchaseOrderSummary) => void;
  onReject: (order: PurchaseOrderSummary) => void;
}

/** Tabela no desktop, cards no celular. Clicar no pedido (ou Enter) abre o detalhe. */
export function OrdersList(props: OrdersListProps) {
  return (
    <>
      <OrdersTable {...props} />
      <OrdersCards {...props} />
    </>
  );
}

function openOnEnter(event: KeyboardEvent, open: () => void) {
  if (event.target !== event.currentTarget) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    open();
  }
}

const HEAD =
  'h-10 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase';

function OrdersTable({
  orders,
  viewerId,
  highlightId,
  deciding,
  onOpen,
  onApprove,
  onReject,
}: OrdersListProps) {
  return (
    <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(HEAD, 'pl-4')}># / Data</TableHead>
            <TableHead className={HEAD}>Obra</TableHead>
            <TableHead className={HEAD}>Fornecedor</TableHead>
            <TableHead className={cn(HEAD, 'text-center')}>Itens</TableHead>
            <TableHead className={cn(HEAD, 'text-right')}>
              Valor total
            </TableHead>
            <TableHead className={HEAD}>Situação</TableHead>
            <TableHead className={HEAD}>Alçada</TableHead>
            <TableHead className={cn(HEAD, 'pr-4')}>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow
              key={order.id}
              tabIndex={0}
              aria-label={`${order.code}, ${order.supplier.name}: abrir detalhes`}
              onClick={() => onOpen(order)}
              onKeyDown={(event) => openOnEnter(event, () => onOpen(order))}
              className={cn(
                'cursor-pointer outline-none focus-visible:bg-muted/60',
                order.id === highlightId && 'animate-highlight',
              )}
            >
              <TableCell className="py-3 pl-4">
                <p className="font-semibold">{order.code}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatDate(order.orderDate)}
                </p>
              </TableCell>
              <TableCell className="font-medium">
                {order.project.name}
              </TableCell>
              <TableCell className="max-w-48 truncate">
                {order.supplier.name}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {order.itemCount}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {formatBRL(order.totalAmount)}
              </TableCell>
              <TableCell>
                <OrderStatusBadge status={order.status} />
              </TableCell>
              <TableCell>
                <ApprovalChain steps={order.steps} />
              </TableCell>
              <TableCell className="pr-4">
                <OrderActions
                  order={order}
                  viewerId={viewerId}
                  isDeciding={deciding.orderId === order.id}
                  isBusy={deciding.isBusy}
                  onApprove={() => onApprove(order)}
                  onReject={() => onReject(order)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function OrdersCards({
  orders,
  viewerId,
  highlightId,
  deciding,
  onOpen,
  onApprove,
  onReject,
}: OrdersListProps) {
  return (
    <ul className="space-y-3 md:hidden">
      {orders.map((order) => (
        <li key={order.id}>
          <article
            tabIndex={0}
            aria-label={`${order.code}, ${order.supplier.name}: abrir detalhes`}
            onClick={() => onOpen(order)}
            onKeyDown={(event) => openOnEnter(event, () => onOpen(order))}
            className={cn(
              'cursor-pointer space-y-3 rounded-lg border bg-card p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring',
              order.id === highlightId && 'animate-highlight',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{order.code}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(order.orderDate)} · {order.project.name}
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="font-medium">{order.supplier.name}</p>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-lg font-semibold tabular-nums">
                  {formatBRL(order.totalAmount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {order.itemCount} {order.itemCount === 1 ? 'item' : 'itens'}
                </p>
              </div>
              <ApprovalChain steps={order.steps} />
            </div>
            <div className="border-t pt-3">
              <OrderActions
                order={order}
                viewerId={viewerId}
                isDeciding={deciding.orderId === order.id}
                isBusy={deciding.isBusy}
                onApprove={() => onApprove(order)}
                onReject={() => onReject(order)}
                stretch
              />
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

/** Carregando: o mesmo formato da lista, para a tela não "pular" quando os dados chegam. */
export function OrdersListSkeleton() {
  return (
    <div aria-label="Carregando pedidos" aria-busy="true">
      <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
        <div className="h-10 border-b bg-muted/30" />
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-6 border-b px-4 py-4 last:border-0"
          >
            <div className="w-20 space-y-1.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-6" />
            <Skeleton className="ml-auto h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-7 w-36" />
          </div>
        ))}
      </div>
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
