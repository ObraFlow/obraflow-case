import { DomainError } from "./errors";

export type StepStatus = "WAITING" | "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";
export type OrderStatus = "PENDING" | "APPROVED" | "REJECTED";
export type Decision = "APPROVED" | "REJECTED";
export type Step = { stepOrder: number; approverId: number; status: StepStatus };

/**
 * Escolhe a faixa aplicável: a de menor limite que comporta o total.
 * `upTo` é inclusivo; `null` = sem teto (vale para qualquer valor acima das demais).
 */
export function resolveRule<R extends { upTo: number | null }>(rules: R[], totalCents: number): R | undefined {
  return [...rules]
    .sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity))
    .find((r) => r.upTo === null || totalCents <= r.upTo);
}

/** Monta a cadeia inicial: o 1º aprovador fica PENDING, os demais WAITING. */
export function buildChain(approverIds: number[]): Step[] {
  return approverIds.map((approverId, i) => ({
    stepOrder: i + 1,
    approverId,
    status: i === 0 ? "PENDING" : "WAITING",
  }));
}

/**
 * Calcula o efeito de uma decisão, sem tocar no banco.
 * Só quem está na vez decide; rejeitar encerra o fluxo e pula as etapas restantes.
 */
export function nextState<S extends Step>(steps: S[], userId: number, decision: Decision) {
  const current = steps.find((s) => s.status === "PENDING");
  if (!current) throw new DomainError(409, "Este pedido não está mais aguardando decisão.");
  if (current.approverId !== userId) throw new DomainError(403, "Não é a sua vez de decidir este pedido.");

  const later = steps.filter((s) => s.stepOrder > current.stepOrder);
  if (decision === "REJECTED") {
    return { current, orderStatus: "REJECTED" as OrderStatus, currentStep: null, skip: later.map((s) => s.stepOrder), activate: null };
  }
  const next = later[0];
  return {
    current,
    orderStatus: (next ? "PENDING" : "APPROVED") as OrderStatus,
    currentStep: next?.stepOrder ?? null,
    skip: [] as number[],
    activate: next?.stepOrder ?? null,
  };
}
