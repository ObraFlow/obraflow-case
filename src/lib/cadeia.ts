// Cadeia acumulada em cima dos DTOs (com nomes). Compartilhado: o service usa no preview
// e a tela de regras usa para mostrar quem é herdado de faixas abaixo.

import { niveisAcumulados } from "@/domain/alcada/montarCadeia";
import type { FaixaAlcada } from "@/domain/alcada/tipos";
import type { NivelDto, RegraDto } from "@/lib/dto";

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
