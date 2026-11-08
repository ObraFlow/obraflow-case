import { describe, expect, it } from 'vitest'
import { resolveTier, withLowerBounds } from '../src/domain/tiers.js'
import { formatQuantity, lineTotalCents, parseQuantity } from '../src/lib/quantity.js'

const tiers = [
  { name: 'aberta', upToCents: null },
  { name: 'ate-10k', upToCents: 10_000_00 },
  { name: 'ate-100k', upToCents: 100_000_00 },
]

describe('resolveTier', () => {
  it('escolhe a faixa de menor teto que comporta o total, mesmo com a lista fora de ordem', () => {
    expect(resolveTier(tiers, 8_000_00)?.name).toBe('ate-10k')
    expect(resolveTier(tiers, 12_500_00)?.name).toBe('ate-100k')
    expect(resolveTier(tiers, 250_000_00)?.name).toBe('aberta')
  })

  it('o limite é inclusivo: "até 10 mil" inclui exatamente 10 mil', () => {
    expect(resolveTier(tiers, 10_000_00)?.name).toBe('ate-10k')
    expect(resolveTier(tiers, 10_000_01)?.name).toBe('ate-100k')
  })

  it('sem faixa aberta, valores acima do maior teto ficam sem regra', () => {
    expect(resolveTier(tiers.slice(1), 100_000_01)).toBeNull()
    expect(resolveTier([], 1)).toBeNull()
  })

  it('calcula o piso de cada faixa a partir do teto anterior', () => {
    expect(withLowerBounds(tiers).map((t) => [t.fromCents, t.upToCents])).toEqual([
      [0, 10_000_00],
      [10_000_01, 100_000_00],
      [100_000_01, null],
    ])
  })
})

describe('quantidade e total do item', () => {
  it('converte texto decimal para milésimos sem passar por float', () => {
    expect(parseQuantity('2.5')).toBe(2500)
    expect(parseQuantity('0.001')).toBe(1)
    expect(parseQuantity('10')).toBe(10_000)
    expect(formatQuantity(45_500)).toBe('45.5')
    expect(formatQuantity(3000)).toBe('3')
  })

  it('rejeita formatos inválidos', () => {
    for (const bad of ['-1', '1,5', 'abc', '1.2345', '', '1e3']) expect(parseQuantity(bad)).toBeNull()
  })

  it('arredonda o total do item ao centavo', () => {
    expect(lineTotalCents(parseQuantity('0.1')!, 10)).toBe(1)
    expect(lineTotalCents(parseQuantity('1.333')!, 1_00)).toBe(1_33)
    expect(lineTotalCents(parseQuantity('0.005')!, 1_00)).toBe(1) // 0,5 centavo arredonda para cima
    expect(lineTotalCents(parseQuantity('45.5')!, 16_90)).toBe(768_95)
  })
})
