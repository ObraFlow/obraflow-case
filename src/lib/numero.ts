// Leitura de um número decimal digitado em pt-BR. É a ÚNICA regra de "o que o ponto
// significa", compartilhada por dinheiro (money.ts) e quantidade (quantidade.ts): na mesma
// linha do item, "1.500" tem que valer mil e quinhentos nos dois campos.
// Sem Prisma, sem Next: pode ser importado em client e server.

/**
 * Normaliza o que o usuário digitou para a forma que `Number` e o domínio entendem
 * (ponto como decimal, sem separador de milhar). Devolve null para texto vazio ou que não
 * é número.
 *
 *   "1.234,56" → "1234.56"   "1234,56" → "1234.56"   "1234" → "1234"
 *   "1.500"    → "1500"      (ponto seguido de exatamente 3 dígitos é milhar)
 *   "1.5"      → "1.5"       "1234.56" → "1234.56"  (ponto com 1 ou 2 dígitos é decimal)
 *   "0.500"    → "0.500"     (grupo inicial zero não é milhar: é meio)
 */
export function normalizarDecimal(texto: string): string | null {
  const limpo = texto.replace(/\s/g, "");
  if (limpo === "") return null;

  let normalizado: string;
  if (limpo.includes(",")) {
    // Com vírgula, ela é o separador decimal e os pontos são de milhar.
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(limpo)) {
    // Só pontos, cada um seguido de 3 dígitos, começando sem zero: milhares ("1.500", "1.500.000").
    normalizado = limpo.replace(/\./g, "");
  } else {
    // Sem vírgula e sem agrupamento de milhar: um ponto, se houver, é o decimal.
    normalizado = limpo;
  }

  return Number.isFinite(Number(normalizado)) ? normalizado : null;
}
