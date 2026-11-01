// Orçamento de uma obra contra o que já foi comprado e o que está em aprovação.
// Tudo em centavos inteiros; percentuais são inteiros arredondados. Orçamento 0 quer dizer
// "não definido": nada de disponível nem de percentual, e nunca alerta.

/** A partir de que percentual comprometido a obra ganha o aviso "Quase no limite". */
export const LIMIAR_ALERTA_ORCAMENTO = 90;

export type EntradaOrcamento = {
  orcamentoCents: number;
  /** Pedidos com a cadeia concluída. */
  aprovadoCents: number;
  /** Pedidos pendentes: dinheiro reservado até alguém decidir. */
  pendenteCents: number;
};

export type ResumoOrcamento = {
  orcamentoCents: number;
  aprovadoCents: number;
  pendenteCents: number;
  /** Aprovado + pendente. */
  comprometidoCents: number;
  /** Orçamento − comprometido; pode ser negativo. Null sem orçamento. */
  disponivelCents: number | null;
  /** Comprometido sobre orçamento, inteiro. Null sem orçamento. */
  percentualComprometido: number | null;
  /** Comprometido em `LIMIAR_ALERTA_ORCAMENTO`% ou mais do orçamento. */
  quaseNoLimite: boolean;
};

export function resumoOrcamento(entrada: EntradaOrcamento): ResumoOrcamento {
  const comprometidoCents = entrada.aprovadoCents + entrada.pendenteCents;
  const temOrcamento = entrada.orcamentoCents > 0;

  return {
    orcamentoCents: entrada.orcamentoCents,
    aprovadoCents: entrada.aprovadoCents,
    pendenteCents: entrada.pendenteCents,
    comprometidoCents,
    disponivelCents: temOrcamento ? entrada.orcamentoCents - comprometidoCents : null,
    // Arredonda para baixo: 99,97% não pode virar "100%" sem o orçamento ter acabado.
    percentualComprometido: temOrcamento
      ? Math.floor((comprometidoCents * 100) / entrada.orcamentoCents)
      : null,
    // Comparação em inteiros, sem passar por percentual arredondado.
    quaseNoLimite:
      temOrcamento && comprometidoCents * 100 >= entrada.orcamentoCents * LIMIAR_ALERTA_ORCAMENTO,
  };
}

export type ImpactoOrcamento = {
  orcamentoCents: number;
  /** O que já estava comprometido antes deste pedido. */
  comprometidoAntesCents: number;
  /** Comprometido somando este pedido. */
  comEsteCents: number;
  /** Percentual com este pedido, inteiro. Null sem orçamento. */
  percentualComEste: number | null;
  /** Quanto passa do orçamento; 0 quando cabe ou sem orçamento. */
  excedenteCents: number;
  ultrapassa: boolean;
};

/** O que um pedido novo faz com o orçamento da obra. Avisa; quem bloqueia é a alçada. */
export function impactoNoOrcamento(
  resumo: ResumoOrcamento,
  novoPedidoCents: number,
): ImpactoOrcamento {
  const comEsteCents = resumo.comprometidoCents + novoPedidoCents;
  const temOrcamento = resumo.orcamentoCents > 0;
  const excedenteCents = temOrcamento ? Math.max(0, comEsteCents - resumo.orcamentoCents) : 0;

  return {
    orcamentoCents: resumo.orcamentoCents,
    comprometidoAntesCents: resumo.comprometidoCents,
    comEsteCents,
    percentualComEste: temOrcamento
      ? Math.floor((comEsteCents * 100) / resumo.orcamentoCents)
      : null,
    excedenteCents,
    ultrapassa: excedenteCents > 0,
  };
}
