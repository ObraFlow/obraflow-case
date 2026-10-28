import { FaixaInvalida } from "../erros";
import type { AprovacaoSnapshot, FaixaAlcada } from "./tipos";

/**
 * Monta a cadeia de aprovação de um pedido a partir da faixa aplicável.
 *
 * É a "foto" dos níveis da faixa no momento da criação: o service grava o resultado
 * como linhas de AprovacaoPedido, e dali em diante o pedido não depende mais da regra.
 * Os níveis são ordenados por `ordem` e renumerados de 0 a n-1, para que `stepAtual`
 * possa ser usado como índice direto.
 */
export function montarCadeia(faixa: FaixaAlcada): AprovacaoSnapshot[] {
  if (faixa.niveis.length === 0) {
    throw new FaixaInvalida("A faixa de alçada não tem aprovadores. Configure a regra da obra.");
  }

  const ordenados = [...faixa.niveis].sort((a, b) => a.ordem - b.ordem);

  return ordenados.map((nivel, indice) => ({
    ordem: indice,
    aprovadorId: nivel.usuarioId,
    status: "PENDENTE",
    motivo: null,
  }));
}
