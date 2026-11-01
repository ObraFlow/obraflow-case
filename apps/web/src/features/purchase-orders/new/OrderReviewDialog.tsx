import { useRef, type RefObject } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { brl } from "@/lib/format";
import { ApprovalEstimate } from "./ApprovalEstimate";
import type { NewOrderItem } from "./newOrderItem";
import type { orderPreview } from "./orderPreview";
import type { useCoaPreview } from "./useCoaPreview";
import styles from "./NewOrderPage.module.css";

/** The last look before an order is created: what will be sent and who will approve it. Sending is the page's. */
export function OrderReviewDialog({
  open,
  onOpenChange,
  pending,
  canSend,
  projectId,
  projectName,
  supplierName,
  items,
  preview,
  coaPreview,
  returnFocus,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  canSend: boolean;
  projectId: string;
  projectName?: string;
  supplierName?: string;
  items: NewOrderItem[];
  preview: ReturnType<typeof orderPreview>;
  coaPreview: ReturnType<typeof useCoaPreview>;
  /** Where focus goes when the review closes. */
  returnFocus: RefObject<HTMLElement | null>;
  onSend: () => void;
}) {
  const edit = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg" initialFocus={edit} finalFocus={returnFocus} showCloseButton={!pending}>
        <DialogTitle>Cadastrar pedido</DialogTitle>
        <DialogDescription>
          O cadastro inicia a aprovação. Depois de criado, o pedido não pode ser editado ou cancelado.
        </DialogDescription>
        <section className="min-w-0 space-y-4 text-sm" aria-label="Revisão do pedido">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            <dt>Obra</dt>
            <dd className="break-words">{projectName}</dd>
            <dt>Fornecedor</dt>
            <dd className="break-words">{supplierName}</dd>
            <dt>Itens</dt>
            <dd>{items.length}</dd>
            <dt>Total estimado</dt>
            <dd className="font-semibold">{preview.total !== null ? brl(preview.total) : "—"}</dd>
          </dl>
          <ol aria-label="Itens para revisão" className={styles.reviewItems}>
            {items.map((item, index) => (
              <li key={item.key}>
                <p className="font-medium">
                  {index + 1}. {item.description}
                </p>
                <div className={styles.reviewLine}>
                  <span>
                    {item.quantity.replace(".", ",")} {item.unit} ×{" "}
                    {preview.lines[index] !== null ? brl(item.unitPrice) : "—"}
                  </span>
                  <strong>Subtotal: {preview.lines[index] !== null ? brl(preview.lines[index]!) : "—"}</strong>
                </div>
              </li>
            ))}
          </ol>
          <p>O servidor confirma os valores exatos e registra a cadeia original do pedido.</p>
          <ApprovalEstimate variant="review" projectId={projectId} total={preview.total} preview={coaPreview} />
        </section>
        <DialogFooter>
          <Button ref={edit} type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Editar pedido
          </Button>
          <Button data-review-action type="button" disabled={pending || !canSend} onClick={onSend}>
            <Send aria-hidden="true" />
            {pending ? "Enviando pedido…" : "Cadastrar pedido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
