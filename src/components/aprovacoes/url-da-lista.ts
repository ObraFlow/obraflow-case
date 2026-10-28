// Estado da lista de aprovações como vive na URL. Sem "use client": RSC (paginação,
// tabela) e client (filtros) montam links com a mesma função.

import type { StatusPedido } from "@/domain/alcada/tipos";

export type FiltrosDaLista = {
  filtro: "todos" | "minhas";
  obraId: number | null;
  status: StatusPedido | null;
  busca: string;
};

/** Monta a URL da lista a partir dos filtros. Sem `pagina`, volta para a primeira. */
export function urlDaLista(valores: Partial<FiltrosDaLista> & { pagina?: number }): string {
  const params = new URLSearchParams();
  if (valores.filtro === "minhas") params.set("filtro", "minhas");
  if (valores.obraId) params.set("obra", String(valores.obraId));
  if (valores.status) params.set("situacao", valores.status);
  if (valores.busca) params.set("busca", valores.busca);
  if (valores.pagina && valores.pagina > 1) params.set("pagina", String(valores.pagina));
  const query = params.toString();
  return query ? `/aprovacoes?${query}` : "/aprovacoes";
}

/** true quando algum filtro além da aba está ativo (para "Limpar filtros" e o empty state). */
export function temFiltroAtivo(valores: FiltrosDaLista): boolean {
  return valores.obraId !== null || valores.status !== null || valores.busca !== "";
}
