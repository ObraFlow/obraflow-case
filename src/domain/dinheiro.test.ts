import { describe, expect, it } from 'vitest'

import * as Dinheiro from './dinheiro'
import * as Quantidade from './quantidade'

/**
 * Cada caso monta os próprios valores no corpo. Não há fixture compartilhada de propósito: um
 * número montado três linhas acima do assert já exige rolar a tela para saber o que está em jogo.
 */
describe('Dinheiro', () => {
  it('lê os três formatos de entrada como o mesmo inteiro', () => {
    // O último separador é o decimal; o que vier antes é milhar.
    expect(Dinheiro.deEntrada('1.234,56')).toBe(123456)
    expect(Dinheiro.deEntrada('1234,56')).toBe(123456)
    expect(Dinheiro.deEntrada('1234.56')).toBe(123456)
  })

  it('devolve null para entrada inválida, em vez de lançar', () => {
    expect(Dinheiro.deEntrada('abc')).toBeNull()
    expect(Dinheiro.deEntrada('')).toBeNull()
    expect(Dinheiro.deEntrada('   ')).toBeNull()
  })

  it('arredonda o total do item uma única vez, sobre o produto inteiro', () => {
    // 2,5 x R$ 3,33 = R$ 8,325 → R$ 8,33. Arredondar antes daria R$ 8,30.
    expect(Dinheiro.porMilesimos(Dinheiro.deCentavos(333), Quantidade.deMilesimos(2500))).toBe(833)
    // A soma dos itens é a soma exata, sem centavo sem origem.
    expect(Dinheiro.somar(Dinheiro.deCentavos(833), Dinheiro.deCentavos(167))).toBe(1000)
  })

  it('formata em pt-BR com locale fixo, não o do navegador', () => {
    expect(Dinheiro.formatar(Dinheiro.deCentavos(123456)).replace(/ /g, ' ')).toBe(
      'R$ 1.234,56',
    )
  })
})

describe('Quantidade', () => {
  it('lê três casas e recusa precisão excedente em vez de truncar', () => {
    expect(Quantidade.deEntrada('0,125')).toBe(125)
    expect(Quantidade.deEntrada('2,5')).toBe(2500)
    // Truncar aceitaria um número e cobraria outro.
    expect(Quantidade.deEntrada('1,2345')).toBeNull()
    expect(Quantidade.deEntrada('-1')).toBeNull()
  })
})
