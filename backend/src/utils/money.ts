// Arredonda para duas casas.
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function computeLineTotal(quantity: number, unitPrice: number): number {
  return round2(quantity * unitPrice);
}

export function computeOrderTotal(
  items: { quantity: number; unitPrice: number }[],
): number {
  let result: number = 0;
  for (const item of items) {
    result = result + round2(item.quantity * item.unitPrice);
  }
  return round2(result);
}
