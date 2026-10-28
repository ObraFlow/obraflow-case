import { PrecoInvalido, QuantidadeInvalida, ValorExcedeLimite } from "../erros";

/** O que o domínio precisa de um item para calcular o total. */
export type ItemParaTotal = {
  /** Texto decimal com até 3 casas: "150", "2,5", "0.750". */
  quantidade: string;
  precoUnitarioCents: number;
};

export type TotaisCalculados = {
  /** Um total por item, na mesma ordem da entrada. */
  totaisItensCents: number[];
  totalPedidoCents: number;
};

const CASAS_DECIMAIS_QUANTIDADE = 3;
const MILESIMOS_POR_UNIDADE = 10 ** CASAS_DECIMAIS_QUANTIDADE;

/** Quantidade é `Decimal(12,3)` no banco: até 9 dígitos antes da vírgula. */
const MAX_DIGITOS_INTEIROS_QUANTIDADE = 9;

/** Centavos são `Int` (32 bits) no banco: R$ 21.474.836,47. */
export const MAX_CENTS = 2_147_483_647;

/**
 * Converte "2,5" ou "2.5" em milésimos inteiros (2500). Evita ponto flutuante:
 * 1,005 × R$ 1,00 precisa dar R$ 1,01, e `1.005 * 100` em float dá 100.49999.
 * Lança `QuantidadeInvalida` para texto vazio, não numérico, negativo, zero,
 * com mais de 3 casas decimais ou com mais de 9 dígitos inteiros.
 */
export function quantidadeParaMilesimos(texto: string): number {
  const limpo = texto.trim().replace(",", ".");
  const partes = /^(\d{1,9})(?:\.(\d{1,3}))?$/.exec(limpo);
  if (!partes) {
    throw new QuantidadeInvalida(
      `Quantidade deve ser um número positivo com até ${MAX_DIGITOS_INTEIROS_QUANTIDADE} dígitos e ${CASAS_DECIMAIS_QUANTIDADE} casas decimais.`,
    );
  }
  const inteira = Number(partes[1]);
  const decimal = Number((partes[2] ?? "").padEnd(CASAS_DECIMAIS_QUANTIDADE, "0"));
  const milesimos = inteira * MILESIMOS_POR_UNIDADE + decimal;
  if (milesimos === 0) {
    throw new QuantidadeInvalida("Quantidade deve ser maior que zero.");
  }
  return milesimos;
}

/**
 * Total de um item: quantidade × preço unitário, em centavos, arredondado para o
 * centavo mais próximo (meio centavo arredonda para cima). Toda a conta é em inteiros.
 */
export function calcularTotalItemCents(item: ItemParaTotal): number {
  if (!Number.isInteger(item.precoUnitarioCents) || item.precoUnitarioCents < 0) {
    throw new PrecoInvalido("Preço unitário deve ser zero ou positivo, em centavos inteiros.");
  }
  if (item.precoUnitarioCents > MAX_CENTS) {
    throw new ValorExcedeLimite("Preço unitário acima do limite suportado (R$ 21.474.836,47).");
  }
  const milesimos = quantidadeParaMilesimos(item.quantidade);
  // milesimos ≤ 10^12 e preço ≤ 2^31: o produto fica abaixo de 2^53, então é exato.
  const totalCents = Math.round((milesimos * item.precoUnitarioCents) / MILESIMOS_POR_UNIDADE);
  if (totalCents > MAX_CENTS) {
    throw new ValorExcedeLimite("Total do item acima do limite suportado (R$ 21.474.836,47).");
  }
  return totalCents;
}

/**
 * Totais do pedido. O total do pedido é a soma dos totais já arredondados dos itens,
 * sem novo arredondamento: é o que a tela mostra e o que define a faixa de alçada.
 */
export function calcularTotais(itens: ItemParaTotal[]): TotaisCalculados {
  const totaisItensCents = itens.map(calcularTotalItemCents);
  const totalPedidoCents = totaisItensCents.reduce((soma, total) => soma + total, 0);
  if (totalPedidoCents > MAX_CENTS) {
    throw new ValorExcedeLimite("Total do pedido acima do limite suportado (R$ 21.474.836,47).");
  }
  return { totaisItensCents, totalPedidoCents };
}
