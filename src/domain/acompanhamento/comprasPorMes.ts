import { instanteDeAprovacao } from "./encerramento";
import type { PedidoAcompanhado } from "./tipos";

export type ComprasDoMes = {
  /** Chave do mês, "AAAA-MM". */
  mes: string;
  quantidade: number;
  totalCents: number;
};

/**
 * Compras aprovadas por mês. Um pedido entra no mês da aprovação final, não no da criação:
 * é quando o dinheiro fica comprometido. `meses` chega pronto e na ordem em que a tela
 * desenha (do mais antigo ao atual); meses sem compra saem zerados. Aprovação fora dessa
 * janela é ignorada. O fuso fica em `chaveDoMes`, que o chamador fornece: o domínio não
 * conhece fuso nem Date.
 */
export function comprasAprovadasPorMes(
  pedidos: ReadonlyArray<PedidoAcompanhado>,
  meses: ReadonlyArray<string>,
  chaveDoMes: (ms: number) => string,
): ComprasDoMes[] {
  const porMes = new Map<string, ComprasDoMes>(
    meses.map((mes) => [mes, { mes, quantidade: 0, totalCents: 0 }]),
  );

  for (const pedido of pedidos) {
    const aprovadoEm = instanteDeAprovacao(pedido);
    if (aprovadoEm === null) continue;
    const compras = porMes.get(chaveDoMes(aprovadoEm));
    if (!compras) continue;
    compras.quantidade += 1;
    compras.totalCents += pedido.totalCents;
  }

  return meses.map((mes) => porMes.get(mes)!);
}
