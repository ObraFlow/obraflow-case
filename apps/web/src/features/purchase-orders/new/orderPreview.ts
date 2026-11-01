import { Decimal } from "decimal.js";
import { decimalString, type PurchaseOrderItemInput } from "@dokimos/shared";

const Money = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
const maximum = new Money("9999999999999999.99");

// A local preview only. POST sends the original decimal strings, never these totals.
export function orderPreview(items: PurchaseOrderItemInput[]) {
  const lines = items.map((item) => {
    if (
      !decimalString(9, 3, true).safeParse(item.quantity).success ||
      !decimalString(12, 2).safeParse(item.unitPrice).success
    )
      return null;
    return new Money(item.quantity).times(item.unitPrice).toDecimalPlaces(2, Money.ROUND_HALF_UP);
  });
  const total = lines.every((line) => line !== null)
    ? lines.reduce((sum, line) => sum.plus(line!), new Money(0))
    : null;
  const overflow = lines.some((line) => line?.gt(maximum)) || Boolean(total?.gt(maximum));
  return { lines: lines.map((line) => line?.toFixed(2) ?? null), total: total?.toFixed(2) ?? null, overflow };
}
