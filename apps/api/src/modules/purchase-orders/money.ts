import { Decimal } from "decimal.js";
import type { PurchaseOrderItemInput } from "@dokimos/shared";
import { errors } from "../../lib/errors.js";

// 40 significant digits cover valid input products and sums within NUMERIC(18,2).
const Exact = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
const maximum = new Exact("9999999999999999.99");

function overflow(field: string): never {
  throw errors.amountOverflow(field);
}

// calculateTotals: prices an order. Each line is rounded to cents (half up) on its own and
// the total is the sum of those rounded lines, so the stored lines always add up to the
// stored total. Money stays in decimal strings; no floating point is involved.
export function calculateTotals(items: PurchaseOrderItemInput[]) {
  let total = new Exact("0");
  const lines = items.map((item, index) => {
    const line = new Exact(item.quantity).mul(item.unitPrice).toDecimalPlaces(2, Exact.ROUND_HALF_UP);
    // Reject here, with a field the form can show, rather than let NUMERIC(18,2) overflow.
    if (line.gt(maximum)) overflow(`items.${index}.unitPrice`);
    total = total.plus(line);
    if (total.gt(maximum)) overflow("items");
    // Normalise to the column scales (quantity 3 places, prices 2) for storage and display.
    return {
      ...item,
      quantity: new Exact(item.quantity).toFixed(3),
      unitPrice: new Exact(item.unitPrice).toFixed(2),
      lineTotal: line.toFixed(2),
    };
  });
  return { items: lines, total: total.toFixed(2) };
}
