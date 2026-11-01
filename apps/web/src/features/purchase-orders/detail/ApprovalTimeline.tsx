import type { PurchaseOrderDetail } from "@dokimos/shared";
import { Check, Clock3, X, FileText, type LucideIcon } from "lucide-react";
import { timestamp } from "@/lib/format";
import styles from "./ApprovalTimeline.module.css";

type StepState = "APPROVED" | "REJECTED" | "CURRENT" | "SKIPPED" | "NEXT";
const stepLabels: Record<StepState, string> = {
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  CURRENT: "Aguardando decisão",
  SKIPPED: "Não executada · fluxo encerrado",
  NEXT: "Próxima etapa",
};
const stepIcons: Record<StepState, LucideIcon> = {
  APPROVED: Check,
  REJECTED: X,
  CURRENT: Clock3,
  SKIPPED: Clock3,
  NEXT: Clock3,
};

/** A decided step shows its decision. An undecided one is skipped once the order was rejected, otherwise
 * it is the current step or a later one. */
function stepState(order: PurchaseOrderDetail, step: PurchaseOrderDetail["steps"][number]): StepState {
  if (step.decision) return step.decision.type;
  if (order.status === "REJECTED") return "SKIPPED";
  return order.currentApproval?.stepIndex === step.stepIndex ? "CURRENT" : "NEXT";
}

export function ApprovalTimeline({ order }: { order: PurchaseOrderDetail }) {
  return (
    <section className="panel min-w-0 p-5" aria-labelledby="approval-title">
      <h2 id="approval-title" className="font-semibold">
        Histórico de aprovação
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Sequência registrada na criação · alçada versão {order.coaVersion}.
      </p>
      <ol className={styles.timeline}>
        <li className={styles.step}>
          <span className={styles.marker}>
            <FileText size={14} aria-hidden="true" />
          </span>
          <div className={styles.content}>
            <p className="text-sm font-medium">Pedido criado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {order.creatorName} · {timestamp(order.createdAt)}
            </p>
          </div>
        </li>
        {order.steps.map((step) => {
          const state = stepState(order, step);
          const Icon = stepIcons[state];
          return (
            <li
              className={styles.step}
              data-state={state}
              key={step.stepIndex}
              aria-current={state === "CURRENT" ? "step" : undefined}
            >
              <span className={styles.marker}>
                <Icon size={14} aria-hidden="true" />
              </span>
              <div className={styles.content}>
                <p className="text-sm font-medium">
                  {step.approverName}{" "}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">· Etapa {step.stepIndex + 1}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stepLabels[state]}
                  {step.decision ? ` · ${timestamp(step.decision.decidedAt)}` : ""}
                </p>
                {step.decision?.reason && (
                  <p className={styles.reason}>
                    <strong>Motivo:</strong> {step.decision.reason}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
