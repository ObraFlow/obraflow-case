import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import { holdFocusUntilClick } from "./newOrderItem";
import { brl, plural } from "@/lib/format";
import styles from "./NewOrderPage.module.css";

/** The footer of the form: running total, what still blocks sending, and the submit button. */
export function OrderSubmitBar({
  itemCount,
  total,
  invalidCount,
  overflow,
  eligible,
  pending,
  blocked,
  submitRef,
  onVerify,
}: {
  itemCount: number;
  total: string | null;
  /** Fields with a message, from the client or the server. */
  invalidCount: number;
  overflow: boolean;
  /** Whether the chosen project can take orders and the supplier is active. */
  eligible: boolean;
  pending: boolean;
  /** The order cannot be sent now (invalid, or an earlier send awaits reconciliation). */
  blocked: boolean;
  submitRef: Ref<HTMLButtonElement>;
  /** Moves focus to the first field that needs attention. */
  onVerify: () => void;
}) {
  const needsAttention = invalidCount > 0 || overflow;
  return (
    <footer className={styles.submit}>
      <div>
        <p className="text-xs text-muted-foreground">
          Total estimado · {itemCount} {plural(itemCount, "item", "itens")}
        </p>
        <p className={`font-semibold tabular-nums ${styles.total}`}>{total !== null ? brl(total) : "—"}</p>
      </div>
      <div className={styles.submitActions}>
        {needsAttention && (
          <>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {invalidCount
                ? `${invalidCount} ${plural(invalidCount, "campo pendente", "campos pendentes")}`
                : "Total acima do limite"}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onPointerDown={holdFocusUntilClick}
              onClick={onVerify}
            >
              Verificar campos
            </Button>
          </>
        )}
        {!needsAttention && !eligible && (
          <p className="text-xs text-muted-foreground">Confira a disponibilidade da obra e do fornecedor.</p>
        )}
        <Button ref={submitRef} type="submit" disabled={pending || blocked}>
          {pending ? "Enviando…" : "Cadastrar pedido"}
        </Button>
      </div>
    </footer>
  );
}
