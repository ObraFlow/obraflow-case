import Decimal from 'decimal.js';

// Mesmas regras do backend (apps/api/src/common/domain/money.ts), para a prévia do total
// no formulário bater centavo a centavo com o que a API vai calcular. Nunca usar number para dinheiro.

const CENTS = 2;

/** Total do item: quantidade × preço unitário, arredondado para centavos (meio para cima). */
export function itemTotal(quantity: string, unitPrice: string): string {
  return new Decimal(quantity)
    .mul(unitPrice)
    .toDecimalPlaces(CENTS, Decimal.ROUND_HALF_UP)
    .toFixed(CENTS);
}

/** Total do pedido: soma dos totais dos itens. */
export function orderTotal(itemTotals: string[]): string {
  return itemTotals
    .reduce((sum, total) => sum.plus(total), new Decimal(0))
    .toFixed(CENTS);
}

/**
 * Converte o que o usuário digita ("1.234,56", "1234,5", "32") para o formato da API ("1234.56").
 * Devolve null se não for um número válido.
 */
export function parseDecimalInput(
  input: string,
  maxDecimals: number,
): string | null {
  const normalized = input.trim().replace(/\./g, '').replace(',', '.');
  const pattern = new RegExp(`^\\d+(\\.\\d{1,${maxDecimals}})?$`);
  if (!pattern.test(normalized)) return null;
  return new Decimal(normalized).toFixed();
}
