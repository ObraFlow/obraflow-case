// O que o acompanhamento precisa saber de um pedido. Instantes são números (ms desde a
// época) para o domínio não depender de Date: o service converte o que vem do banco.

import type { StatusAprovacao, StatusPedido } from "../alcada/tipos";

export type AprovacaoAcompanhada = {
  ordem: number;
  aprovadorId: number;
  status: StatusAprovacao;
  /** Instante da decisão em ms, ou null enquanto pendente/cancelada. */
  decididoEm: number | null;
};

export type PedidoAcompanhado = {
  id: number;
  obraId: number;
  totalCents: number;
  status: StatusPedido;
  stepAtual: number;
  /** Instante da criação em ms. */
  criadoEm: number;
  aprovacoes: ReadonlyArray<AprovacaoAcompanhada>;
};
