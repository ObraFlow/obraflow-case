import type { PointerEvent } from "react";
import type { PurchaseOrderItemInput } from "@dokimos/shared";

/** One row of the order being drafted. `key` identifies the row while its position changes. */
export type NewOrderItem = PurchaseOrderItemInput & { key: string };

export const blankItem = (): NewOrderItem => ({
  key: crypto.randomUUID(),
  description: "",
  quantity: "",
  unit: "",
  unitPrice: "",
});

// Apply the action before blur feedback can move the pressed button out from
// under the pointer. Its click then focuses the new row, dialog or invalid field.
export function holdFocusUntilClick(event: PointerEvent<HTMLButtonElement>) {
  if (event.button === 0) event.preventDefault();
}
