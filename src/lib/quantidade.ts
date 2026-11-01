// Quantidade nos dois sentidos da tela. Para mostrar: chega do server como texto canônico
// (Decimal do Prisma, ver lib/dto.ts) e vira "1.000,5". Para ler: o que o usuário digitou
// no formulário vira o texto canônico que o domínio e a API aceitam, pela MESMA regra do
// preço (`normalizarDecimal`). Sem Prisma, sem Next.

import { normalizarDecimal } from "@/lib/numero";
import { REGEX_QUANTIDADE } from "@/lib/schemas/comum";

const formatadorQuantidade = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

/** "1000.5" → "1.000,5"; "150" → "150"; texto que não é número volta como veio. */
export function formatarQuantidade(quantidade: string): string {
  const numero = Number(quantidade);
  return Number.isFinite(numero) ? formatadorQuantidade.format(numero) : quantidade;
}

/**
 * Lê a quantidade digitada como se lê o preço ao lado: "1.000" é mil, "2,5" e "2.5" são
 * dois e meio, "1.000,5" é mil e meio. Devolve o texto canônico ("1000", "2.5", "1000.5")
 * que `quantidadeParaMilesimos` e a API recebem, ou null se não for uma quantidade com até
 * 9 dígitos inteiros e 3 casas. Zero passa aqui e é barrado pelo schema, com mensagem própria.
 *
 * O campo reescreve ao perder o foco (`formatarQuantidade`), então "1.000" fica "1.000" e
 * "1.5" vira "1,5": o que foi entendido fica visível antes de enviar.
 */
export function quantidadeDeTexto(texto: string): string | null {
  const normalizado = normalizarDecimal(texto);
  if (normalizado === null || !REGEX_QUANTIDADE.test(normalizado)) return null;
  return normalizado;
}
