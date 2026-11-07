/**
 * Quantidade em milésimos.
 *
 * Responsabilidade única: ler a quantidade digitada e devolvê-la como inteiro, com três casas de
 * precisão. "2,5 kg" é 2500; "0,125 m³" é 125.
 *
 * Três casas porque é o que o domínio de obra pede — fração de metro cúbico, de tonelada, de
 * milheiro — e porque mantém o total de item inteiro quando multiplicado por centavos.
 */

import type { Milesimos } from './tipos'

export const CASAS = 3

export function deMilesimos(valor: number): Milesimos {
  if (!Number.isInteger(valor)) {
    throw new TypeError(`Milesimos exige inteiro, recebido ${valor}`)
  }
  return valor as Milesimos
}

/**
 * Lê "2,5", "2.5", "2" ou "0,125". Devolve `null` para entrada inválida — é caso de formulário,
 * não acidente.
 *
 * Precisão além de três casas é recusada em vez de truncada: truncar silenciosamente aceita um
 * número e cobra outro.
 */
export function deEntrada(texto: string): Milesimos | null {
  const limpo = texto.trim().replace(',', '.')
  if (limpo === '') return null
  if (!/^\d+(\.\d{1,3})?$/.test(limpo)) return null

  const [inteiro, decimal = ''] = limpo.split('.')
  return deMilesimos(Number(inteiro) * 1000 + Number(decimal.padEnd(CASAS, '0')))
}

/**
 * O caminho de volta de `deEntrada`, pelo mesmo motivo de `Dinheiro.paraEntrada`: o rascunho
 * gravado é revalidado pelo `submissaoSchema`, que lê texto. `formatar` agrupa o milhar — "1.200"
 * voltaria como 1,2 —, e `toFixed(CASAS)` não agrupa nada.
 */
export function paraEntrada(valor: Milesimos): string {
  return (valor / 1000).toFixed(CASAS)
}

export function ehPositiva(valor: Milesimos): boolean {
  return valor > 0
}

export function formatar(valor: Milesimos): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: CASAS,
  }).format(valor / 1000)
}
