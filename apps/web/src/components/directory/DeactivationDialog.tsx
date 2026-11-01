import { useRef, type ReactNode } from "react";
import { RefreshButton } from "@/components/RefreshButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";

/**
 * The frame of the user and supplier deactivation dialogs. What is shown, which rules apply and the
 * write itself stay with the caller; this only lays out content, error slot and actions.
 */
export function DeactivationDialog({
  open,
  title,
  pending,
  loading,
  blocked,
  canConfirm,
  showConfirm = true,
  closeLabel = "Cancelar",
  onClose,
  onRefresh,
  onConfirm,
  error,
  children,
}: {
  open: boolean;
  title: string;
  pending: boolean;
  loading: boolean;
  /** A rejected write: confirming is off until the person refreshes the state. */
  blocked: boolean;
  canConfirm: boolean;
  showConfirm?: boolean;
  closeLabel?: string;
  onClose: () => void;
  onRefresh: () => void;
  onConfirm: () => void;
  error?: ReactNode;
  children: ReactNode;
}) {
  const close = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onClose();
      }}
    >
      <DialogContent
        showCloseButton={!pending}
        initialFocus={close}
        className="min-h-[34rem] grid-rows-[auto_1fr_auto_auto] sm:max-w-xl"
      >
        <DialogTitle>{title}</DialogTitle>
        <div className="grid content-start gap-4">{children}</div>
        <div className="flex h-36 flex-col overflow-y-auto" aria-live="polite">
          {error}
        </div>
        <DialogFooter>
          <Button className="mr-auto" ref={close} variant="outline" disabled={pending} onClick={onClose}>
            {closeLabel}
          </Button>
          {blocked && (
            <RefreshButton refreshing={loading} disabled={pending} onClick={onRefresh}>
              Atualizar estado
            </RefreshButton>
          )}
          {showConfirm && (
            <Button variant="destructive" disabled={pending || !canConfirm} onClick={onConfirm}>
              {pending ? "Desativando…" : "Desativar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
