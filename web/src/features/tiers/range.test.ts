import { describe, expect, it } from 'vitest'
import { previousLimit, tierRangeLabel } from './range'

// Intl inserts a non-breaking space after "R$"; normalize it for readability.
const label = (min: string | null, max: string | null) =>
  tierRangeLabel(min, max).replace(/ /g, ' ')

describe('tierRangeLabel', () => {
  it('describes each kind of range', () => {
    expect(label(null, '5000')).toBe('Até R$ 5.000,00')
    expect(label('5000', '10000')).toBe('De R$ 5.000,01 a R$ 10.000,00')
    expect(label('10000', null)).toBe('Acima de R$ 10.000,00')
    expect(label(null, null)).toBe('Qualquer valor')
  })
})

describe('previousLimit', () => {
  const limits = ['5000', '50000', null]

  it('finds the highest limit below the given one', () => {
    expect(previousLimit(limits, '10000')).toBe('5000')
    expect(previousLimit(limits, '1000')).toBeNull()
  })

  it('uses the highest limit for a tier without upper limit', () => {
    expect(previousLimit(limits, null)).toBe('50000')
  })
})
