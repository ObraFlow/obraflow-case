import { Plus } from "lucide-react";
import { MAX_PURCHASE_ORDER_ITEMS, type PurchaseOrderItemInput } from "@dokimos/shared";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/FormSection";
import { holdFocusUntilClick, type NewOrderItem } from "./newOrderItem";
import { OrderItemRow } from "./OrderItemRow";
import type { orderPreview } from "./orderPreview";
import type { OrderFieldErrors } from "./useOrderFieldErrors";
import styles from "./NewOrderPage.module.css";

/** The list of items with its column header and the add button. The form owns the items and what removing means. */
export function OrderItemsSection({
  items,
  lines,
  errors,
  onAdd,
  onChange,
  onRemove,
}: {
  items: NewOrderItem[];
  /** Line totals from the local preview, one per item. */
  lines: ReturnType<typeof orderPreview>["lines"];
  errors: OrderFieldErrors;
  onAdd: () => void;
  onChange: (index: number, field: keyof PurchaseOrderItemInput, value: string) => void;
  onRemove: (item: NewOrderItem, trigger: HTMLButtonElement) => void;
}) {
  return (
    <FormSection title="Itens do pedido" className={styles.itemsSection}>
      <div className={styles.itemActions}>
        <div>
          <p className="text-xs text-muted-foreground">
            Quantidade maior que zero, com até 3 casas decimais. Use vírgula ou ponto (ex.: 1,5). Preços em reais.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Até {MAX_PURCHASE_ORDER_ITEMS} itens por pedido.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={items.length >= MAX_PURCHASE_ORDER_ITEMS}
          onPointerDown={holdFocusUntilClick}
          onClick={onAdd}
        >
          <Plus aria-hidden="true" />
          Adicionar item
        </Button>
      </div>
      {errors.feedback("items")}
      <div className={styles.items}>
        <div className={styles.itemHeader} aria-hidden="true">
          <span>#</span>
          <span>Descrição</span>
          <span>Quantidade</span>
          <span>Unidade</span>
          <span>Preço unitário (R$)</span>
          <span>Subtotal</span>
          <span />
        </div>
        {items.map((item, index) => (
          <OrderItemRow
            key={item.key}
            item={item}
            index={index}
            subtotal={lines[index]}
            canRemove={items.length > 1}
            fieldProps={errors.accessibility}
            feedback={errors.feedback}
            onChange={(field, value) => onChange(index, field, value)}
            onRemove={(trigger) => onRemove(item, trigger)}
          />
        ))}
      </div>
    </FormSection>
  );
}
