/**
 * Dinheiro em centavos.
 *
 * Responsabilidade única: converter entre a entrada do formulário e o inteiro persistido, somar,
 * e formatar em pt-BR. Nenhum ponto flutuante participa de cálculo — apenas da leitura da
 * entrada, e só até virar inteiro.
 *
 * O motivo é o ADR implícito no schema: um total que alguém vai aprovar não pode ter um centavo
 * nascido de arredondamento binário. `0.1 + 0.2` não é `0.3`, e um pedido de R$ 10.000,00 que
 * vira R$ 9.999,99 cai numa faixa diferente — a aritmética errada muda quem assina.
 */

import type { Centavos, Milesimos } from './tipos'

export const ZERO = 0 as Centavos

export function deCentavos(valor: number): Centavos {
  if (!Number.isInteger(valor)) {
    throw new TypeError(`Centavos exige inteiro, recebido ${valor}`)
  }
  return valor as Centavos
}

/**
 * Lê o que o usuário digitou: "1.234,56", "1234,56", "1234.56" ou "1234".
 *
 * Devolve `null` em vez de lançar, porque entrada inválida é caso esperado de formulário e quem
 * chama precisa transformá-la em erro de campo, não em exceção.
 */
export function deEntrada(texto: string): Centavos | null {
  const limpo = texto.trim()
  if (limpo === '') return null

  // Separador decimal é o último ponto ou vírgula; o que vier antes é separador de milhar.
  const ultimoSeparador = Math.max(limpo.lastIndexOf(','), limpo.lastIndexOf('.'))
  const temDecimal = ultimoSeparador !== -1 && limpo.length - ultimoSeparador - 1 <= 2

  const inteiro = temDecimal ? limpo.slice(0, ultimoSeparador) : limpo
  const decimal = temDecimal ? limpo.slice(ultimoSeparador + 1) : ''

  const digitosInteiros = inteiro.replace(/[.,\s]/g, '')
  if (!/^-?\d*$/.test(digitosInteiros) || !/^\d*$/.test(decimal)) return null
  if (digitosInteiros === '' && decimal === '') return null

  const negativo = digitosInteiros.startsWith('-')
  const reais = Number(digitosInteiros.replace('-', '') || '0')
  const centavos = Number(decimal.padEnd(2, '0') || '0')

  const total = reais * 100 + centavos
  return deCentavos(negativo ? -total : total)
}

/**
 * O caminho de volta de `deEntrada`: centavos no formato que ela lê de novo, sem símbolo e sem
 * separador de milhar.
 *
 * Existe porque o rascunho gravado precisa ser revalidado pelo `submissaoSchema` na submissão, e
 * o schema lê texto de formulário. `formatar` não serve para isso: "R$ 1.234,56" tem milhar, e um
 * valor como R$ 12,00 formatado com milhar volta a ser lido como outro número. `toFixed(2)` é o
 * único formato que atravessa `deEntrada` sem perder nem ganhar nada.
 */
export function paraEntrada(valor: Centavos): string {
  return (valor / 100).toFixed(2)
}

export function somar(...valores: readonly Centavos[]): Centavos {
  return deCentavos(valores.reduce<number>((acc, v) => acc + v, 0))
}

/**
 * Total de uma linha do pedido: quantidade em milésimos vezes preço unitário em centavos.
 *
 * O arredondamento é meio-para-cima sobre o produto inteiro, feito uma vez e no fim. Arredondar
 * antes, ou acumular em float, produz divergência entre a soma dos itens e o total do pedido —
 * e é a divergência que o aprovador enxerga.
 */
export function porMilesimos(preco: Centavos, quantidade: Milesimos): Centavos {
  const produto = preco * quantidade
  const arredondado = Math.sign(produto) * Math.round(Math.abs(produto) / 1000)
  return deCentavos(arredondado)
}

export function ehMaiorQue(valor: Centavos, outro: Centavos): boolean {
  return valor > outro
}

export function ehPositivo(valor: Centavos): boolean {
  return valor > 0
}

const FORMATADOR = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatar(valor: Centavos): string {
  return FORMATADOR.format(valor / 100)
}
