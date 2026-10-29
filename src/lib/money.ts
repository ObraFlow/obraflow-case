// Dinheiro circula no sistema como centavos inteiros (Int no banco, number no código).
// Este módulo só converte entre centavos e a representação em reais para a UI.
// Sem Prisma, sem Next: pode ser importado em client e server.

const formatadorBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** 123456 → "R$ 1.234,56" */
export function formatarCentavos(cents: number): string {
  return formatadorBRL.format(cents / 100);
}

/**
 * Converte o que o usuário digitou em um campo de dinheiro para centavos, lendo como se lê
 * em pt-BR. Devolve null quando o texto não é um número.
 *
 *   "1.234,56" → 123456   "1234,56" → 123456   "R$ 1.234,56" → 123456   "1234" → 123400
 *   "1.500"    → 150000   (ponto seguido de exatamente 3 dígitos é milhar)
 *   "1.5"      → 150      "1234.56" → 123456  (ponto com 1 ou 2 dígitos é decimal)
 *
 * O campo reescreve o valor ao perder o foco (`textoDeCentavos`), então o que foi entendido
 * fica visível antes de enviar.
 */
export function centavosDeTexto(texto: string): number | null {
  const limpo = texto.replace(/\s|R\$/g, "");
  if (limpo === "") return null;

  let normalizado: string;
  if (limpo.includes(",")) {
    // Com vírgula, ela é o separador decimal e os pontos são de milhar.
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(limpo)) {
    // Só pontos, cada um seguido de 3 dígitos: milhares ("1.500", "1.500.000").
    normalizado = limpo.replace(/\./g, "");
  } else {
    // Sem vírgula e sem agrupamento de milhar: um ponto, se houver, é o decimal.
    normalizado = limpo;
  }

  const reais = Number(normalizado);
  if (!Number.isFinite(reais)) return null;

  return Math.round(reais * 100);
}

const formatadorDecimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1234567 → "12.345,67" (para preencher um input ao editar; `centavosDeTexto` lê de volta). */
export function textoDeCentavos(cents: number): string {
  return formatadorDecimal.format(cents / 100);
}

/**
 * Descreve uma faixa de alçada para a tela e para mensagens de erro.
 * (0, 1_000_000) → "R$ 0,00 a R$ 10.000,00"; (1_000_001, null) → "acima de R$ 10.000,00".
 * Na faixa aberta citamos o valor imediatamente abaixo do mínimo, que é como se fala
 * ("acima de dez mil"), e não o mínimo inclusivo (R$ 10.000,01).
 */
export function formatarFaixa(minCents: number, maxCents: number | null): string {
  if (maxCents === null) {
    return minCents === 0
      ? "qualquer valor"
      : `acima de ${formatarCentavos(Math.max(0, minCents - 1))}`;
  }
  return `${formatarCentavos(minCents)} a ${formatarCentavos(maxCents)}`;
}
