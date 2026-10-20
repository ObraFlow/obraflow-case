"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useData, useEntities } from "@/lib/client-api";
import { dateLabel, decimal, money, shortId, statusLabels, type Order, type Page } from "@/lib/ui-types";
import { useSession } from "./app-shell";
import { Chain, Empty, ErrorState, Icon, Loading } from "./ui";

export function OrdersList() {
  const { actor } = useSession();
  const [status, setStatus] = useState("");
  const [project, setProject] = useState("");
  const [mine, setMine] = useState(false);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [restored, setRestored] = useState(false);
  const projects = useEntities("/projects", actor);
  useEffect(() => { Promise.resolve().then(() => {
    try { const saved = JSON.parse(sessionStorage.getItem("obraflow-order-filters") ?? "null") as { status: string; project: string; mine: boolean; search: string; page: number } | null;
      if (saved) { setStatus(saved.status ?? ""); setProject(saved.project ?? ""); setMine(!!saved.mine); setSearch(saved.search ?? ""); setAppliedSearch(saved.search ?? ""); setPage(Number.isInteger(saved.page) && saved.page > 0 ? saved.page : 1); }
    } catch { sessionStorage.removeItem("obraflow-order-filters"); }
    setRestored(true);
  }); }, []);
  useEffect(() => { if (restored) sessionStorage.setItem("obraflow-order-filters", JSON.stringify({ status, project, mine, search: appliedSearch, page })); }, [status, project, mine, appliedSearch, page, restored]);
  useEffect(() => { if (search.trim() === appliedSearch) return; const timer = setTimeout(() => { setAppliedSearch(search.trim()); setPage(1); }, 350); return () => clearTimeout(timer); }, [search, appliedSearch]);
  const query = new URLSearchParams({ page: String(page), pageSize: "10" });
  if (status) query.set("status", status);
  if (project) query.set("projectId", project);
  if (mine) query.set("mine", "true");
  if (appliedSearch) query.set("search", appliedSearch);
  const orders = useData<Page<Order>>(`/orders?${query}`, actor);
  const rows = orders.data?.data ?? [];
  const filtered = !!(status || project || appliedSearch || mine);
  const reset = () => { setStatus(""); setProject(""); setSearch(""); setAppliedSearch(""); setMine(false); setPage(1); };
  return <>
    <div className="page-heading"><div><div className="eyebrow">GESTÃO DE COMPRAS</div><h1>Aprovações</h1><p>Acompanhe cada pedido. Faça as decisões avançarem.</p></div><Link href="/orders/new" className="button primary"><Icon name="plus" size={18}/> Novo pedido</Link></div>
    <section style={{ display: "none" }} className="metric-grid" aria-label="Resumo dos resultados"><div className="metric-card"><span className="metric-icon blue"><Icon name="file"/></span><div><span>Pedidos encontrados</span><strong>{orders.loading ? "—" : orders.data?.pagination.total ?? "—"}</strong><small>Conforme os filtros aplicados</small></div></div><div className="metric-card"><span className="metric-icon amber"><Icon name="clock"/></span><div><span>Pendentes nesta página</span><strong>{orders.loading || orders.error ? "—" : rows.filter(order => order.status === "PENDING").length}</strong><small>Pedidos em processo de aprovação</small></div></div><div className="metric-card"><span className="metric-icon green"><Icon name="building"/></span><div><span>Valor nesta página</span><strong className="money-metric">{orders.loading || orders.error ? "—" : money(rows.reduce((total, order) => total + (decimal(order.total, 2) ?? 0n), 0n))}</strong><small>Soma dos pedidos exibidos</small></div></div></section>
    <section className="panel orders-panel"><div className="panel-top"><div><h2>Pedidos de compra <span className="count-pill">{orders.data?.pagination.total ?? "…"}</span></h2><p>Visibilidade do início à decisão final.</p></div><button className="icon-button" onClick={orders.reload} aria-label="Atualizar pedidos"><Icon name="clock"/></button></div>
      <div className="tabs" role="group" aria-label="Escopo dos pedidos"><button className={!mine ? "selected" : ""} aria-pressed={!mine} onClick={() => { setMine(false); setPage(1); }}>Todos os pedidos</button><button disabled className={mine ? "selected" : ""} aria-pressed={mine} onClick={() => { setMine(true); setPage(1); }}>Aguardando minha decisão</button></div>
      <div className="filter-bar"><div className="search-field"><Icon name="search" size={18}/><input disabled aria-label="Buscar por identificador" placeholder="Buscar pelo início do identificador…" value={search} onChange={event => setSearch(event.target.value)} maxLength={36}/></div><select aria-label="Filtrar por situação" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Todas as situações</option><option value="PENDING">Pendentes</option><option value="APPROVED">Aprovados</option><option value="REJECTED">Rejeitados</option></select><select aria-label="Filtrar por obra" value={project} disabled={projects.loading} onChange={event => { setProject(event.target.value); setPage(1); }}><option value="">{projects.loading ? "Carregando obras…" : "Todas as obras"}</option>{projects.data?.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select>{filtered && <button className="text-button" onClick={reset}>Limpar filtros</button>}</div>
      {projects.error && <ErrorState message={projects.error} retry={projects.reload}/>}
      {orders.loading ? <Loading label="Carregando pedidos…"/> : orders.error ? <ErrorState message={orders.error} retry={orders.reload}/> : !rows.length ? <Empty title={mine ? "Nenhum pedido aguarda sua decisão" : filtered ? "Nenhum pedido encontrado" : "Sua próxima compra começa aqui"} action={filtered ? <button className="button secondary" onClick={reset}>Limpar filtros</button> : <Link className="button primary" href="/orders/new">Criar primeiro pedido</Link>}>{mine ? "Quando chegar a sua etapa de aprovação, o pedido aparecerá nesta fila." : filtered ? "Tente alterar os filtros para encontrar o que procura." : "Cadastre um pedido para acompanhar sua aprovação por aqui."}</Empty> : <div className="table-scroll"><table className="orders-table"><thead><tr><th>Pedido / Obra</th><th>Fornecedor / Emissão</th><th>Valor total</th><th>Situação</th><th>Alçada de aprovação</th><th><span className="sr-only">Abrir</span></th></tr></thead><tbody>{rows.map(order => <tr key={order.id}><td data-label="Pedido / Obra"><Link className="order-id" href={`/orders/${order.id}`}>{shortId(order.id)}</Link><span className="table-secondary">{order.project.name}</span></td><td data-label="Fornecedor / Emissão"><span className="supplier-name">{order.supplier.name}</span><span className="table-secondary">{dateLabel(order.orderDate)} · {order.itemCount} {order.itemCount === 1 ? "item" : "itens"}</span></td><td data-label="Valor total"><strong className="table-money">{money(order.total)}</strong></td><td data-label="Situação"><span className={`status ${order.status.toLowerCase()}`}><span/>{statusLabels[order.status]}</span></td><td className="chain-cell" data-label="Alçada"><Chain steps={order.approval.steps}/></td><td className="row-action"><Link className="icon-button" href={`/orders/${order.id}`} aria-label={`Ver detalhes do pedido ${shortId(order.id)}`}><Icon name="arrow" size={18}/></Link></td></tr>)}</tbody></table></div>}
      {orders.data && orders.data.pagination.total > 0 && <div className="pagination"><span>{(page - 1) * 10 + (rows.length ? 1 : 0)}–{(page - 1) * 10 + rows.length} de {orders.data.pagination.total} pedidos</span><div><button className="button secondary small" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button><span>Página {page}</span><button className="button secondary small" disabled={page >= orders.data.pagination.totalPages} onClick={() => setPage(value => value + 1)}>Próxima</button></div></div>}
    </section><div className="quiet-note"><Icon name="shield" size={16}/> Cada decisão segue a alçada definida para a obra e fica registrada no histórico do pedido.</div>
  </>;
}

