import { describe, expect, it } from 'vitest'
import { formatCurrencyCents, lineTotalCents, parseDecimalScaled } from './orderMath'

describe('order monetary calculations', () => {
  it('rounds line totals to cents using half up', () => {
    expect(lineTotalCents('1,500', '0,01')).toBe(2n)
  })

  it('parses decimal quantities and prices without floating point arithmetic', () => {
    expect(parseDecimalScaled('2,375', 3)).toBe(2375n)
    expect(parseDecimalScaled('10,50', 2)).toBe(1050n)
    expect(formatCurrencyCents(25375n)).toBe('R$ 253,75')
  })

  it('rejects excess decimal places and invalid values', () => {
    expect(parseDecimalScaled('1,0001', 3)).toBeNull()
    expect(parseDecimalScaled('-1', 2)).toBeNull()
    expect(lineTotalCents('', '5,00')).toBeNull()
  })
})
