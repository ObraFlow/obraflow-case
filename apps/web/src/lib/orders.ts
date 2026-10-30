import type { ApprovalStep, PurchaseOrderSummary } from './api/types';

// Regras de exibição dos pedidos. A regra de negócio (quem pode decidir) é do backend:
// aqui só lemos o `currentStep` que a API calculou e persistiu.

/** Etapa aguardando decisão, ou undefined se o fluxo já terminou. */
export function currentStepOf(
  order: Pick<PurchaseOrderSummary, 'currentStep' | 'steps'>,
): ApprovalStep | undefined {
  return order.currentStep === null
    ? undefined
    : order.steps[order.currentStep - 1];
}

/** O usuário de "Visualizando como" é o aprovador da vez? */
export function canDecide(
  order: Pick<PurchaseOrderSummary, 'status' | 'currentStep' | 'steps'>,
  viewerId: number | undefined,
): boolean {
  return (
    order.status === 'PENDING' &&
    viewerId !== undefined &&
    currentStepOf(order)?.approver.id === viewerId
  );
}

/** "Amanda Costa" → "Amanda" */
export function firstName(name: string): string {
  return name.split(' ')[0];
}
