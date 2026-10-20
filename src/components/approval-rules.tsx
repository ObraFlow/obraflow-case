"use client";
import { useCallback, useEffect, useState } from "react";
import { ApiError, api, errorText, useData, useEntities } from "@/lib/client-api";
import { decimal, fixed, money, type Entity, type Rules } from "@/lib/ui-types";
import { useSession, useUnsaved } from "./app-shell";
import { Empty, ErrorState, FieldError, Icon, Loading, Modal } from "./ui";

interface DraftBand { upperLimit: string | null; approverIds: string[] }
function draftOf(rules: Rules): DraftBand[] { return rules.bands.map(band => ({ upperLimit: band.upperLimit?.replace(".", ",") ?? null, approverIds: band.approvers.map(person => person.id) })); }
function bandLabel(bands: DraftBand[], index: number): string {
  const current = bands[index].upperLimit;
  const previous = index > 0 ? bands[index - 1].upperLimit : null;
  const start = index === 0 ? "De zero" : `Acima de ${previous === null || decimal(previous, 2) === null ? "…" : money(decimal(previous, 2)!)}`;
  return current === null ? `${start}, sem teto` : `${start} até ${decimal(current, 2) === null ? "…" : money(decimal(current, 2)!)}`;
}
export function ApprovalRules() {
  const { actor } = useSession();
  const projects = useEntities("/projects", actor), users = useEntities("/users", actor);
  const [projectId, setProjectId] = useState("");
  const [dirty, setDirty] = useState(false);
  const [success, setSuccess] = useState(false);
  const rules = useData<{ data: Rules }>(projectId ? `/projects/${projectId}/approval-rules` : null, actor);
  const project = projects.data?.find(value => value.id === projectId);
  return <>
    <div className="page-heading"><div><div className="eyebrow">GOVERNANÇA DE COMPRAS</div><h1>Regras de alçada</h1><p>As pessoas certas, na ordem certa, para cada compra.</p></div><span className="subtle-label"><Icon name="rules" size={17}/> Configuração por obra</span></div>
    <section className="panel project-selector"><span className="section-icon"><Icon name="building"/></span><div><h2>Selecione a obra</h2><p>Cada obra possui suas próprias faixas e aprovadores.</p></div><label><span className="sr-only">Obra para configurar regras</span><select value={projectId} disabled={projects.loading} onChange={event => { if (!dirty || window.confirm("Descartar as alterações não salvas e trocar de obra?")) { setDirty(false); setProjectId(event.target.value); } }}><option value="">{projects.loading ? "Carregando obras…" : "Selecione uma obra"}</option>{projects.data?.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label></section>
    {success && <div className="notice success" role="status">Regras salvas com sucesso.</div>}
    {projects.error && <ErrorState message={projects.error} retry={projects.reload}/>}
    {users.error && <ErrorState message={users.error} retry={users.reload}/>}
    {!projects.loading && projects.data?.length === 0 ? <Empty title="Nenhuma obra disponível">É necessário cadastrar uma obra antes de configurar as alçadas.</Empty> : !projectId ? <section className="panel"><Empty title="Uma alçada para cada obra">Selecione uma obra para consultar e configurar o fluxo de aprovação.</Empty></section> : rules.loading || users.loading ? <section className="panel"><Loading label="Carregando configuração…"/></section> : rules.error ? <ErrorState message={rules.error} retry={rules.reload}/> : rules.data && users.data ? <RulesEditor key={`${actor}-${projectId}-${rules.data.data.version}`} initial={rules.data.data} users={users.data} projectName={project?.name ?? "Obra"} onSaved={() => { setSuccess(true); rules.reload(); }} onReload={rules.reload} onDirty={setDirty}/> : null}
  </>;
}
function RulesEditor({ initial, users, projectName, onSaved, onReload, onDirty }: { initial: Rules; users: Entity[]; projectName: string; onSaved: () => void; onReload: () => void; onDirty: (value: boolean) => void }) {
  const { actor, setActorGuard } = useSession();
  const [bands, setBands] = useState<DraftBand[]>(() => draftOf(initial));
  const [error, setError] = useState("");
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = !saved && JSON.stringify(bands) !== JSON.stringify(draftOf(initial));
  useUnsaved(dirty);
  useEffect(() => { onDirty(dirty); return () => onDirty(false); }, [dirty, onDirty]);
  useEffect(() => { setActorGuard(() => { if (busy) return false; return !dirty || window.confirm("Descartar as alterações não salvas e trocar de usuário?"); }); return () => setActorGuard(null); }, [busy, dirty, setActorGuard]);
  const close = useCallback(() => setConfirm(false), []);
  function update(next: DraftBand[]) { setBands(next); setError(""); setServerErrors({}); }
  const issues: Record<string, string> = {};
  let previous = -1n;
  bands.forEach((band, index) => {
    if (band.upperLimit === null) { if (index !== bands.length - 1) issues[`bands.${index}.upperLimit`] = "A faixa sem teto deve ser a última."; }
    else {
      const limit = decimal(band.upperLimit, 2);
      if (limit === null || limit > 10000000000n) issues[`bands.${index}.upperLimit`] = "Informe um teto de até R$ 100.000.000,00, com até 2 casas.";
      else if (limit <= previous) issues[`bands.${index}.upperLimit`] = "O teto deve ser maior que o da faixa anterior.";
      if (limit !== null) previous = limit;
    }
    if (!band.approverIds.length) issues[`bands.${index}.approverIds`] = "Adicione ao menos um aprovador.";
    if (band.approverIds.length > 10 || new Set(band.approverIds).size !== band.approverIds.length) issues[`bands.${index}.approverIds`] = "Use até 10 aprovadores distintos.";
  });
  const errors = { ...issues, ...serverErrors };
  async function save() {
    setBusy(true); setError("");
    try {
      await api(`/projects/${initial.projectId}/approval-rules`, actor, { method: "PUT", body: JSON.stringify({ expectedVersion: initial.version, bands: bands.map(band => ({ upperLimit: band.upperLimit === null ? null : fixed(decimal(band.upperLimit, 2)!, 2), approverIds: band.approverIds })) }) });
      setSaved(true); setConfirm(false); onSaved();
    } catch (issue) {
      setConfirm(false); setError(errorText(issue));
      if (issue instanceof ApiError) { setServerErrors(Object.fromEntries(issue.fields.map(value => [value.path, value.message]))); if (issue.code === "RULES_VERSION_CONFLICT") setConflict(true); }
    } finally { setBusy(false); }
  }
  return <>
    <div className="rules-title"><div><h2>Alçadas de {projectName}</h2><p>{bands.length} {bands.length === 1 ? "faixa configurada" : "faixas configuradas"} <span className="dot-separator">·</span> Versão salva {initial.version}</p></div>{dirty && <span className="draft-badge"><span/> Alterações não salvas</span>}</div>
    {saved && <div className="notice success" role="status">Regras salvas com sucesso.</div>}
    {error && <ErrorState message={error}/>}
    {conflict && <div className="notice warning"><strong>A configuração foi alterada em outra sessão.</strong><p>Seu rascunho foi preservado. Carregue a versão atual e revise as mudanças antes de salvar novamente.</p><button className="button secondary" onClick={() => { if (window.confirm("Descartar este rascunho e carregar a configuração atual?")) { setSaved(true); onReload(); } }}>Carregar configuração atual</button></div>}
    {!users.length && <div className="notice warning">Nenhum usuário disponível para compor as cadeias. Cadastre os usuários antes de salvar faixas.</div>}
    <div className="rules-layout"><div className="rules-main"><fieldset disabled={busy || conflict}>
      {!bands.length && <section className="panel"><Empty title="Nenhuma alçada configurada">Novos pedidos desta obra ficam bloqueados enquanto não houver uma faixa aplicável.</Empty></section>}
      {bands.map((band, index) => <section className="panel band-card" key={index}><div className="band-heading"><span className="section-number">{String(index + 1).padStart(2, "0")}</span><div><h3>Faixa de aprovação {index + 1}</h3><p>{bandLabel(bands, index)}</p></div><button className="icon-button danger-text" aria-label={`Remover faixa ${index + 1}`} onClick={() => update(bands.filter((_, position) => position !== index))}><Icon name="trash" size={18}/></button></div>
        <div className="band-body"><div className="band-limit"><label>Teto da faixa (R$)<input inputMode="decimal" value={band.upperLimit ?? ""} disabled={band.upperLimit === null} aria-invalid={!!errors[`bands.${index}.upperLimit`]} aria-describedby={`band-error-${index}`} placeholder="Ex.: 10.000,00 (digite 10000,00)" onChange={event => update(bands.map((value, position) => position === index ? { ...value, upperLimit: event.target.value } : value))}/><FieldError id={`band-error-${index}`} message={errors[`bands.${index}.upperLimit`]}/></label>{index === bands.length - 1 && <label className="checkbox-label"><input type="checkbox" checked={band.upperLimit === null} onChange={event => update(bands.map((value, position) => position === index ? { ...value, upperLimit: event.target.checked ? null : "" } : value))}/> Sem teto de valor</label>}<p className="field-hint">O limite superior está incluído nesta faixa.</p></div>
          <div className="band-approvers"><span className="label-text">Aprovadores na ordem do fluxo</span><ol className="approver-list">{band.approverIds.map((id, position) => <li key={id}><span className="approver-position">{position + 1}</span><strong>{users.find(user => user.id === id)?.name ?? "Usuário indisponível"}</strong><div className="reorder-controls"><button className="icon-button" disabled={position === 0} aria-label={`Mover ${users.find(user => user.id === id)?.name} acima na faixa ${index + 1}`} onClick={() => { const ids = [...band.approverIds]; [ids[position - 1], ids[position]] = [ids[position], ids[position - 1]]; update(bands.map((value, row) => row === index ? { ...value, approverIds: ids } : value)); }}>↑</button><button className="icon-button" disabled={position === band.approverIds.length - 1} aria-label={`Mover ${users.find(user => user.id === id)?.name} abaixo na faixa ${index + 1}`} onClick={() => { const ids = [...band.approverIds]; [ids[position], ids[position + 1]] = [ids[position + 1], ids[position]]; update(bands.map((value, row) => row === index ? { ...value, approverIds: ids } : value)); }}>↓</button><button className="icon-button danger-text" aria-label={`Remover ${users.find(user => user.id === id)?.name} da faixa ${index + 1}`} onClick={() => update(bands.map((value, row) => row === index ? { ...value, approverIds: value.approverIds.filter(person => person !== id) } : value))}><Icon name="close" size={15}/></button></div></li>)}</ol><label className="approver-select"><span className="sr-only">Adicionar aprovador à faixa {index + 1}</span><select value="" disabled={band.approverIds.length >= 10 || !users.some(user => !band.approverIds.includes(user.id))} onChange={event => update(bands.map((value, row) => row === index ? { ...value, approverIds: [...value.approverIds, event.target.value] } : value))}><option value="">+ Adicionar aprovador</option>{users.filter(user => !band.approverIds.includes(user.id)).map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><FieldError message={errors[`bands.${index}.approverIds`]}/></div></div></section>)}
      <button className="add-item-button" disabled={bands.length >= 20} onClick={() => { const next = [...bands]; const at = next.findIndex(value => value.upperLimit === null); next.splice(at >= 0 ? at : next.length, 0, { upperLimit: "", approverIds: [] }); update(next); }}><Icon name="plus" size={18}/> Adicionar faixa de aprovação</button>
    </fieldset></div><aside className="summary-column"><section className="panel summary-panel"><span className="eyebrow">PRÉVIA DA CONFIGURAÇÃO</span><h3 className="preview-title">Como os pedidos serão aprovados</h3><div className="rules-preview">{bands.length ? bands.map((band, index) => <div key={index}><span>{bandLabel(bands, index)}</span><strong>{band.approverIds.map(id => users.find(user => user.id === id)?.name ?? "?").join(" → ") || "Adicione os aprovadores"}</strong></div>) : <p>Nenhuma faixa. Novos pedidos ficarão bloqueados.</p>}</div><div className="notice"><Icon name="info" size={17}/><span>Pedidos já enviados mantêm a cadeia atribuída na criação.</span></div><button className="button primary full-width" disabled={!dirty || Object.keys(errors).length > 0 || busy || conflict} onClick={() => setConfirm(true)}><Icon name="check" size={17}/> Salvar regras</button>{Object.keys(errors).length > 0 && <p className="disabled-reason">Revise os limites e os aprovadores indicados antes de salvar.</p>}<button className="button secondary full-width" disabled={!dirty || busy} onClick={() => { if (window.confirm("Descartar todas as alterações deste rascunho?")) { setBands(draftOf(initial)); setError(""); setServerErrors({}); } }}>Descartar alterações</button><p className="field-hint">As alterações só entram em vigor após o salvamento completo.</p></section></aside></div>
    {confirm && <Modal title={bands.length ? "Salvar regras de alçada?" : "Remover todas as alçadas?"} onClose={close} busy={busy}><p className="modal-description">{projectName} · versão atual {initial.version}</p><div className={`notice ${!bands.length ? "warning" : ""}`}>{bands.length ? "As faixas e a ordem dos aprovadores exibidas na prévia passarão a valer para novos pedidos. Intervalos podem mudar após a remoção de uma faixa." : "Novos pedidos desta obra serão bloqueados por falta de alçada. Pedidos existentes continuam com suas cadeias."}</div><div className="modal-actions"><button className="button secondary" disabled={busy} onClick={close}>Revisar rascunho</button><button className="button primary" disabled={busy} onClick={() => void save()}>{busy ? "Salvando…" : "Confirmar e salvar"}</button></div></Modal>}
  </>;
}
