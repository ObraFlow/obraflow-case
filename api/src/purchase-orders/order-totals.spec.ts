import { calculateTotals } from './order-totals.js';

function totalsOf(items: { quantity: string; unitPrice: string }[]) {
  const result = calculateTotals(items);
  if (!result.ok) throw new Error(`unexpected error ${result.error}`);
  return {
    items: result.items.map((item) => item.total.toFixed(2)),
    total: result.total.toFixed(2),
  };
}

describe('calculateTotals', () => {
  it('multiplies quantity by unit price for each item and sums them', () => {
    expect(
      totalsOf([
        { quantity: '10', unitPrice: '35.90' },
        { quantity: '2.5', unitPrice: '480' },
      ]),
    ).toEqual({ items: ['359.00', '1200.00'], total: '1559.00' });
  });

  it('rounds each item to cents, half up', () => {
    // 3.333 x 1.50 = 4.9995 -> 5.00 ; 1.005 x 1 = 1.005 -> 1.01
    expect(
      totalsOf([
        { quantity: '3.333', unitPrice: '1.50' },
        { quantity: '1.005', unitPrice: '1' },
      ]).items,
    ).toEqual(['5.00', '1.01']);
  });

  it('sums the rounded item totals, so the header matches the lines', () => {
    // Unrounded: 3 x 0.3335 = 1.0005 -> 1.00. Rounded per item: 3 x 0.33 = 0.99.
    expect(
      totalsOf([
        { quantity: '0.667', unitPrice: '0.50' },
        { quantity: '0.667', unitPrice: '0.50' },
        { quantity: '0.667', unitPrice: '0.50' },
      ]),
    ).toEqual({ items: ['0.33', '0.33', '0.33'], total: '0.99' });
  });

  it('has no floating point error', () => {
    // In JavaScript numbers, 0.1 + 0.2 === 0.30000000000000004
    expect(
      totalsOf([
        { quantity: '1', unitPrice: '0.10' },
        { quantity: '1', unitPrice: '0.20' },
      ]).total,
    ).toBe('0.30');
  });

  it('accepts a zero unit price (e.g. a free sample)', () => {
    expect(
      totalsOf([
        { quantity: '1', unitPrice: '10' },
        { quantity: '1', unitPrice: '0' },
      ]).items,
    ).toEqual(['10.00', '0.00']);
  });

  it('refuses an order whose total is zero', () => {
    expect(calculateTotals([{ quantity: '1', unitPrice: '0' }])).toEqual({
      ok: false,
      error: 'ZERO_TOTAL',
    });
    // 0.001 x 0.01 rounds to 0.00
    expect(calculateTotals([{ quantity: '0.001', unitPrice: '0.01' }]).ok).toBe(
      false,
    );
  });

  it('refuses a zero quantity and reports which item', () => {
    expect(
      calculateTotals([
        { quantity: '1', unitPrice: '10' },
        { quantity: '0.000', unitPrice: '10' },
      ]),
    ).toEqual({ ok: false, error: 'NON_POSITIVE_QUANTITY', index: 1 });
  });

  it('refuses a total above what Decimal(14, 2) can store', () => {
    expect(
      calculateTotals([{ quantity: '99999999999', unitPrice: '999999999999' }]),
    ).toEqual({ ok: false, error: 'TOTAL_TOO_LARGE' });
    expect(
      calculateTotals([{ quantity: '1', unitPrice: '999999999999.99' }]).ok,
    ).toBe(true);
  });
});
