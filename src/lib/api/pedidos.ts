import type { PedidoDetalhe, PedidoResumo } from "@/lib/dto";
import type { FiltroPedidos } from "@/lib/schemas/pedido";
import { api } from "./client";

/** Lista de pedidos com filtros (status, obra, busca, pendentes para um aprovador). */
export function listarPedidos(filtro: FiltroPedidos = {}): Promise<PedidoResumo[]> {
  const searchParams: Record<string, string> = {};
  if (filtro.status) searchParams.status = filtro.status;
  if (filtro.obraId) searchParams.obraId = String(filtro.obraId);
  if (filtro.pendentesPara) searchParams.pendentesPara = String(filtro.pendentesPara);
  if (filtro.busca) searchParams.busca = filtro.busca;
  return api.get("pedidos", { searchParams }).json<PedidoResumo[]>();
}

/** Detalhe com itens e cadeia (dialog "Decidir" na lista, ao abrir). */
export function obterPedido(id: number): Promise<PedidoDetalhe> {
  return api.get(`pedidos/${id}`).json<PedidoDetalhe>();
}
