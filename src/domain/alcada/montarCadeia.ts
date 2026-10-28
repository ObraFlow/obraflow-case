import { FaixaInvalida } from "../erros";
import type { AprovacaoSnapshot, FaixaAlcada } from "./tipos";

/** Um aprovador da cadeia acumulada e de qual faixa ele veio. */
export type NivelAcumulado = {
  usuarioId: number;
  faixaId: number;
};

function niveisOrdenados(faixa: FaixaAlcada) {
  return [...faixa.niveis].sort((a, b) => a.ordem - b.ordem);
}

/**
 * Cadeia acumulada (decisão de produto 1): quem aprova um pedido na `faixaAplicavel` são
 * os aprovadores de todas as faixas da obra com mínimo abaixo dela, em ordem crescente de
 * valor, e por fim os da própria faixa. Compras maiores passam por quem já aprovaria as
 * menores e ainda por alguém a mais (enunciado: "João precisa aprovar primeiro").
 *
 * `validarFaixas` garante que uma pessoa não aparece em duas faixas; mesmo assim, se
 * dados antigos repetirem alguém, ela entra uma vez só, na primeira posição em que surgir.
 */
export function niveisAcumulados(
  faixas: ReadonlyArray<FaixaAlcada>,
  faixaAplicavel: FaixaAlcada,
): NivelAcumulado[] {
  const anteriores = faixas
    .filter((faixa) => faixa.id !== faixaAplicavel.id && faixa.minCents < faixaAplicavel.minCents)
    .sort((a, b) => a.minCents - b.minCents);

  const resultado: NivelAcumulado[] = [];
  const vistos = new Set<number>();
  for (const faixa of [...anteriores, faixaAplicavel]) {
    for (const nivel of niveisOrdenados(faixa)) {
      if (vistos.has(nivel.usuarioId)) continue;
      vistos.add(nivel.usuarioId);
      resultado.push({ usuarioId: nivel.usuarioId, faixaId: faixa.id });
    }
  }
  return resultado;
}

/**
 * Monta a cadeia de aprovação de um pedido: a "foto" dos aprovadores acumulados no
 * momento da criação. O service grava o resultado como linhas de AprovacaoPedido, e dali
 * em diante o pedido não depende mais das regras. As posições são renumeradas de 0 a n-1
 * para que `stepAtual` possa ser usado como índice direto.
 */
export function montarCadeia(
  faixas: ReadonlyArray<FaixaAlcada>,
  faixaAplicavel: FaixaAlcada,
): AprovacaoSnapshot[] {
  const niveis = niveisAcumulados(faixas, faixaAplicavel);
  if (niveis.length === 0) {
    throw new FaixaInvalida("A faixa de alçada não tem aprovadores. Configure a regra da obra.");
  }

  return niveis.map((nivel, indice) => ({
    ordem: indice,
    aprovadorId: nivel.usuarioId,
    status: "PENDENTE",
    motivo: null,
  }));
}
