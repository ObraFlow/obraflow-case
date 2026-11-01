import { chegouNaMesa } from "./chegouNaMesa";
import type { PedidoAcompanhado } from "./tipos";

export const DIA_MS = 86_400_000;

/** A partir de quantos dias sem decisão um pedido pendente conta como atrasado. */
export const DIAS_PARA_ATRASO = 3;

/**
 * Desde quando o pedido pendente espera o aprovador da vez (ms), ou null se não está
 * pendente. É a chegada na mesa do nível atual, não a criação: um pedido que o primeiro
 * nível aprovou ontem não está atrasado só porque foi criado há duas semanas.
 */
export function esperandoDesde(pedido: PedidoAcompanhado): number | null {
  if (pedido.status !== "PENDENTE") return null;
  return chegouNaMesa(pedido, pedido.stepAtual);
}

/** Pendente há `limiteMs` ou mais sem decisão do nível atual. */
export function estaAtrasado(
  pedido: PedidoAcompanhado,
  agoraMs: number,
  limiteMs = DIAS_PARA_ATRASO * DIA_MS,
): boolean {
  const desde = esperandoDesde(pedido);
  if (desde === null) return false;
  return agoraMs - desde >= limiteMs;
}
