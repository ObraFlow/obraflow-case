import { Prisma } from '../generated/prisma/client.js';
import { MAX_MONEY } from '../common/money.js';

type Decimal = Prisma.Decimal;

export interface ItemInput {
  quantity: string;
  unitPrice: string;
}

export interface ItemTotals {
  quantity: Decimal;
  unitPrice: Decimal;
  total: Decimal;
}

export type TotalsResult =
  | { ok: true; items: ItemTotals[]; total: Decimal }
  | { ok: false; error: 'NON_POSITIVE_QUANTITY'; index: number }
  | { ok: false; error: 'TOTAL_TOO_LARGE' };

const max = new Prisma.Decimal(MAX_MONEY);

/**
 * Item total = quantity x unit price, rounded to cents (half up, as on an
 * invoice). The order total is the sum of the rounded item totals, so the
 * header always matches the lines the user sees.
 * Pure function (no database, no HTTP) so it is easy to unit test.
 */
export function calculateTotals(inputs: ItemInput[]): TotalsResult {
  const items: ItemTotals[] = [];
  let total = new Prisma.Decimal(0);

  for (const [index, input] of inputs.entries()) {
    const quantity = new Prisma.Decimal(input.quantity);
    const unitPrice = new Prisma.Decimal(input.unitPrice);
    if (quantity.lessThanOrEqualTo(0)) {
      return { ok: false, error: 'NON_POSITIVE_QUANTITY', index };
    }

    const itemTotal = quantity
      .times(unitPrice)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    total = total.plus(itemTotal);
    items.push({ quantity, unitPrice, total: itemTotal });
  }

  // Checked here so the API answers 422 instead of a database overflow error.
  if (total.greaterThan(max)) {
    return { ok: false, error: 'TOTAL_TOO_LARGE' };
  }
  return { ok: true, items, total };
}
