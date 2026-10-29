// Quantidade chega do server como texto (Decimal do Prisma, ver lib/dto.ts) e só é
// formatada aqui, para a tela: "1000.5" → "1.000,5". Sem Prisma, sem Next.

const formatadorQuantidade = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

/** "1000.5" → "1.000,5"; "150" → "150"; texto que não é número volta como veio. */
export function formatarQuantidade(quantidade: string): string {
  const numero = Number(quantidade);
  return Number.isFinite(numero) ? formatadorQuantidade.format(numero) : quantidade;
}
