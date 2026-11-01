// Estado da lista de aprovações como vive na URL. Sem "use client": RSC (paginação,
// tabela, abas, cards) e client (filtros) montam links com a mesma função.

/** As abas da lista. "todos" é a ausência do parâmetro `filtro`. */
export const FILTROS_LISTA = [
  "todos",
  "minhas",
  "pendentes",
  "atrasados",
  "aprovados",
  "rejeitados",
] as const;

export type FiltroLista = (typeof FILTROS_LISTA)[number];

export function lerFiltroLista(valor: string | undefined): FiltroLista {
  return (FILTROS_LISTA as ReadonlyArray<string>).includes(valor ?? "")
    ? (valor as FiltroLista)
    : "todos";
}

/** A situação do pedido é a própria aba; fora dela, só obra e busca filtram. */
export type FiltrosDaLista = {
  filtro: FiltroLista;
  obraId: number | null;
  busca: string;
};

/** Monta a URL da lista a partir dos filtros. Sem `pagina`, volta para a primeira. */
export function urlDaLista(valores: Partial<FiltrosDaLista> & { pagina?: number }): string {
  const params = new URLSearchParams();
  if (valores.filtro && valores.filtro !== "todos") params.set("filtro", valores.filtro);
  if (valores.obraId) params.set("obra", String(valores.obraId));
  if (valores.busca) params.set("busca", valores.busca);
  if (valores.pagina && valores.pagina > 1) params.set("pagina", String(valores.pagina));
  const query = params.toString();
  return query ? `/aprovacoes?${query}` : "/aprovacoes";
}

/** true quando algum filtro além da aba está ativo (para "Limpar filtros" e o empty state). */
export function temFiltroAtivo(valores: FiltrosDaLista): boolean {
  return valores.obraId !== null || valores.busca !== "";
}
