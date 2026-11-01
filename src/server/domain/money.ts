/** Total de uma linha em centavos: quantidade (pode ser decimal) × preço unitário. */
export const lineTotalCents = (quantity: number, unitPriceCents: number) =>
  Math.round(quantity * unitPriceCents);

export const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
