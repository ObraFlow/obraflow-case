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
 * Converte o que o usuário digitou em um campo de dinheiro para centavos.
 * Aceita "1.234,56", "1234,56", "1234.56", "R$ 1.234,56" e "1234".
 * Devolve null quando o texto não é um número.
 */
export function centavosDeTexto(texto: string): number | null {
  const limpo = texto.replace(/\s|R\$/g, "");
  if (limpo === "") return null;

  // Com vírgula, ela é o separador decimal e os pontos são de milhar.
  // Sem vírgula, um ponto (se houver) é o separador decimal.
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;

  const reais = Number(normalizado);
  if (!Number.isFinite(reais)) return null;

  return Math.round(reais * 100);
}

/** 123456 → "1234,56" (para preencher um input ao editar). */
export function textoDeCentavos(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
