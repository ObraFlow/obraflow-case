import { describe, expect, it } from 'vitest'
import { lineTotal, parseMoney, parseQuantity, tierRange } from './format'

describe('parseMoney', () => {
  it.each([
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['R$ 10.000,00', 1000000],
    ['10.000', 1000000],
    ['12.5', 1250],
    ['0,99', 99],
    ['7', 700],
    ['3,', 300],
  ])('%s -> %i centavos', (input, cents) => expect(parseMoney(input)).toBe(cents))

  it.each(['', 'abc', '-5', '1,234', '1.23.4', '12,345'])('recusa "%s"', (input) => expect(parseMoney(input)).toBeNull())
})

describe('parseQuantity', () => {
  it('aceita vírgula ou ponto', () => {
    expect(parseQuantity('2,5')).toBe('2.5')
    expect(parseQuantity('10')).toBe('10')
  })
  it('recusa zero, negativo e mais de 3 casas', () => {
    for (const bad of ['0', '-1', '1,2345', 'x', '']) expect(parseQuantity(bad)).toBeNull()
  })
})

it('lineTotal arredonda igual ao backend', () => {
  expect(lineTotal('45.5', 1690)).toBe(76895)
  expect(lineTotal('1.333', 100)).toBe(133)
})

// Intl usa espaço não separável entre R$ e o número
const plain = (s: string) => s.replace(/\u00a0/g, ' ')

it('tierRange descreve as faixas', () => {
  expect(plain(tierRange({ fromCents: 0, upToCents: 1000000 }))).toBe('Até R$ 10.000,00')
  expect(plain(tierRange({ fromCents: 1000001, upToCents: null }))).toBe('Acima de R$ 10.000,00')
})
