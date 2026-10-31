"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { api, brl, btn, card, inp, toCents, Async, Empty, Field, useApi } from "@/lib/ui";

type Opt = { id: number; name: string };
type Rule = { upTo: number | null; approvers: number[] };
type Item = { key: number; description: string; quantity: string; unit: string; price: string };

const UNITS = ["un", "kg", "m", "m²", "m³", "h", "l"];
const COLS = "md:grid-cols-[minmax(0,1fr)_88px_84px_120px_120px_36px]";
const num = (v: string) => (v.trim() === "" ? NaN : Number(v.replace(",", ".")));
const blank = (key: number): Item => ({ key, description: "", quantity: "", unit: "un", price: "" });
const lineCents = (i: Item) => {
  const q = num(i.quantity), p = num(i.price);
  return q > 0 && p >= 0 ? Math.round(q * Math.round(p * 100)) : 0;
};

export default function NewOrderPage() {
  const sites = useApi<Opt[]>("/sites");
  const suppliers = useApi<Opt[]>("/suppliers");
  const users = useApi<Opt[]>("/users");
  const [siteId, setSiteId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([blank(1)]);
  const [nextKey, setNextKey] = useState(2);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [created, setCreated] = useState<number | null>(null);
  const rules = useApi<Rule[]>(siteId ? `/sites/${siteId}/rules` : null);

  const total = items.reduce((s, i) => s + lineCents(i), 0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate(new Date().toISOString().slice(0, 10));
  }, []);

  const rule = useMemo(
    () => [...(rules.data ?? [])]
      .sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity))
      .find((r) => r.upTo === null || total <= r.upTo),
    [rules.data, total],
  );
  const chain = (rule?.approvers ?? []).map((id) => users.data?.find((u) => u.id === id)?.name ?? `Usuário ${id}`);

  const errors: Record<string, string> = {};
  if (!siteId) errors.site = "Selecione a obra.";
  if (!supplierId) errors.supplier = "Selecione o fornecedor.";
  if (!date) errors.date = "Informe a data do pedido.";
  if (items.length === 0) errors.items = "Adicione ao menos um item ao pedido.";
  items.forEach((i) => {
    if (!i.description.trim()) errors[`${i.key}.d`] = "Descreva o material ou serviço.";
    if (!(num(i.quantity) > 0)) errors[`${i.key}.q`] = "Use um número maior que zero.";
    if (!(num(i.price) >= 0)) errors[`${i.key}.p`] = "Use um valor a partir de zero.";
  });
  const noRule = !!siteId && !rules.loading && !rules.error && !rule;
  const valid = Object.keys(errors).length === 0 && !!rule;

  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const err = (k: string) => (touched[k] ? errors[k] : undefined);
  const setItem = (key: number, patch: Partial<Item>) =>
    setItems((l) => l.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  async function submit() {
    setSaving(true);
    setServerError(null);
    try {
      const o = await api<{ id: number }>("/orders", {
        method: "POST",
        body: JSON.stringify({
          siteId: Number(siteId), supplierId: Number(supplierId), orderDate: date, notes: notes.trim() || null,
          items: items.map((i) => ({
            description: i.description.trim(), quantity: num(i.quantity), unit: i.unit, unitPriceCents: toCents(i.price),
          })),
        }),
      });
      setCreated(o.id);
    } catch (e) {
      setServerError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Novo pedido de compra</h1>
      <p className="mb-8 mt-1 text-muted">A alçada de aprovação é definida pelo total do pedido, não por cada item.</p>

      <Async
        loading={sites.loading || suppliers.loading}
        error={sites.error || suppliers.error}
        onRetry={() => { sites.reload(); suppliers.reload(); }}>
        {!sites.data?.length ? (
          <Empty title="Nenhuma obra cadastrada" hint="Cadastre uma obra (ou carregue os dados de demonstração) para criar pedidos de compra." />
        ) : created ? (
          <div className={`${card} p-8 text-center`}>
            <p className="text-xl font-semibold text-plum">Pedido PC-{String(created).padStart(4, "0")} cadastrado</p>
            <p className="mt-1 text-sm text-muted">Ele já entrou na fila de {chain[0] ?? "aprovação"}.</p>
            <div className="mt-5 flex justify-center gap-2">
              <Link href="/aprovacoes" className={btn.dark}>Ver aprovações</Link>
              <button className={btn.ghost} onClick={() => location.reload()}>Cadastrar outro pedido</button>
            </div>
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
              <section className={`${card} p-5 sm:p-6`}>
                <h2 className="mb-4 text-lg font-semibold">Dados gerais</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Obra" error={err("site")}>
                    <select className={inp} value={siteId} onBlur={() => touch("site")} onChange={(e) => setSiteId(e.target.value)}>
                      <option value="">Selecione…</option>
                      {sites.data.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Fornecedor" error={err("supplier")}>
                    <select className={inp} value={supplierId} onBlur={() => touch("supplier")} onChange={(e) => setSupplierId(e.target.value)}>
                      <option value="">Selecione…</option>
                      {suppliers.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Data do pedido" error={err("date")}>
                    <input type="date" className={inp} value={date} onBlur={() => touch("date")} onChange={(e) => setDate(e.target.value)} />
                  </Field>
                  <Field label="Observações internas (opcional)" className="sm:col-span-2">
                    <textarea className={inp} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                      placeholder="Justifique ou complemente a solicitação" />
                  </Field>
                </div>
              </section>

              <section className={card}>
                <div className="flex items-center justify-between p-5 sm:px-6">
                  <h2 className="text-lg font-semibold">Itens do pedido</h2>
                  <button className={btn.ghost}
                    onClick={() => { setItems((l) => [...l, blank(nextKey)]); setNextKey((k) => k + 1); }}>
                    Adicionar item
                  </button>
                </div>
                <div className={`hidden gap-3 border-t border-line px-6 py-2 text-xs font-medium text-muted md:grid ${COLS}`}>
                  <span>Descrição</span><span>Qtd.</span><span>Un.</span>
                  <span>Preço unit. (R$)</span><span className="text-right">Total</span><span />
                </div>
                {errors.items && touched.items !== false && items.length === 0 && (
                  <p role="alert" className="border-t border-line p-6 text-sm text-rose">{errors.items}</p>
                )}
                {items.map((i) => (
                  <div key={i.key} className={`grid gap-3 border-t border-line p-5 sm:px-6 md:items-start ${COLS}`}>
                    <Field label="Descrição" compact error={err(`${i.key}.d`)}>
                      <input className={inp} value={i.description} placeholder="Ex.: Cimento CP-II 50 kg"
                        onBlur={() => touch(`${i.key}.d`)} onChange={(e) => setItem(i.key, { description: e.target.value })} />
                    </Field>
                    <Field label="Quantidade" compact error={err(`${i.key}.q`)}>
                      <input className={inp} inputMode="decimal" value={i.quantity}
                        onBlur={() => touch(`${i.key}.q`)} onChange={(e) => setItem(i.key, { quantity: e.target.value })} />
                    </Field>
                    <Field label="Unidade" compact>
                      <select className={inp} value={i.unit} onChange={(e) => setItem(i.key, { unit: e.target.value })}>
                        {UNITS.map((u) => <option key={u}>{u}</option>)}
                      </select>
                    </Field>
                    <Field label="Preço unitário (R$)" compact error={err(`${i.key}.p`)}>
                      <input className={inp} inputMode="decimal" value={i.price} placeholder="0,00"
                        onBlur={() => touch(`${i.key}.p`)} onChange={(e) => setItem(i.key, { price: e.target.value })} />
                    </Field>
                    <div>
                      <span className="mb-1.5 block text-sm font-medium md:hidden">Total do item</span>
                      <p className="flex h-[42px] items-center text-sm font-semibold tabular-nums md:justify-end">{brl(lineCents(i))}</p>
                    </div>
                    <button aria-label="Remover item" className="h-[42px] rounded-lg text-xl text-muted hover:bg-line md:mt-0"
                      onClick={() => setItems((l) => l.filter((x) => x.key !== i.key))}>×</button>
                  </div>
                ))}
              </section>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24">
              <div className={`${card} p-5`}>
                <p className="text-sm text-muted">Total do pedido</p>
                <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">{brl(total)}</p>
                <p className="mt-1 text-sm text-muted">{items.length} {items.length === 1 ? "item" : "itens"}</p>
              </div>

              <div className={`${card} p-5`}>
                <p className="text-sm font-semibold">Quem vai aprovar</p>
                {!siteId ? <p className="mt-2 text-sm text-muted">Selecione a obra para ver a alçada.</p>
                  : rules.loading ? <p className="mt-2 text-sm text-muted">Calculando a alçada…</p>
                  : rules.error ? <p role="alert" className="mt-2 text-sm text-rose">{rules.error}. <button className="underline" onClick={rules.reload}>Tentar novamente</button></p>
                  : noRule ? (
                    <p role="alert" className="mt-2 text-sm text-rose">
                      Nenhuma regra de alçada cobre {brl(total)} nesta obra. O pedido não pode ser enviado até que uma faixa seja configurada em <Link href="/regras" className="underline">Regras de alçada</Link>.
                    </p>
                  ) : (
                    <ol className="mt-3 space-y-2">
                      {chain.map((n, idx) => (
                        <li key={idx} className="flex items-center gap-3 text-sm">
                          <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${idx === 0 ? "bg-rose text-white" : "bg-line text-muted"}`}>{idx + 1}</span>
                          {n}
                        </li>
                      ))}
                    </ol>
                  )}
              </div>

              <button className={`${btn.rose} w-full`} disabled={!valid || saving} onClick={submit}>
                {saving ? "Cadastrando…" : "Cadastrar pedido"}
              </button>
              {!valid && <p className="text-xs text-muted">O botão libera quando os dados gerais e todos os itens estiverem válidos.</p>}
              {serverError && <p role="alert" className="rounded-lg bg-rose-soft p-3 text-sm text-rose">{serverError}</p>}
            </aside>
          </div>
        )}
      </Async>
    </>
  );
}
