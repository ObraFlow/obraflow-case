// Dinheiro circula no sistema como centavos inteiros (Int no banco, number no código).
// Este módulo só converte entre centavos e a representação em reais para a UI.
// Sem Prisma, sem Next: pode ser importado em client e server.

import { normalizarDecimal } from "@/lib/numero";

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
 * em pt-BR (`normalizarDecimal`, a mesma regra da quantidade). Devolve null quando o texto
 * não é um número.
 *
 *   "1.234,56" → 123456   "1234,56" → 123456   "R$ 1.234,56" → 123456   "1234" → 123400
 *   "1.500"    → 150000   "1.5" → 150   "0.500" → 50
 *
 * O campo reescreve o valor ao perder o foco (`textoDeCentavos`), então o que foi entendido
 * fica visível antes de enviar.
 */
export function centavosDeTexto(texto: string): number | null {
  const normalizado = normalizarDecimal(texto.replace(/R\$/g, ""));
  if (normalizado === null) return null;
  return Math.round(Number(normalizado) * 100);
}

const formatadorCurto = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/** Arredonda a uma casa decimal, do mesmo jeito que `formatadorCurto` vai mostrar. */
function umaCasa(valor: number): number {
  return Math.round(valor * 10) / 10;
}

/**
 * Valor abreviado para eixos de gráfico, onde "R$ 12.000,00" não cabe:
 * 1_200_000 → "R$ 12 mil"; 150_000_000 → "R$ 1,5 mi"; abaixo de mil, o valor inteiro.
 * A unidade é escolhida depois do arredondamento: R$ 999.950 vira "R$ 1 mi", não "R$ 1.000 mil".
 */
export function formatarCentavosCurto(cents: number): string {
  const reais = cents / 100;
  if (umaCasa(reais / 1_000) < 1) return formatarCentavos(cents);
  if (umaCasa(reais / 1_000) < 1_000) return `R$ ${formatadorCurto.format(reais / 1_000)} mil`;
  return `R$ ${formatadorCurto.format(reais / 1_000_000)} mi`;
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
