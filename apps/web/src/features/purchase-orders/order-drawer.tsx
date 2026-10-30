'use client';

import {
  Building2,
  CalendarDays,
  Check,
  CircleAlert,
  CircleCheck,
  Clock,
  Loader2,
  MessageSquareText,
  Truck,
  UserRound,
  X,
} from 'lucide-react';
import { useViewer } from '@/components/providers/viewer-provider';
import { ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { usePurchaseOrder } from '@/lib/api/queries';
import type { PurchaseOrderDetail } from '@/lib/api/types';
import {
  formatBRL,
  formatDateTime,
  formatQuantity,
  formatRange,
  UNIT_LABELS,
} from '@/lib/format';
import { canDecide, currentStepOf } from '@/lib/orders';
import { ApprovalTimeline } from './approval-timeline';
import { OrderStatusBadge } from './order-status-badge';

interface OrderDrawerProps {
  orderId: number | undefined;
  isDeciding: boolean;
  onClose: () => void;
  onApprove: (order: PurchaseOrderDetail) => void;
  onReject: (order: PurchaseOrderDetail) => void;
}

/** Detalhe do pedido: cabeçalho, itens, linha do tempo e decisão (painel lateral; tela cheia no celular). */
export function OrderDrawer({
  orderId,
  isDeciding,
  onClose,
  onApprove,
  onReject,
}: OrderDrawerProps) {
  const query = usePurchaseOrder(orderId);
  const order = query.data;

  return (
    <Sheet
      open={orderId !== undefined}
      onOpenChange={(open) => !open && onClose()}
    >
      <SheetContent className="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        {order ? (
          <OrderDetail
            order={order}
            isDeciding={isDeciding}
            onApprove={() => onApprove(order)}
            onReject={() => onReject(order)}
          />
        ) : query.isError ? (
          <>
            <SheetTitle className="sr-only">Pedido</SheetTitle>
            <ErrorState
              className="my-auto"
              title="Não foi possível carregar o pedido"
              error={query.error}
              onRetry={() => query.refetch()}
              isRetrying={query.isFetching}
            />
          </>
        ) : (
          <DetailSkeleton />
        )}
      </SheetContent>
    </Sheet>
  );
}

function OrderDetail({
  order,
  isDeciding,
  onApprove,
  onReject,
}: {
  order: PurchaseOrderDetail;
  isDeciding: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { viewer } = useViewer();

  return (
    <>
      <SheetHeader className="gap-2 border-b p-5 pr-12">
        <div className="flex items-center gap-3">
          <SheetTitle className="text-xl font-bold">{order.code}</SheetTitle>
          <OrderStatusBadge status={order.status} />
        </div>
        <SheetDescription asChild>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            <Meta icon={Building2}>{order.project.name}</Meta>
            <Meta icon={Truck}>{order.supplier.name}</Meta>
            <Meta icon={CalendarDays}>{formatDateTime(order.createdAt)}</Meta>
            <Meta icon={UserRound}>Solicitado por {order.requester.name}</Meta>
          </ul>
        </SheetDescription>
        {order.notes && (
          <p className="flex gap-1.5 text-[13px] text-muted-foreground">
            <MessageSquareText
              className="mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            <span className="whitespace-pre-line">{order.notes}</span>
          </p>
        )}
      </SheetHeader>

      <div className="flex-1 space-y-7 overflow-y-auto p-5">
        <section aria-labelledby="items-title">
          <h3
            id="items-title"
            className="mb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
          >
            Itens do pedido
          </h3>
          <ItemsTable order={order} />
        </section>

        <section aria-labelledby="flow-title">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
            <h3
              id="flow-title"
              className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
            >
              Histórico de aprovação
            </h3>
            <p className="text-xs text-muted-foreground">
              Faixa:{' '}
              {formatRange(
                order.appliedRule.fromAmount,
                order.appliedRule.maxAmount,
              )}
            </p>
          </div>
          <ApprovalTimeline order={order} viewerId={viewer?.id} />
        </section>
      </div>

      <SheetFooter className="border-t p-4">
        <DecisionFooter
          order={order}
          viewerId={viewer?.id}
          isDeciding={isDeciding}
          onApprove={onApprove}
          onReject={onReject}
        />
      </SheetFooter>
    </>
  );
}

function Meta({
  icon: Icon,
  children,
}: {
  icon: typeof Building2;
  children: React.ReactNode;
}) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <Icon className="size-3.5" aria-hidden="true" />
      {children}
    </li>
  );
}

function ItemsTable({ order }: { order: PurchaseOrderDetail }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-[11px] tracking-wider text-muted-foreground uppercase">
            <th className="py-2 pr-2 text-left font-semibold">Descrição</th>
            <th className="px-2 py-2 text-right font-semibold">Qtd</th>
            <th className="px-2 py-2 text-left font-semibold">Un.</th>
            <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">
              Preço unit.
            </th>
            <th className="py-2 pl-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="py-2.5 pr-2">{item.description}</td>
              <td className="px-2 py-2.5 text-right tabular-nums">
                {formatQuantity(item.quantity)}
              </td>
              <td className="px-2 py-2.5 text-muted-foreground">
                {UNIT_LABELS[item.unit]}
              </td>
              <td className="px-2 py-2.5 text-right whitespace-nowrap tabular-nums">
                {formatBRL(item.unitPrice)}
              </td>
              <td className="py-2.5 pl-2 text-right whitespace-nowrap tabular-nums">
                {formatBRL(item.total)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td
              colSpan={4}
              className="py-3 pr-2 text-right text-muted-foreground"
            >
              Total
            </td>
            <td className="py-3 pl-2 text-right font-bold whitespace-nowrap tabular-nums">
              {formatBRL(order.totalAmount)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Rodapé: decidir quando é a vez do usuário; senão, botões desabilitados com a explicação. */
function DecisionFooter({
  order,
  viewerId,
  isDeciding,
  onApprove,
  onReject,
}: {
  order: PurchaseOrderDetail;
  viewerId: number | undefined;
  isDeciding: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const allowed = canDecide(order, viewerId);
  const current = currentStepOf(order);

  return (
    <div className="w-full space-y-3">
      {order.status === 'APPROVED' && (
        <Notice
          tone="success"
          icon={CircleCheck}
          title="Fluxo de aprovação concluído"
        >
          Todas as {order.steps.length === 1 ? '' : `${order.steps.length} `}
          etapas foram cumpridas. Não há decisão pendente e a decisão de um
          pedido finalizado não pode ser alterada.
        </Notice>
      )}
      {order.status === 'REJECTED' && (
        <Notice
          tone="danger"
          icon={CircleAlert}
          title="Pedido encerrado por rejeição"
        >
          Um pedido rejeitado não pode ser reaberto. Para refazer a compra, crie
          um novo pedido.
        </Notice>
      )}
      {current && !allowed && (
        <Notice
          tone="warning"
          icon={Clock}
          title={`Aguardando ${current.approver.name}`}
        >
          A aprovação é sequencial: só {current.approver.name} pode decidir a{' '}
          {current.position}ª etapa. Para simular, selecione essa pessoa em
          “Visualizando como”.
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          size="lg"
          variant="approve"
          onClick={onApprove}
          disabled={!allowed || isDeciding}
        >
          {isDeciding ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Check aria-hidden="true" />
          )}
          Aprovar pedido
        </Button>
        <Button
          size="lg"
          variant="reject"
          onClick={onReject}
          disabled={!allowed || isDeciding}
        >
          <X aria-hidden="true" />
          Rejeitar pedido
        </Button>
      </div>
    </div>
  );
}

const NOTICE_TONES = {
  success: 'border-success-border bg-success-soft text-success-strong',
  warning: 'border-warning-border bg-warning-soft text-warning-strong',
  danger: 'border-danger-border bg-danger-soft text-danger-strong',
} as const;

function Notice({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: keyof typeof NOTICE_TONES;
  icon: typeof Clock;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={`flex gap-2.5 rounded-lg border p-3 text-sm ${NOTICE_TONES[tone]}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="opacity-90">{children}</p>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div
      className="space-y-6 p-5"
      aria-label="Carregando pedido"
      aria-busy="true"
    >
      <SheetTitle className="sr-only">Carregando pedido</SheetTitle>
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex gap-3">
            <Skeleton className="size-7 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
