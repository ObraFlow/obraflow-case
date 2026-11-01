import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import type { NewOrderItem } from "./newOrderItem";

/** Asks before dropping an item that already has data. Removing only changes the draft. */
export function ItemRemovalDialog({
  item,
  index,
  open,
  returnFocus,
  onKeep,
  onRemove,
}: {
  item?: NewOrderItem;
  index: number;
  open: boolean;
  /** The element that gets focus when the dialog closes. */
  returnFocus: () => HTMLElement | null;
  onKeep: () => void;
  onRemove: (item: NewOrderItem) => void;
}) {
  const keep = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onKeep();
      }}
    >
      <DialogContent initialFocus={keep} finalFocus={returnFocus}>
        <DialogTitle>Remover item {index + 1}?</DialogTitle>
        <DialogDescription>
          Este item tem dados preenchidos. A remoção altera apenas o rascunho; os demais itens serão mantidos.
        </DialogDescription>
        <p className="break-words text-sm">{item?.description || `Item ${index + 1} sem descrição`}</p>
        <DialogFooter>
          <Button ref={keep} type="button" variant="outline" onClick={onKeep}>
            Manter item
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (item) onRemove(item);
            }}
          >
            Remover item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
