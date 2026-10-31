"use client";
import Link from "next/link";
import { useState } from "react";
import { api, brl, btn, card, inp, Async, Empty, Field, StatusBadge, useApi, useUid } from "@/lib/ui";

type Status = "PENDING" | "APPROVED" | "REJECTED";
type Step = {
  stepOrder: number; status: "WAITING" | "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";
  decidedAt: string | null; reason: string | null; approver: { id: number; name: string };
};
type Order = {
  id: number; createdAt: string; orderDate: string; notes: string | null; totalCents: number; status: Status;
  site: { name: string }; supplier: { name: string }; steps: Step[];
  items: { description: string; quantity: string | number; unit: string; unitPriceCents: number; totalCents: number }[];
};

const code = (id: number) => `PC-${String(id).padStart(4, "0")}`;
const day = (d: string) => new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC" });
const when = (d: string) => new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

/* null = o usuário pode decidir; texto = motivo de estar desabilitado */
function gate(o: Order, uid: number) {
  if (o.status === "APPROVED") return "Cadeia de aprovação concluída: não há mais decisões a tomar.";
  if (o.status === "REJECTED") return "Pedido rejeitado: o fluxo foi encerrado.";
  const cur = o.steps.find((s) => s.status === "PENDING");
  if (cur && cur.approver.id !== uid) return `Aguardando ${cur.approver.name}. Você decide quando for a sua vez.`;
  return null;
}

const DOT: Record<Step["status"], string> = {
  APPROVED: "border-green-200 bg-green-100 text-ok",
  PENDING: "border-rose bg-rose-soft font-semibold text-rose",
  REJECTED: "border-rose bg-rose text-white",
  WAITING: "border-line bg-white text-muted",
  SKIPPED: "border-line bg-white text-muted/50 line-through",
};
const MARK: Record<Step["status"], string> = { APPROVED: "✓ ", REJECTED: "✕ ", PENDING: "", WAITING: "", SKIPPED: "" };

function Chain({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label="Cadeia de aprovação">
      {steps.map((s, i) => (
        <li key={s.stepOrder} className="flex items-center gap-1.5">
          <span className={`rounded-full border px-2.5 py-1 text-xs ${DOT[s.status]}`}>{MARK[s.status]}{s.approver.name}</span>
          {i < steps.length - 1 && <span aria-hidden className="h-px w-3 bg-line" />}
        </li>
      ))}
    </ol>
  );
}

export default function ApprovalsPage() {
  const uid = useUid();
  const { data, loading, error, reload } = useApi<Order[]>("/orders");
  const [filter, setFilter] = useState<"ALL" | Status>("ALL");
  const [open, setOpen] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<Order | null>(null);
  const [reason, setReason] = useState("");
  const [reasonErr, setReasonErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const orders = data ?? [];
  const mine = orders.filter((o) => o.status === "PENDING" && !gate(o, uid));
  const shown = filter === "ALL" ? orders : orders.filter((o) => o.status === filter);
  const current = orders.find((o) => o.id === open);

  async function decide(o: Order, kind: "approve" | "reject", body: object = {}) {
    setBusy(true);
    setActionError(null);
    try {
      await api(`/orders/${o.id}/${kind}`, { method: "POST", body: JSON.stringify(body) });
      setRejecting(null);
      setReason("");
      await reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function confirmReject() {
    if (!reason.trim()) { setReasonErr(true); return; }
    decide(rejecting!, "reject", { reason: reason.trim() });
  }

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Aprovações</h1>
      <p className="mb-6 mt-1 text-muted">Cada pedido avança na ordem da alçada: só decide quem está na vez.</p>

      <Async loading={loading} error={error} onRetry={reload}>
        {mine.length > 0 ? (
          <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose/30 bg-gradient-to-r from-rose-soft to-white p-5">
            <div>
              <p className="text-lg font-semibold text-plum">
                {mine.length} {mine.length === 1 ? "autorização aguarda" : "autorizações aguardam"} sua decisão
              </p>
              <p className="text-sm text-muted">{brl(mine.reduce((s, o) => s + o.totalCents, 0))} aguardando liberação</p>
            </div>
            <button className={btn.rose} onClick={() => { setFilter("PENDING"); setOpen(mine[mine.length - 1].id); }}>
              Decidir agora
            </button>
          </section>
        ) : (
          <p className="mb-6 rounded-2xl border border-line bg-white p-4 text-sm text-muted">Nenhuma decisão aguardando você neste momento.</p>
        )}

        {actionError && <p role="alert" className="mb-4 rounded-lg bg-rose-soft p-3 text-sm text-rose">{actionError}</p>}

        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por situação">
          {([["ALL", "Todos"], ["PENDING", "Pendentes"], ["APPROVED", "Aprovados"], ["REJECTED", "Rejeitados"]] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
              className={`rounded-full border px-3.5 py-1.5 text-sm ${filter === k ? "border-night bg-night text-white" : "border-line bg-white text-muted hover:text-ink"}`}>
              {l}
            </button>
          ))}
        </div>

        {orders.length === 0 ? (
          <Empty title="Nenhum pedido ainda" hint="Os pedidos cadastrados aparecem aqui com a alçada em andamento.">
            <Link href="/pedidos/novo" className={btn.dark}>Cadastrar pedido</Link>
          </Empty>
        ) : shown.length === 0 ? (
          <Empty title="Nenhum pedido nesta situação" hint="Escolha outro filtro para ver os demais pedidos." />
        ) : (
          <ul className="space-y-3">
            {shown.map((o) => {
              const why = gate(o, uid);
              return (
                <li key={o.id} className={`${card} p-4 sm:p-5`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{code(o.id)} <span className="font-normal text-muted">{o.site.name}</span></p>
                      <p className="truncate text-sm text-muted">{o.supplier.name}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                      <span className="text-muted">{day(o.orderDate)}</span>
                      <span className="text-muted">{o.items.length} {o.items.length === 1 ? "item" : "itens"}</span>
                      <span className="text-base font-semibold tabular-nums">{brl(o.totalCents)}</span>
                      <StatusBadge status={o.status} />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                    <div>
                      <Chain steps={o.steps} />
                      {why && <p className="mt-2 text-xs text-muted">{why}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button className={btn.ghost} onClick={() => setOpen(o.id)}>Detalhes</button>
                      <button className={btn.ghost} disabled={!!why || busy} title={why ?? undefined}
                        onClick={() => { setRejecting(o); setReason(""); setReasonErr(false); }}>Rejeitar</button>
                      <button className={btn.dark} disabled={!!why || busy} title={why ?? undefined}
                        onClick={() => decide(o, "approve")}>Aprovar</button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Async>

      {current && (
        <div className="fixed inset-0 z-40 flex justify-end bg-night/40" onClick={() => setOpen(null)}>
          <aside role="dialog" aria-modal="true" aria-label={`Detalhes de ${code(current.id)}`}
            className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{code(current.id)}</h2>
                <p className="text-sm text-muted">{current.site.name} · {current.supplier.name}</p>
              </div>
              <button aria-label="Fechar" className="rounded-lg px-2 text-2xl text-muted hover:bg-line" onClick={() => setOpen(null)}>×</button>
            </div>
            {current.notes && <p className="mt-4 rounded-lg bg-paper p-3 text-sm">{current.notes}</p>}

            <h3 className="mb-2 mt-6 font-semibold">Itens</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr><th className="py-2 pr-2 font-medium">Descrição</th><th className="px-2 font-medium">Qtd.</th><th className="px-2 font-medium">Un.</th><th className="px-2 text-right font-medium">Preço unit.</th><th className="pl-2 text-right font-medium">Total</th></tr>
                </thead>
                <tbody>
                  {current.items.map((it, i) => (
                    <tr key={i} className="border-t border-line tabular-nums">
                      <td className="py-2 pr-2 font-sans">{it.description}</td><td className="px-2">{it.quantity}</td><td className="px-2">{it.unit}</td>
                      <td className="px-2 text-right">{brl(it.unitPriceCents)}</td><td className="pl-2 text-right font-semibold">{brl(it.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t border-line"><td colSpan={4} className="py-2 text-right text-muted">Total do pedido</td><td className="py-2 text-right font-semibold tabular-nums">{brl(current.totalCents)}</td></tr></tfoot>
              </table>
            </div>

            <h3 className="mb-3 mt-6 font-semibold">Histórico</h3>
            <ul className="space-y-3 border-l border-line pl-4 text-sm">
              <li><p className="font-medium">Pedido criado</p><p className="text-xs text-muted">{when(current.createdAt)}</p></li>
              {current.steps.map((s) => (
                <li key={s.stepOrder}>
                  {s.decidedAt ? (
                    <>
                      <p className="font-medium">{s.approver.name} {s.status === "APPROVED" ? "aprovou" : "rejeitou"}</p>
                      <p className="text-xs text-muted">{when(s.decidedAt)}</p>
                      {s.reason && <p className="mt-1 rounded-lg bg-rose-soft p-2 text-rose">Motivo: {s.reason}</p>}
                    </>
                  ) : s.status === "PENDING" ? (
                    <p className="font-medium text-rose">Aguardando {s.approver.name}</p>
                  ) : (
                    <p className="text-muted">{s.status === "SKIPPED" ? `${s.approver.name} (não chegou a decidir)` : `Depois: ${s.approver.name}`}</p>
                  )}
                </li>
              ))}
            </ul>
            {gate(current, uid) && <p className="mt-6 rounded-lg bg-paper p-3 text-sm text-muted">{gate(current, uid)}</p>}
          </aside>
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-night/50 p-4">
          <div role="dialog" aria-modal="true" aria-label="Rejeitar pedido" className={`${card} w-full max-w-md p-6`}>
            <h2 className="text-lg font-semibold">Rejeitar {code(rejecting.id)}</h2>
            <p className="mt-1 text-sm text-muted">A rejeição encerra o fluxo na hora. O motivo fica registrado no histórico.</p>
            <Field label="Motivo da rejeição" className="mt-4" error={reasonErr && "Informe o motivo para rejeitar o pedido."}>
              <textarea className={inp} rows={3} autoFocus value={reason}
                onChange={(e) => { setReason(e.target.value); setReasonErr(false); }} />
            </Field>
            <div className="mt-5 flex justify-end gap-2">
              <button className={btn.ghost} onClick={() => setRejecting(null)}>Cancelar</button>
              <button className={btn.rose} disabled={busy} onClick={confirmReject}>Rejeitar pedido</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
