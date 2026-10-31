import { formatCurrency } from "./utils";
import type { ApprovalRange, OrderStep, PurchaseOrder } from "./types";

export type StepState = "done" | "current" | "next" | "rejected" | "skipped";

export interface DerivedStep {
  step: OrderStep;
  level: number;
  state: StepState;
}

/**
 * Deriva o estado visual de cada passo a partir dos dados do backend
 * (que já calculou `decision`, `currentStep` e `status`).
 */
export function deriveChain(order: PurchaseOrder): DerivedStep[] {
  const steps = [...order.steps].sort((a, b) => a.position - b.position);
  let stopped = false;
  return steps.map((step, i) => {
    let state: StepState;
    if (step.decision === "APPROVED") state = "done";
    else if (step.decision === "REJECTED") {
      state = "rejected";
      stopped = true;
    } else if (stopped) state = "skipped";
    else if (order.status === "PENDING" && step.position === order.currentStep)
      state = "current";
    else state = "next";
    return { step, level: i + 1, state };
  });
}

/** Aprovador do nível atual (ou null se concluído). */
export function currentApprover(order: PurchaseOrder): OrderStep | null {
  if (order.status !== "PENDING") return null;
  return order.steps.find((s) => s.position === order.currentStep) ?? null;
}

/** O usuário atuante pode decidir este pedido? */
export function canAct(
  order: PurchaseOrder,
  actingUserId: string | null,
): boolean {
  if (!actingUserId || order.status !== "PENDING") return false;
  return currentApprover(order)?.userId === actingUserId;
}

/** Motivo pelo qual as ações estão indisponíveis (para o callout). */
export function disabledReason(
  order: PurchaseOrder,
  actingUserId: string | null,
): string | null {
  if (order.status === "APPROVED")
    return "A cadeia de alçada foi concluída — o pedido já está aprovado.";
  if (order.status === "REJECTED")
    return "O pedido foi rejeitado e o fluxo foi interrompido.";
  if (!actingUserId)
    return 'Selecione um usuário em "Atuando como" para poder decidir.';
  const cur = currentApprover(order);
  if (cur && cur.userId !== actingUserId)
    return `Aguardando a decisão de ${cur.user.name}. Você não é o aprovador do nível atual.`;
  return null;
}

export function rangeLabel(min: number, max: number | null): string {
  if (min <= 0 && max !== null) return `Até ${formatCurrency(max)}`;
  if (max === null) return `Acima de ${formatCurrency(min)}`;
  return `${formatCurrency(min)} – ${formatCurrency(max)}`;
}

/** Prévia da cadeia para um total, a partir das faixas da obra (tela Novo pedido). */
export function previewChain(
  ranges: ApprovalRange[],
  total: number,
): RangePreview | null {
  const matches = ranges.filter(
    (r) => total >= r.minValue && (r.maxValue === null || total <= r.maxValue),
  );
  if (matches.length === 0) return null;
  matches.sort((a, b) => (a.maxValue ?? Infinity) - (b.maxValue ?? Infinity));
  const r = matches[0];
  return {
    label: rangeLabel(r.minValue, r.maxValue),
    approvers: [...r.approvalRangeSteps]
      .sort((a, b) => a.position - b.position)
      .map((s) => s.user.name),
  };
}

export interface RangePreview {
  label: string;
  approvers: string[];
}
