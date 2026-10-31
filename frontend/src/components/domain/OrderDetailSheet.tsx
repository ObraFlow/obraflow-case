import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
} from "@/components/ui/sheet";
import { useDecision } from "@/hooks/queries";
import { ApiError } from "@/lib/api";
import { canAct, currentApprover, disabledReason } from "@/lib/chain";
import type { PurchaseOrder } from "@/lib/types";
import {
  cn,
  formatCurrency,
  formatDate,
  formatQuantity,
  shortId,
} from "@/lib/utils";
import { useActingUser } from "@/providers/ActingUserProvider";
import { Check, Lock, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ChainVertical } from "./ChainVertical";
import { RejectDialog } from "./RejectDialog";
import { StatusBadge } from "./StatusBadge";

function Info({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-2xs uppercase tracking-wide text-subtle-foreground">
        {label}
      </div>
      <div
        className={cn(
          "truncate",
          strong ? "num text-base font-semibold" : "text-sm font-medium",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function OrderDetailSheet({
  order,
  onClose,
}: {
  order: PurchaseOrder | null;
  onClose: () => void;
}) {
  const { actingUserId } = useActingUser();
  const { approve, reject } = useDecision();
  const [rejectOpen, setRejectOpen] = useState(false);

  if (!order) return null;

  const act = canAct(order, actingUserId);
  const reason = disabledReason(order, actingUserId);

  const handleApprove = () => {
    approve.mutate(
      { id: order.id, actingUserId: actingUserId! },
      {
        onSuccess: (updated) => {
          const next = currentApprover(updated);
          toast.success(
            updated.status === "APPROVED"
              ? "Pedido aprovado"
              : "Aprovação registrada",
            {
              description:
                updated.status === "APPROVED"
                  ? "A cadeia de alçada foi concluída."
                  : next
                    ? `Segue para ${next.user.name}.`
                    : undefined,
            },
          );
          onClose();
        },
        onError: (e) =>
          toast.error("Não foi possível aprovar", {
            description: e instanceof ApiError ? e.message : undefined,
          }),
      },
    );
  };

  const handleReject = (reasonText: string) => {
    reject.mutate(
      { id: order.id, actingUserId: actingUserId!, reason: reasonText },
      {
        onSuccess: () => {
          toast.success("Pedido rejeitado", {
            description: "O fluxo foi interrompido.",
          });
          setRejectOpen(false);
          onClose();
        },
        onError: (e) =>
          toast.error("Não foi possível rejeitar", {
            description: e instanceof ApiError ? e.message : undefined,
          }),
      },
    );
  };

  return (
    <Sheet open={!!order} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-center gap-2">
            <span className="num text-base font-semibold">
              {shortId(order.id)}
            </span>
            <StatusBadge status={order.status} />
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {order.project.name} · {order.supplier.name}
          </div>
        </SheetHeader>

        <SheetBody>
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3">
            <Info label="Obra" value={order.project.name} />
            <Info label="Fornecedor" value={order.supplier.name} />
            <Info label="Data" value={formatDate(order.orderDate)} />
            <Info
              label="Total"
              value={formatCurrency(order.totalValue)}
              strong
            />
          </div>

          {order.notes && (
            <div className="rounded-md border bg-card p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Observações: </span>
              {order.notes}
            </div>
          )}

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
              Itens ({order.items.length})
            </h3>
            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-[minmax(0,1fr)_56px_72px_72px] gap-2 border-b bg-surface-2 px-3 py-2 text-2xs font-medium text-subtle-foreground">
                <span>Descrição</span>
                <span className="text-right">Qtd</span>
                <span className="text-right">Preço</span>
                <span className="text-right">Total</span>
              </div>
              {order.items.map((it) => (
                <div
                  key={it.id}
                  className="grid grid-cols-[minmax(0,1fr)_56px_72px_72px] gap-2 border-t px-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block truncate">{it.description}</span>
                    <span className="text-2xs text-subtle-foreground">
                      {formatQuantity(it.quantity)} {it.unit}
                    </span>
                  </span>
                  <span className="num text-right text-xs text-muted-foreground">
                    {formatQuantity(it.quantity)}
                  </span>
                  <span className="num text-right text-xs">
                    {formatCurrency(it.unitPrice)}
                  </span>
                  <span className="num text-right font-medium">
                    {formatCurrency(it.lineTotal)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
              Cadeia de alçada
            </h3>
            <ChainVertical order={order} actingUserId={actingUserId} />
          </section>
        </SheetBody>

        <SheetFooter>
          {reason && (
            <div
              className="flex gap-2.5 rounded-md bg-muted px-3 py-2.5"
              id="why-disabled"
            >
              <Lock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <p className="text-[12.5px] text-muted-foreground text-pretty">
                {reason}
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="danger-outline"
              className="flex-1"
              aria-disabled={!act}
              aria-describedby={!act ? "why-disabled" : undefined}
              onClick={() => act && setRejectOpen(true)}
            >
              <X />
              Rejeitar
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              loading={approve.isPending}
              aria-disabled={!act}
              aria-describedby={!act ? "why-disabled" : undefined}
              onClick={() => act && handleApprove()}
            >
              <Check />
              Aprovar
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>

      <RejectDialog
        order={order}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={handleReject}
        loading={reject.isPending}
      />
    </Sheet>
  );
}
