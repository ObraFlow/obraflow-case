import { useRef, type ReactNode } from "react";
import { Upload, Plus, Check, Send } from "lucide-react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog";

const intentIcons = { create: Plus, approve: Check, send: Send, save: Upload };

/** Review only: the page retains validation, request and recovery ownership. */
export function SaveConfirmation({
  open,
  onOpenChange,
  title,
  description,
  children,
  pending = false,
  disabled = false,
  onConfirm,
  intent = "save",
  confirmLabel,
  pendingLabel,
  cancelLabel = "Cancelar",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  children?: ReactNode;
  pending?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  intent?: "create" | "save" | "approve" | "send";
  confirmLabel: string;
  pendingLabel: string;
  cancelLabel?: string;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  const Icon = intentIcons[intent];
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent
        className="flex flex-col overflow-hidden sm:max-w-lg"
        showCloseButton={!pending}
        initialFocus={cancel}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>
            <Icon size={18} aria-hidden="true" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children && <div className="min-h-0 space-y-3 overflow-y-auto text-sm leading-relaxed">{children}</div>}
        <DialogFooter className="shrink-0">
          <Button ref={cancel} type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            data-review-action
            type="button"
            variant={intent === "approve" ? "approve" : intent === "save" ? "save" : "default"}
            disabled={pending || disabled}
            onClick={onConfirm}
          >
            <Icon aria-hidden="true" />
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
