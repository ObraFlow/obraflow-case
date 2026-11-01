import { Check, Clock3, UserRound, X, type LucideIcon } from "lucide-react";
import type { ApprovalStepSummary } from "@dokimos/shared";
import { useAuth } from "@/auth/AuthContext";
import styles from "./ApprovalChain.module.css";

const presentation = {
  APPROVED: { label: "Aprovou" },
  REJECTED: { label: "Rejeitou" },
  CURRENT: { label: "Atual" },
  UPCOMING: { label: "Futura" },
  SKIPPED: { label: "Futura · Não executada após rejeição" },
} as const;

// The shape carries the state too, so the chain never depends on color alone.
const stateIcons: Partial<Record<ApprovalStepSummary["state"], LucideIcon>> = {
  APPROVED: Check,
  REJECTED: X,
  CURRENT: Clock3,
};

/** `preview` presents a sequence that has not started (the order being created): every step is
 * simply foreseen, and the list is named accordingly. */
export function ApprovalChain({ steps, preview = false }: { steps: ApprovalStepSummary[]; preview?: boolean }) {
  const { user } = useAuth();
  return (
    <ol className={styles.chain} aria-label={preview ? "Sequência prevista" : "Cadeia de aprovação"}>
      {steps.map((step, index) => {
        const label = preview ? "Prevista" : presentation[step.state].label;
        const Icon = preview ? undefined : stateIcons[step.state];
        return (
          <li
            key={step.stepIndex}
            className={styles.step}
            data-state={step.state}
            aria-label={`${step.approverName} · ${label}`}
            aria-current={step.state === "CURRENT" ? "step" : undefined}
            title={`${step.approverName} · ${label}`}
          >
            <span className={styles.name} data-self={step.approverId === user?.id}>
              {step.approverId === user?.id && (
                <UserRound className={styles.selfIcon} size={13} role="img" aria-label="Você" />
              )}
              <span className={styles.nameText}>{step.approverName}</span>
            </span>
            <span className={styles.node} aria-hidden="true">
              {Icon ? <Icon size={14} strokeWidth={2.5} /> : index + 1}
            </span>
            <span className="sr-only">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
