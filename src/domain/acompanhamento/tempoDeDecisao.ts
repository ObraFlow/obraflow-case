import { chegouNaMesa } from "./chegouNaMesa";
import { instanteDeEncerramento } from "./encerramento";
import type { PedidoAcompanhado } from "./tipos";

export type TempoAprovador = {
  aprovadorId: number;
  /** Quantas decisões (aprovações e rejeições) entraram na média. */
  decisoes: number;
  /** Média, em ms, entre o pedido chegar na mesa e a decisão. */
  mediaMs: number;
};

export type TempoObra = {
  obraId: number;
  /** Pedidos já aprovados ou rejeitados. */
  pedidosEncerrados: number;
  /** Média, em ms, da criação ao encerramento. */
  mediaMs: number;
};

type Acumulado = { quantidade: number; somaMs: number };

function acumular(mapa: Map<number, Acumulado>, chave: number, duracaoMs: number): void {
  const atual = mapa.get(chave) ?? { quantidade: 0, somaMs: 0 };
  atual.quantidade += 1;
  atual.somaMs += duracaoMs;
  mapa.set(chave, atual);
}

/**
 * Quanto tempo cada aprovador leva para decidir, da chegada na mesa (`chegouNaMesa`) até
 * `decididoEm`. Rejeição conta como decisão; posição cancelada ou ainda pendente não conta.
 * Quem nunca decidiu fica de fora: não há o que medir. Ordenado do mais lento para o mais
 * rápido (o gargalo primeiro); empate por id.
 */
export function tempoPorAprovador(pedidos: ReadonlyArray<PedidoAcompanhado>): TempoAprovador[] {
  const acumulados = new Map<number, Acumulado>();

  for (const pedido of pedidos) {
    for (const aprovacao of pedido.aprovacoes) {
      const decidiu = aprovacao.status === "APROVADA" || aprovacao.status === "REJEITADA";
      if (!decidiu || aprovacao.decididoEm === null) continue;
      const duracao = Math.max(0, aprovacao.decididoEm - chegouNaMesa(pedido, aprovacao.ordem));
      acumular(acumulados, aprovacao.aprovadorId, duracao);
    }
  }

  return [...acumulados.entries()]
    .map(([aprovadorId, { quantidade, somaMs }]) => ({
      aprovadorId,
      decisoes: quantidade,
      mediaMs: somaMs / quantidade,
    }))
    .sort((a, b) => b.mediaMs - a.mediaMs || a.aprovadorId - b.aprovadorId);
}

/**
 * Quanto tempo um pedido leva da criação ao encerramento (aprovado ou rejeitado), por obra.
 * O encerramento é a última decisão registrada na cadeia. Pedido pendente não conta.
 */
export function tempoPorObra(pedidos: ReadonlyArray<PedidoAcompanhado>): TempoObra[] {
  const acumulados = new Map<number, Acumulado>();

  for (const pedido of pedidos) {
    const encerramento = instanteDeEncerramento(pedido);
    if (encerramento === null) continue;
    acumular(acumulados, pedido.obraId, Math.max(0, encerramento - pedido.criadoEm));
  }

  return [...acumulados.entries()]
    .map(([obraId, { quantidade, somaMs }]) => ({
      obraId,
      pedidosEncerrados: quantidade,
      mediaMs: somaMs / quantidade,
    }))
    .sort((a, b) => a.obraId - b.obraId);
}
