"use client";
import { useEffect, useState } from "react";
import { api, brl, btn, card, inp, toCents, Async, Empty, useApi } from "@/lib/ui";

type Opt = { id: number; name: string };
type Rule = { upTo: number | null; approvers: number[] };
type Row = { key: number; upTo: string; approvers: number[] };

const parse = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
const iconBtn = "rounded p-1.5 text-muted hover:bg-line disabled:opacity-30";

export default function RulesPage() {
  const sites = useApi<Opt[]>("/sites");
  const users = useApi<Opt[]>("/users");
  const [siteId, setSiteId] = useState("");
  const rules = useApi<Rule[]>(siteId ? `/sites/${siteId}/rules` : null);
  const [rows, setRows] = useState<Row[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (sites.data?.length && !siteId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSiteId(String(sites.data[0].id));
    }
  }, [sites.data, siteId]);
  useEffect(() => {
    if (!rules.data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRows(rules.data.map((r, i) => ({ key: i + 1, upTo: r.upTo === null ? "" : String(r.upTo / 100).replace(".", ","), approvers: r.approvers })));
    setDirty(false);
  }, [rules.data]);

  const name = (id: number) => users.data?.find((u) => u.id === id)?.name ?? `Usuário ${id}`;
  const limits = rows.map((r) => parse(r.upTo));
  const finite = limits.filter((l): l is number => l !== null);
  const problems: string[] = [];
  if (finite.some((l) => !(l > 0))) problems.push("Cada limite precisa ser um valor maior que zero.");
  if (limits.filter((l) => l === null).length > 1) problems.push("Só uma faixa pode ficar sem limite (a última).");
  if (new Set(finite).size !== finite.length) problems.push("Duas faixas não podem ter o mesmo limite.");
  if (rows.some((r) => r.approvers.length === 0)) problems.push("Toda faixa precisa de ao menos um aprovador.");
  const openEnded = limits.includes(null);

  const sorted = [...rows].sort((a, b) => (parse(a.upTo) ?? Infinity) - (parse(b.upTo) ?? Infinity));
  const label = (i: number) => {
    const up = parse(sorted[i].upTo), prev = i > 0 ? parse(sorted[i - 1].upTo) : null;
    if (up !== null && Number.isNaN(up)) return "Informe o limite";
    if (up === null) return i === 0 ? "Qualquer valor" : `Acima de ${brl((prev ?? 0) * 100)}`;
    return i === 0 ? `Até ${brl(up * 100)}` : `Acima de ${brl((prev ?? 0) * 100)} até ${brl(up * 100)}`;
  };

  const upd = (key: number, f: (r: Row) => Row) => { setRows((rs) => rs.map((r) => (r.key === key ? f(r) : r))); setDirty(true); setMsg(null); };
  const move = (key: number, idx: number, dir: number) =>
    upd(key, (r) => {
      const a = [...r.approvers], j = idx + dir;
      if (j < 0 || j >= a.length) return r;
      [a[idx], a[j]] = [a[j], a[idx]];
      return { ...r, approvers: a };
    });
  const addRow = () => { setRows((rs) => [...rs, { key: Math.max(0, ...rs.map((r) => r.key)) + 1, upTo: "", approvers: [] }]); setDirty(true); setMsg(null); };

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await api(`/sites/${siteId}/rules`, {
        method: "PUT",
        body: JSON.stringify(rows.map((r) => ({ upTo: parse(r.upTo) === null ? null : toCents(r.upTo), approvers: r.approvers }))),
      });
      setMsg({ ok: true, text: "Regras salvas. Valem para os próximos pedidos desta obra; pedidos já criados mantêm a cadeia original." });
      await rules.reload();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Regras de alçada</h1>
          <p className="mt-1 text-muted">Defina por obra quem aprova, e em que ordem, conforme o valor total do pedido.</p>
        </div>
        <label className="block w-full sm:w-64">
          <span className="mb-1.5 block text-sm font-medium">Obra</span>
          <select className={inp} value={siteId} onChange={(e) => { if (!dirty || confirm("Descartar alterações não salvas?")) setSiteId(e.target.value); }}>
            {sites.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>

      <Async loading={sites.loading || users.loading || (!!siteId && rules.loading && !rules.data)}
        error={sites.error || users.error || rules.error}
        onRetry={() => { sites.reload(); users.reload(); rules.reload(); }}>
        {!sites.data?.length ? (
          <Empty title="Nenhuma obra cadastrada" hint="Cadastre uma obra (ou carregue os dados de demonstração) para configurar a alçada." />
        ) : rows.length === 0 ? (
          <Empty title="Esta obra ainda não tem alçada" hint="Sem regra, pedidos desta obra não podem ser enviados. Crie a primeira faixa de valor.">
            <button className={btn.dark} onClick={addRow}>Criar primeira faixa</button>
          </Empty>
        ) : (
          <>
            <ul className="space-y-4">
              {sorted.map((r, i) => (
                <li key={r.key} className={`${card} p-5`}>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <p className="text-lg font-semibold text-plum">{label(i)}</p>
                    <label className="block w-full sm:w-56">
                      <span className="mb-1.5 block text-sm font-medium">Limite da faixa (R$)</span>
                      <input className={inp} inputMode="decimal" placeholder="Vazio = sem limite" value={r.upTo}
                        onChange={(e) => upd(r.key, (x) => ({ ...x, upTo: e.target.value }))} />
                    </label>
                  </div>
                  <ol className="mt-4 space-y-2">
                    {r.approvers.map((id, idx) => (
                      <li key={id} className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-sm">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-plum text-xs font-semibold text-white">{idx + 1}</span>
                        <span className="flex-1">{name(id)}</span>
                        <button aria-label={`Subir ${name(id)}`} className={iconBtn} disabled={idx === 0} onClick={() => move(r.key, idx, -1)}>↑</button>
                        <button aria-label={`Descer ${name(id)}`} className={iconBtn} disabled={idx === r.approvers.length - 1} onClick={() => move(r.key, idx, 1)}>↓</button>
                        <button aria-label={`Remover ${name(id)}`} className={iconBtn} onClick={() => upd(r.key, (x) => ({ ...x, approvers: x.approvers.filter((a) => a !== id) }))}>×</button>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <select aria-label="Adicionar aprovador" className={`${inp} sm:w-72`} value=""
                      onChange={(e) => e.target.value && upd(r.key, (x) => ({ ...x, approvers: [...x.approvers, Number(e.target.value)] }))}>
                      <option value="">Adicionar aprovador…</option>
                      {users.data?.filter((u) => !r.approvers.includes(u.id)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <button className={btn.ghost} onClick={() => { setRows((rs) => rs.filter((x) => x.key !== r.key)); setDirty(true); setMsg(null); }}>
                      Remover faixa
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <button className={`${btn.ghost} mt-4`} onClick={addRow}>Adicionar faixa</button>

            {!openEnded && (
              <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                Nenhuma faixa está sem limite: pedidos acima da última faixa ficarão sem regra e serão bloqueados no cadastro.
              </p>
            )}
            {problems.length > 0 && (
              <ul role="alert" className="mt-4 list-disc space-y-1 rounded-lg bg-rose-soft p-3 pl-7 text-sm text-rose">
                {problems.map((p) => <li key={p}>{p}</li>)}
              </ul>
            )}
            {msg && <p role="status" className={`mt-4 rounded-lg p-3 text-sm ${msg.ok ? "bg-green-50 text-ok" : "bg-rose-soft text-rose"}`}>{msg.text}</p>}

            <div className="sticky bottom-4 mt-6 flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 p-4 shadow-lg backdrop-blur">
              <p className="text-sm text-muted">{dirty ? "Você tem alterações não salvas." : "Tudo salvo."}</p>
              <button className={btn.rose} disabled={!dirty || problems.length > 0 || saving} onClick={save}>
                {saving ? "Salvando…" : "Salvar regras"}
              </button>
            </div>
          </>
        )}
      </Async>
    </>
  );
}
