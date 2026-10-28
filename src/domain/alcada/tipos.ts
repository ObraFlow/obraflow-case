// Tipos do núcleo de alçada. São estruturas simples, sem nada do Prisma:
// os services convertem o que vem do banco para estes tipos antes de chamar o domínio.

/** Um aprovador em uma posição da faixa. `ordem` começa em 0. */
export type NivelAlcada = {
  ordem: number;
  usuarioId: number;
};

/** Faixa de valor de uma obra. `minCents` inclusivo; `maxCents` null = sem teto. */
export type FaixaAlcada = {
  id: number;
  minCents: number;
  maxCents: number | null;
  niveis: NivelAlcada[];
};

export type StatusAprovacao = "PENDENTE" | "APROVADA" | "REJEITADA" | "CANCELADA";

export type StatusPedido = "PENDENTE" | "APROVADO" | "REJEITADO";

/** Uma posição da cadeia copiada para o pedido (linha de AprovacaoPedido). */
export type AprovacaoSnapshot = {
  ordem: number;
  aprovadorId: number;
  status: StatusAprovacao;
  motivo: string | null;
};

/** O que o domínio precisa saber de um pedido para aplicar uma decisão. */
export type EstadoAprovacao = {
  status: StatusPedido;
  stepAtual: number;
  cadeia: AprovacaoSnapshot[];
};

export type Decisao = { tipo: "APROVAR" } | { tipo: "REJEITAR"; motivo: string };
