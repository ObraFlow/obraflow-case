// Totais para EXIBIÇÃO no formulário de pedido, a partir do que o usuário digitou.
// Usa as mesmas funções do domínio que o server usa ao gravar; a diferença é que aqui um
// item ainda incompleto ou inválido vira `null` em vez de erro, porque o usuário está digitando.

import { calcularTotalItemCents, MAX_CENTS } from "@/domain/pedido/calcularTotais";
import { centavosDeTexto } from "@/lib/money";
import { quantidadeDeTexto } from "@/lib/quantidade";

export type TotaisParaExibicao = {
  /** Um total por item; `null` quando o item ainda não dá para calcular. */
  totaisItensCents: Array<number | null>;
  /** Soma dos itens calculáveis. */
  totalPedidoCents: number;
  /** true quando todos os itens têm total (o total do pedido é o definitivo). */
  completo: boolean;
};

export function totalItemParaExibicao(quantidade: string, precoUnitario: string): number | null {
  const qtd = quantidadeDeTexto(quantidade);
  if (qtd === null || Number(qtd) <= 0) return null;
  const precoCents = centavosDeTexto(precoUnitario);
  if (precoCents === null || precoCents < 0 || precoCents > MAX_CENTS) return null;
  const total = calcularTotalItemCents({ quantidade: qtd, precoUnitarioCents: precoCents });
  return total > MAX_CENTS ? null : total;
}

export function totaisParaExibicao(
  itens: ReadonlyArray<{ quantidade: string; precoUnitario: string }>,
): TotaisParaExibicao {
  const totaisItensCents = itens.map((item) =>
    totalItemParaExibicao(item.quantidade ?? "", item.precoUnitario ?? ""),
  );
  const totalPedidoCents = totaisItensCents.reduce<number>((soma, total) => soma + (total ?? 0), 0);
  return {
    totaisItensCents,
    totalPedidoCents,
    completo: itens.length > 0 && totaisItensCents.every((total) => total !== null),
  };
}
