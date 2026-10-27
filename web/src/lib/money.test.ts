import { describe, expect, it } from 'vitest'
import { itemTotal, normalizeDecimal, orderTotal } from './money'

describe('normalizeDecimal', () => {
  it('accepts comma or dot as decimal separator', () => {
    expect(normalizeDecimal('12,5')).toBe('12.5')
    expect(normalizeDecimal(' 12.5 ')).toBe('12.5')
    expect(normalizeDecimal('7')).toBe('7')
  })

  it('rejects text, negatives and thousand separators', () => {
    expect(normalizeDecimal('abc')).toBeNull()
    expect(normalizeDecimal('-1')).toBeNull()
    expect(normalizeDecimal('1.234,56')).toBeNull()
    expect(normalizeDecimal('')).toBeNull()
  })
})

// Same cases as the API unit tests (order-totals.spec.ts): the screen and the
// server must agree on every cent.
describe('itemTotal / orderTotal', () => {
  it('rounds each item to cents, half up', () => {
    expect(itemTotal('3,333', '1,50')?.toFixed(2)).toBe('5.00') // 4.9995
    expect(itemTotal('1.005', '1')?.toFixed(2)).toBe('1.01')
  })

  it('sums the rounded item totals', () => {
    const items = Array.from({ length: 3 }, () => ({ quantity: '0.667', unitPrice: '0.50' }))
    expect(orderTotal(items).toFixed(2)).toBe('0.99') // not 1.00
  })

  it('has no floating point error', () => {
    const items = [
      { quantity: '1', unitPrice: '0.10' },
      { quantity: '1', unitPrice: '0.20' },
    ]
    expect(orderTotal(items).toFixed(2)).toBe('0.30')
  })

  it('ignores items that are not valid yet', () => {
    expect(itemTotal('', '10')).toBeNull()
    expect(
      orderTotal([
        { quantity: '2', unitPrice: '10' },
        { quantity: 'x', unitPrice: '10' },
      ]).toFixed(2),
    ).toBe('20.00')
  })
})
