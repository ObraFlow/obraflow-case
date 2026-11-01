import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";
import { cn } from "@/lib/utils";
import styles from "./CreationDialog.module.css";

/** Pages own drafts and requests; closing only hides the form. */
export function CreationDialog({
  open,
  onOpenChange,
  title,
  description,
  pending = false,
  wide = false,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  pending?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next, details) => {
        // An Escape intended for an opening child selector must not dismiss its form.
        if (
          !next &&
          details.reason === "escape-key" &&
          document.querySelector('[role="combobox"][aria-expanded="true"]')
        ) {
          details.cancel();
          return;
        }
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={!pending}
        className={cn(
          "max-h-[calc(100dvh-2rem)] p-5 sm:max-w-xl",
          styles.dialog,
          wide && ["sm:max-w-6xl", styles.wide],
        )}
      >
        <DialogTitle className="pr-7">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <div className={styles.body}>{children}</div>
      </DialogContent>
    </Dialog>
  );
}
