// Cadeia de alçada em cima dos DTOs (com nomes), compartilhada entre client e server.
// A primeira parte é a cadeia acumulada de uma faixa (preview e tela de regras); a segunda
// traduz o snapshot de um pedido para os estados que a tela desenha (lista e timeline).

import { chegouNaMesa } from "@/domain/acompanhamento/chegouNaMesa";
import { niveisAcumulados } from "@/domain/alcada/montarCadeia";
import type { FaixaAlcada, StatusPedido } from "@/domain/alcada/tipos";
import type { AprovacaoDto, NivelDto, PedidoResumo, RegraDto } from "@/lib/dto";

/** DTO → tipo do domínio (sem nomes, só ids e ordem). */
export function paraFaixaAlcada(regra: RegraDto): FaixaAlcada {
  return {
    id: regra.id,
    minCents: regra.minCents,
    maxCents: regra.maxCents,
    niveis: regra.niveis.map((nivel) => ({ ordem: nivel.ordem, usuarioId: nivel.usuarioId })),
  };
}

export type NivelAcumuladoDto = NivelDto & {
  /** true quando veio de uma faixa abaixo da consultada. */
  herdado: boolean;
  faixaId: number;
};

/**
 * Quem aprova um pedido na `faixa`, na ordem, com nome: aprovadores das faixas abaixo
 * (herdados) e depois os da própria faixa. `ordem` é renumerada de 0 a n-1.
 */
export function cadeiaAcumulada(regras: RegraDto[], faixa: RegraDto): NivelAcumuladoDto[] {
  const nomes = new Map<number, string>();
  for (const regra of regras) {
    for (const nivel of regra.niveis) nomes.set(nivel.usuarioId, nivel.usuarioNome);
  }

  return niveisAcumulados(regras.map(paraFaixaAlcada), paraFaixaAlcada(faixa)).map(
    (nivel, indice) => ({
      ordem: indice,
      usuarioId: nivel.usuarioId,
      usuarioNome: nomes.get(nivel.usuarioId) ?? `Usuário ${nivel.usuarioId}`,
      herdado: nivel.faixaId !== faixa.id,
      faixaId: nivel.faixaId,
    }),
  );
}

/** Estado de um aprovador dentro da cadeia, como a tela desenha (docs/design.md). */
export type EstadoNivel = "proximo" | "herdado" | "atual" | "aprovou" | "rejeitou" | "cancelado";

export type NivelCadeia = {
  nome: string;
  estado: EstadoNivel;
};

/** Cadeia de uma faixa (sem pedido): herdados em cinza, os da própria faixa como próximos. */
export function niveisDaFaixa(
  cadeia: ReadonlyArray<{ usuarioNome: string; herdado: boolean }>,
): NivelCadeia[] {
  return cadeia.map((nivel) => ({
    nome: nivel.usuarioNome,
    estado: nivel.herdado ? "herdado" : "proximo",
  }));
}

// --- Cadeia de um pedido já criado (snapshot) -----------------------------------

/**
 * "É a sua vez": o usuário é o aprovador do step atual. `aprovadorAtualId` só é preenchido
 * em pedido pendente (server/dto.ts), então basta comparar. Única definição, usada pela
 * lista, pelo detalhe, pela timeline e pela ordenação da página.
 */
export function ehSuaVez(
  pedido: { aprovadorAtualId: number | null },
  usuarioId: number | null,
): boolean {
  return usuarioId !== null && pedido.aprovadorAtualId === usuarioId;
}

/**
 * Converte o snapshot do pedido para os estados da tela: concluídos, o atual (só enquanto
 * o pedido está pendente), os próximos, quem rejeitou e quem foi cancelado pela rejeição.
 */
export function niveisDoPedido(pedido: {
  status: StatusPedido;
  stepAtual: number;
  aprovacoes: AprovacaoDto[];
}): NivelCadeia[] {
  return pedido.aprovacoes.map((aprovacao) => ({
    nome: aprovacao.aprovadorNome,
    estado: estadoDoNivel(aprovacao, pedido),
  }));
}

/**
 * Desde quando o pedido pendente espera o aprovador da vez (ISO 8601), pela mesma regra do
 * acompanhamento (`chegouNaMesa`): criação no primeiro nível, decisão anterior nos demais.
 * null para pedido já encerrado.
 */
export function aguardandoDesde(pedido: PedidoResumo): string | null {
  if (pedido.status !== "PENDENTE") return null;
  const instante = chegouNaMesa(
    {
      id: pedido.id,
      obraId: pedido.obraId,
      totalCents: pedido.totalCents,
      status: pedido.status,
      stepAtual: pedido.stepAtual,
      criadoEm: new Date(pedido.criadoEm).getTime(),
      aprovacoes: pedido.aprovacoes.map((aprovacao) => ({
        ordem: aprovacao.ordem,
        aprovadorId: aprovacao.aprovadorId,
        status: aprovacao.status,
        decididoEm: aprovacao.decididoEm ? new Date(aprovacao.decididoEm).getTime() : null,
      })),
    },
    pedido.stepAtual,
  );
  return new Date(instante).toISOString();
}

export function estadoDoNivel(
  aprovacao: AprovacaoDto,
  pedido: { status: StatusPedido; stepAtual: number },
): EstadoNivel {
  switch (aprovacao.status) {
    case "APROVADA":
      return "aprovou";
    case "REJEITADA":
      return "rejeitou";
    case "CANCELADA":
      return "cancelado";
    case "PENDENTE":
      return pedido.status === "PENDENTE" && aprovacao.ordem === pedido.stepAtual
        ? "atual"
        : "proximo";
  }
}
