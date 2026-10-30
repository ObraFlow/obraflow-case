'use client';

import { Check, Clock, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PurchaseOrderSummary } from '@/lib/api/types';
import { canDecide, currentStepOf, firstName } from '@/lib/orders';
import { cn } from '@/lib/utils';

interface OrderActionsProps {
  order: PurchaseOrderSummary;
  viewerId: number | undefined;
  /** Decisão em andamento neste pedido. */
  isDeciding: boolean;
  /** Alguma decisão em andamento (evita cliques duplos em outros pedidos). */
  isBusy: boolean;
  onApprove: () => void;
  onReject: () => void;
  /** Botões ocupando toda a largura (cards do celular). */
  stretch?: boolean;
}

/** Ações da lista: decidir quando é a vez do usuário; senão, explica por que não há ação. */
export function OrderActions({
  order,
  viewerId,
  isDeciding,
  isBusy,
  onApprove,
  onReject,
  stretch,
}: OrderActionsProps) {
  if (canDecide(order, viewerId)) {
    return (
      <div
        className={cn('flex gap-2', stretch && '*:flex-1')}
        // A linha inteira abre o detalhe: os botões não podem disparar esse clique.
        onClick={(event) => event.stopPropagation()}
      >
        <Button
          size="sm"
          variant="approve"
          onClick={onApprove}
          disabled={isBusy}
          aria-label={`Aprovar ${order.code}`}
        >
          {isDeciding ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Check aria-hidden="true" />
          )}
          Aprovar
        </Button>
        <Button
          size="sm"
          variant="reject"
          onClick={onReject}
          disabled={isBusy}
          aria-label={`Rejeitar ${order.code}`}
        >
          <X aria-hidden="true" />
          Rejeitar
        </Button>
      </div>
    );
  }

  const current = currentStepOf(order);
  if (current) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <Clock className="size-3.5" aria-hidden="true" />
        Aguardando {firstName(current.approver.name)}
      </span>
    );
  }

  return (
    <span className="text-[13px] text-muted-foreground italic">
      {order.status === 'APPROVED' ? 'Fluxo concluído' : 'Fluxo encerrado'}
    </span>
  );
}
