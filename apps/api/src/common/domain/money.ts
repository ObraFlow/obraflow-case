import { Prisma } from '../../../prisma/generated/client.js';

// Decimal exato (decimal.js) — o mesmo tipo que o Prisma usa para colunas numeric.
// Dinheiro e quantidade nunca passam por number/float.
export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;

export const ZERO = new Decimal(0);
export const ONE_CENT = new Decimal('0.01');
/** Maior valor que cabe nas colunas de dinheiro (numeric(14,2)). */
export const MAX_MONEY = new Decimal('999999999999.99');

/** Arredonda para centavos (meio para cima, como em valores monetários). */
export function toCents(value: Decimal): Decimal {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** Total do item: quantidade × preço unitário, em centavos. */
export function itemTotal(quantity: Decimal, unitPrice: Decimal): Decimal {
  return toCents(quantity.mul(unitPrice));
}

/** Total do pedido: soma dos totais dos itens. */
export function orderTotal(itemTotals: Decimal[]): Decimal {
  return itemTotals.reduce((sum, total) => sum.plus(total), ZERO);
}

/** Formato de dinheiro na API: string com 2 casas ("12500.00"). */
export function formatMoney(value: Decimal): string {
  return value.toFixed(2);
}

/** Formato para mensagens ao usuário: "R$ 12.500,00". */
export function formatBRL(value: Decimal): string {
  const [int, cents] = value.toFixed(2).split('.');
  return `R$ ${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${cents}`;
}
