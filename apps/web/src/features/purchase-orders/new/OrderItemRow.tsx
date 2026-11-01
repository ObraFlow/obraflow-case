import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";
import type { PurchaseOrderItemInput } from "@dokimos/shared";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { brl } from "@/lib/format";
import { holdFocusUntilClick, type NewOrderItem } from "./newOrderItem";
import styles from "./NewOrderPage.module.css";

type FieldProps = { "aria-invalid": boolean; "aria-describedby": string | undefined; onBlur: () => void };

const fields = [
  ["description", "Descrição"],
  ["quantity", "Quantidade"],
  ["unit", "Unidade"],
  ["unitPrice", "Preço unitário (R$)"],
] as const;

/** One editable item of the order. The form owns the values, the errors and what removing a row means. */
export function OrderItemRow({
  item,
  index,
  subtotal,
  canRemove,
  fieldProps,
  feedback,
  onChange,
  onRemove,
}: {
  item: NewOrderItem;
  index: number;
  /** Decimal string of the line total, or null while the line cannot be read. */
  subtotal: string | null;
  canRemove: boolean;
  /** Validity attributes for the input at an error path such as `items.0.quantity`. */
  fieldProps: (path: string) => FieldProps;
  feedback: (path: string) => ReactNode;
  onChange: (field: keyof PurchaseOrderItemInput, value: string) => void;
  onRemove: (trigger: HTMLButtonElement) => void;
}) {
  return (
    <fieldset className={styles.item} data-order-item={item.key}>
      <legend className="sr-only">Item {index + 1}</legend>
      <span className={styles.number} aria-hidden="true">
        <span className={styles.itemPrefix}>Item </span>
        {index + 1}
      </span>
      {fields.map(([field, label]) => {
        const path = `items.${index}.${field}`;
        return (
          <div key={field} className={`${styles.field} ${field === "unitPrice" ? styles.price : styles[field]}`}>
            <label htmlFor={`${item.key}-${field}`}>{label}</label>
            {field === "unitPrice" ? (
              <MoneyInput
                id={`${item.key}-${field}`}
                label={label}
                hideLabel
                format="currency"
                className={styles.priceInput}
                value={item[field]}
                {...fieldProps(path)}
                onValueChange={(value) => onChange(field, value)}
              />
            ) : (
              <input
                id={`${item.key}-${field}`}
                inputMode={field === "quantity" ? "decimal" : "text"}
                value={item[field]}
                {...fieldProps(path)}
                onChange={(event) => onChange(field, event.target.value)}
              />
            )}
            {feedback(path)}
          </div>
        );
      })}
      <p className={styles.subtotal}>
        <span className={styles.subtotalLabel}>Subtotal: </span>
        {subtotal !== null ? brl(subtotal) : "—"}
      </p>
      <Button
        id={`${item.key}-remove`}
        className={styles.remove}
        type="button"
        size="icon"
        variant="ghost"
        disabled={!canRemove}
        aria-label={`Remover item ${index + 1}`}
        onPointerDown={holdFocusUntilClick}
        onClick={(event) => onRemove(event.currentTarget)}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </fieldset>
  );
}
