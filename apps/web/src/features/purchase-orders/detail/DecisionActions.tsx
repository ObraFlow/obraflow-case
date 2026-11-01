import { AlertCard } from "@/components/ui/AlertCard";
import { SaveConfirmation } from "@/components/ui/SaveConfirmation";
import { brl, orderRef } from "@/lib/format";
import { useRef, useState, type FormEvent } from "react";
import { decisionSchema, type DecisionInput, type PurchaseOrderDetail } from "@dokimos/shared";
import { Check, X } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Current = PurchaseOrderDetail["currentApproval"];

/** What the decision panel tells this user about the order: finished, outdated, someone else's turn, or theirs. */
function explanation(order: PurchaseOrderDetail, assigned: boolean, stale: boolean) {
  const current: Current = order.currentApproval;
  if (order.status === "APPROVED") return "Todas as etapas foram aprovadas. Este pedido está concluído.";
  if (order.status === "REJECTED") return "A rejeição encerrou este pedido. Nenhuma outra decisão pode ser registrada.";
  if (stale || !current) return "Atualize o pedido para confirmar seu estado antes de decidir novamente.";
  if (!assigned) return `Aguardando decisão de ${current.approverName}. Apenas o aprovador atual pode decidir.`;
  return `Sua decisão está disponível na etapa ${current.stepIndex + 1}. Confira os itens e o histórico antes de continuar.`;
}

function statusLabel(order: PurchaseOrderDetail, myTurn: boolean) {
  if (order.status === "APPROVED") return "Concluído";
  if (order.status === "REJECTED") return "Encerrado";
  return myTurn ? "Sua decisão" : "Aguardando";
}

export function DecisionActions({
  order,
  pending,
  refreshing = false,
  stale,
  decide,
  error,
  notice,
  reasonApiError,
  reason,
  onReasonChange,
}: {
  order: PurchaseOrderDetail;
  pending: boolean;
  refreshing?: boolean;
  stale: boolean;
  decide: (input: DecisionInput) => Promise<boolean>;
  error: string;
  notice: string;
  reasonApiError?: string;
  reason: string;
  onReasonChange: (value: string) => void;
}) {
  const { user } = useAuth();
  const [approveOpen, setApproveOpen] = useState(false);
  const [approvalFailed, setApprovalFailed] = useState(false);
  // A ref, not state: a double click lands before a re-render could disable the button.
  const approvalInFlight = useRef(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reasonError, setReasonError] = useState("");
  const current = order.currentApproval;
  const visibleReasonError = reasonError || reasonApiError;
  const assigned = current?.approverId === user?.id;
  const terminal = order.status !== "PENDING";
  const canDecide = !terminal && !!current && assigned && !pending && !refreshing && !stale;
  async function reject(event: FormEvent) {
    event.preventDefault();
    if (!current || !canDecide) return;
    const result = decisionSchema.safeParse({ expectedStepIndex: current.stepIndex, decision: "REJECTED", reason });
    if (!result.success) {
      setReasonError(
        result.error.issues.find((issue) => issue.path[0] === "reason")?.message ?? "Verifique o motivo informado.",
      );
      return;
    }
    setReasonError("");
    if (await decide(result.data)) {
      setRejectOpen(false);
      onReasonChange("");
    }
  }
  return (
    <section className="panel p-5" aria-labelledby="decision-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="decision-title" className="font-semibold">
          Decisão do pedido
        </h2>
        <span className="status" data-status={order.status}>
          {statusLabel(order, assigned && !stale)}
        </span>
      </div>
      <p className="mt-3 break-words text-sm leading-relaxed text-muted-foreground">
        {explanation(order, assigned, stale)}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="destructive"
          disabled={!canDecide}
          onClick={() => {
            if (canDecide) setRejectOpen(true);
          }}
        >
          <X aria-hidden="true" />
          Rejeitar
        </Button>
        <Button
          variant="approve"
          disabled={!canDecide}
          onClick={() => {
            if (canDecide) {
              setApprovalFailed(false);
              setApproveOpen(true);
            }
          }}
        >
          <Check aria-hidden="true" />
          {pending && !terminal ? "Registrando…" : "Aprovar"}
        </Button>
      </div>
      <SaveConfirmation
        intent="approve"
        open={approveOpen && !terminal}
        onOpenChange={(open) => {
          if (!open) setApprovalFailed(false);
          setApproveOpen(open);
        }}
        title="Aprovar pedido"
        confirmLabel="Aprovar pedido"
        pendingLabel="Aprovando…"
        pending={pending}
        disabled={!canDecide || approvalFailed}
        cancelLabel={approvalFailed ? "Voltar ao pedido" : "Cancelar"}
        description="Sua aprovação será registrada no histórico e não poderá ser desfeita."
        onConfirm={async () => {
          if (!current || !canDecide || approvalFailed || approvalInFlight.current) return;
          approvalInFlight.current = true;
          try {
            const accepted = await decide(
              decisionSchema.parse({ expectedStepIndex: current.stepIndex, decision: "APPROVED" }),
            );
            if (accepted) setApproveOpen(false);
            else setApprovalFailed(true);
          } finally {
            approvalInFlight.current = false;
          }
        }}
      >
        {approvalFailed && (
          <AlertCard role="alert" variant={stale ? "warning" : "error"}>
            <p>
              {notice ||
                error ||
                "Não foi possível confirmar a decisão. Consulte o estado atualizado antes de tentar novamente."}
            </p>
            <p className="mt-2">
              {stale
                ? "O resultado pode ser desconhecido. Volte ao pedido e use Atualizar para conferir o estado antes de decidir novamente."
                : "A revisão pode estar desatualizada. Volte ao pedido e confira a etapa atual antes de iniciar outra decisão."}
            </p>
          </AlertCard>
        )}
        <dl className="grid grid-cols-[auto_1fr] gap-2">
          <dt>Pedido</dt>
          <dd>#{orderRef(order.id)}</dd>
          <dt>Obra</dt>
          <dd className="break-words">{order.project.name}</dd>
          <dt>Total</dt>
          <dd>{brl(order.total)}</dd>
          <dt>Etapa</dt>
          <dd>{current ? current.stepIndex + 1 : "Encerrada"}</dd>
        </dl>
      </SaveConfirmation>
      <Dialog
        open={rejectOpen && !terminal}
        onOpenChange={(open) => {
          if (!pending) setRejectOpen(open);
        }}
      >
        <DialogContent showCloseButton={!pending}>
          <DialogTitle>Rejeitar pedido</DialogTitle>
          <DialogDescription>
            A rejeição encerra o fluxo deste pedido e não pode ser desfeita. Informe o motivo para o histórico.
          </DialogDescription>
          {notice && (
            <AlertCard variant="warning" role="status">
              {notice}
            </AlertCard>
          )}
          {error && (
            <AlertCard variant="error">
              {error}
              {stale && " Atualize o pedido antes de tentar outra decisão."}
            </AlertCard>
          )}
          <form onSubmit={(event) => void reject(event)} noValidate>
            <label htmlFor="rejection-reason">Motivo da rejeição</label>
            <textarea
              id="rejection-reason"
              rows={4}
              maxLength={5000}
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              aria-invalid={!!visibleReasonError}
              aria-describedby={visibleReasonError ? "reason-error" : undefined}
              disabled={pending}
            />
            {visibleReasonError && (
              <p id="reason-error" role="alert" className="field-error">
                {visibleReasonError}
              </p>
            )}
            <DialogFooter className="mt-5">
              <Button variant="outline" type="button" disabled={pending} onClick={() => setRejectOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" type="submit" disabled={!canDecide}>
                {pending ? "Registrando…" : "Confirmar rejeição"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
