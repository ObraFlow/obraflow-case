import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PurchaseOrder } from "@/lib/types";
import { shortId } from "@/lib/utils";
import { useState } from "react";

const MIN = 10;
const MAX = 500;

export function RejectDialog({
  order,
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  order: PurchaseOrder;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const trimmed = reason.trim();
  const error =
    trimmed.length < MIN
      ? `Descreva o motivo com ao menos ${MIN} caracteres.`
      : undefined;

  const skipped = order.steps
    .filter((s) => s.position > order.currentStep)
    .map((s) => s.user.name);

  const submit = () => {
    setTouched(true);
    if (error) return;
    onConfirm(trimmed);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setReason("");
          setTouched(false);
        }
      }}
    >
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-md">
            Rejeitar {shortId(order.id)}?
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            O fluxo será interrompido e o solicitante será notificado com o
            motivo.
            {skipped.length > 0 && (
              <>
                {" "}
                {skipped.join(", ")} não será{skipped.length > 1 ? "ão" : ""}{" "}
                consultado{skipped.length > 1 ? "s" : ""}.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="px-4.5 py-3">
          <Textarea
            autoFocus
            placeholder="Motivo da rejeição (obrigatório)"
            value={reason}
            maxLength={MAX}
            aria-invalid={touched && !!error}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
          />
          <div className="mt-1.5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {touched && <FieldError message={error} />}
            </div>
            <span className="num shrink-0 text-xs text-subtle-foreground">
              {reason.length}/{MAX}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            loading={loading}
            aria-disabled={!!error}
            onClick={submit}
          >
            Rejeitar pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
