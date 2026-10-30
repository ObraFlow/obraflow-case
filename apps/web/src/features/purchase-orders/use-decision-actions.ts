'use client';

import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import { useDecision } from '@/lib/api/queries';
import type { PurchaseOrderSummary } from '@/lib/api/types';
import { currentStepOf, firstName } from '@/lib/orders';

type Order = Pick<
  PurchaseOrderSummary,
  'id' | 'code' | 'status' | 'currentStep' | 'steps'
>;

/**
 * Aprovar/rejeitar com feedback ao usuário. Envia o `stepId` que está na tela:
 * se alguém decidiu antes, a API responde 409, mostramos o aviso e a lista é recarregada
 * (as mutações invalidam o cache dos pedidos também em caso de erro).
 */
export function useDecisionActions() {
  const { approve, reject } = useDecision();

  function onError(error: Error) {
    if (
      error instanceof ApiError &&
      (error.code === 'STEP_NOT_CURRENT' ||
        error.code === 'ORDER_ALREADY_DECIDED')
    ) {
      toast.warning('Este pedido já foi decidido', {
        description:
          error.code === 'STEP_NOT_CURRENT'
            ? 'Outra pessoa decidiu antes de você. A lista foi atualizada com a situação atual.'
            : `${error.message} A lista foi atualizada.`,
      });
      return;
    }
    toast.error('Não foi possível registrar a decisão', {
      description: error.message,
    });
  }

  return {
    isPending: approve.isPending || reject.isPending,
    /** id do pedido com decisão em andamento (para mostrar "carregando" só no botão certo). */
    pendingOrderId: approve.isPending
      ? approve.variables?.orderId
      : reject.isPending
        ? reject.variables?.orderId
        : undefined,

    approve(order: Order) {
      const step = currentStepOf(order);
      if (!step) return;
      approve.mutate(
        { orderId: order.id, stepId: step.id },
        {
          onSuccess: (updated) => {
            const next = currentStepOf(updated);
            toast.success(`${order.code} aprovado`, {
              description: next
                ? `Encaminhado para ${next.approver.name} (etapa ${next.position} de ${updated.steps.length}).`
                : 'Todas as etapas foram concluídas: pedido aprovado.',
            });
          },
          onError,
        },
      );
    },

    reject(order: Order, reason: string, onDone?: () => void) {
      const step = currentStepOf(order);
      if (!step) return;
      reject.mutate(
        { orderId: order.id, stepId: step.id, reason },
        {
          onSuccess: () => {
            toast.success(`${order.code} rejeitado`, {
              description: `Fluxo encerrado por ${firstName(step.approver.name)}. Motivo registrado no histórico.`,
            });
            onDone?.();
          },
          onError,
        },
      );
    },
  };
}
