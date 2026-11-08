import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSites, useTierMutations, useTiers, useUsers } from '../api/hooks'
import type { Site, Tier, TierPayload, User } from '../api/types'
import { ApprovalChain } from '../components/ApprovalChain'
import { BudgetMeter, pct } from '../components/charts'
import { ConfirmDialog } from '../components/Dialog'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { EmptyState, ErrorState, ListSkeleton } from '../components/States'
import { useToast } from '../components/Toasts'
import { centsToInput, formatBRL, parseMoney, plural, tierRange } from '../lib/format'
import '../styles/rules.css'

// mesma regra do backend (domain/tiers.ts): menor teto que comporta o valor
const resolveTier = (tiers: Tier[], cents: number) => tiers.find((t) => t.upToCents === null || cents <= t.upToCents) ?? null

export function RulesPage() {
  const sites = useSites()
  const [params, setParams] = useSearchParams()
  const siteId = Number(params.get('obra')) || sites.data?.[0]?.id || null
  const site = sites.data?.find((s) => s.id === siteId) ?? null

  const head = (
    <header className="page-head">
      <h1>Regras de alçada</h1>
    </header>
  )

  if (sites.isPending)
    return (
      <>
        {head}
        <div className="panel">
          <ListSkeleton rows={3} label="Carregando obras…" />
        </div>
      </>
    )
  if (sites.isError)
    return (
      <>
        {head}
        <div className="panel">
          <ErrorState error={sites.error} onRetry={() => sites.refetch()} />
        </div>
      </>
    )
  if (!site)
    return (
      <>
        {head}
        <div className="panel">
          <EmptyState icon="layers" title="Nenhuma obra cadastrada">
            As regras de alçada são configuradas por obra. Cadastre uma obra (ou rode <code>npm run setup</code>) para começar.
          </EmptyState>
        </div>
      </>
    )

  return (
    <>
      {head}
      <SitePicker sites={sites.data} selectedId={site.id} onSelect={(id) => setParams({ obra: String(id) }, { replace: true })} />
      <SiteRules key={site.id} site={site} />
    </>
  )
}

// Obras como cards de seleção: o que importa para configurar (faixas, o que está em
// aprovação) e quanto do orçamento já foi usado.
function SitePicker({ sites, selectedId, onSelect }: { sites: Site[]; selectedId: number; onSelect: (id: number) => void }) {
  return (
    <div className="site-picker" role="radiogroup" aria-label="Obra">
      {sites.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={s.id === selectedId}
          className="site-card"
          onClick={() => onSelect(s.id)}
        >
          <span className="site-card-top">
            <span className="mono site-code">{s.code}</span>
            <span className={`site-pill ${s.tierCount === 0 ? 'is-empty' : ''}`}>
              {s.tierCount === 0 ? 'Sem regras' : plural(s.tierCount, 'faixa', 'faixas')}
            </span>
          </span>
          <strong className="site-card-name">{s.name}</strong>
          <span className="muted small">{s.city}</span>
          <BudgetMeter budget={s.budgetCents} approved={s.approvedCents} pending={s.pendingCents} />
          <span className="site-card-foot small">
            <span>
              <strong>{pct(s.approvedCents + s.pendingCents, s.budgetCents)}</strong> <span className="muted">do orçamento</span>
            </span>
            <span className="muted">{s.pendingCount > 0 ? plural(s.pendingCount, 'em aprovação', 'em aprovação') : 'nada pendente'}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

type Editing = { mode: 'new' } | { mode: 'edit'; id: number } | null

function SiteRules({ site }: { site: Site }) {
  const tiers = useTiers(site.id)
  const users = useUsers()
  const { create, update, remove } = useTierMutations(site.id)
  const toast = useToast()
  const [editing, setEditing] = useState<Editing>(null)
  const [deleting, setDeleting] = useState<Tier | null>(null)
  const [simulated, setSimulated] = useState<number | null>(null)

  const list = tiers.data ?? []
  const openTier = list.find((t) => t.upToCents === null)
  const highest = list.filter((t) => t.upToCents !== null).at(-1)
  const highlighted = simulated !== null ? resolveTier(list, simulated) : null

  async function save(payload: TierPayload) {
    if (editing?.mode === 'edit') await update.mutateAsync({ id: editing.id, ...payload })
    else await create.mutateAsync(payload)
    toast(editing?.mode === 'edit' ? 'Faixa atualizada.' : 'Faixa criada.')
    setEditing(null)
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toast('Faixa removida. Pedidos já criados mantêm a cadeia original.')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível remover.', 'error')
    }
    setDeleting(null)
  }

  return (
    <div className="rules-layout">
      <section className="panel" aria-labelledby="tiers-title">
        <div className="panel-head">
          <div>
            <h2 id="tiers-title">Faixas de {site.code}</h2>
            <p className="muted small">O pedido cai na faixa de menor limite que comporta o total e segue os aprovadores na ordem.</p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setEditing({ mode: 'new' })}
            disabled={editing !== null || !tiers.data}
          >
            <Icon name="plus" /> Nova faixa
          </button>
        </div>

        {tiers.isPending ? (
          <ListSkeleton rows={3} label="Carregando faixas…" />
        ) : tiers.isError ? (
          <ErrorState error={tiers.error} onRetry={() => tiers.refetch()} />
        ) : (
          <>
            {list.length > 0 && !openTier && highest && (
              <div className="notice notice-warn coverage">
                <Icon name="alert" />
                <span>
                  Acima de <strong className="money">{formatBRL(highest.upToCents!)}</strong> não há regra: pedidos nesse valor são{' '}
                  <strong>bloqueados</strong> no envio. Crie uma faixa “sem limite” se quiser cobrir esses casos.
                </span>
              </div>
            )}

            {list.length === 0 && editing?.mode !== 'new' && (
              <EmptyState
                icon="layers"
                title="Esta obra ainda não tem faixas"
                action={
                  <button type="button" className="btn btn-primary" onClick={() => setEditing({ mode: 'new' })}>
                    <Icon name="plus" /> Criar primeira faixa
                  </button>
                }
              >
                Enquanto não houver uma faixa, nenhum pedido de {site.code} pode ser enviado: o sistema não sabe quem deve aprovar.
              </EmptyState>
            )}

            <ol className="tiers">
              {list.map((t, i) =>
                editing?.mode === 'edit' && editing.id === t.id ? (
                  <li key={t.id}>
                    <TierEditor initial={t} tiers={list} users={users.data ?? []} onSave={save} onCancel={() => setEditing(null)} />
                  </li>
                ) : (
                  <li key={t.id} className="tier" data-highlight={highlighted?.id === t.id || undefined}>
                    <span className="tier-level mono">N{i + 1}</span>
                    <div className="tier-range">
                      <span className="money">{tierRange(t)}</span>
                      <span className="muted small">
                        {t.upToCents === null ? 'sem limite superior · ' : ''}
                        {t.approvers.length === 1 ? 'uma aprovação' : `${t.approvers.length} aprovações em sequência`}
                      </span>
                    </div>
                    <div className="tier-chain">
                      <ApprovalChain steps={t.approvers.map((a) => ({ approver: a, status: 'WAITING' }))} />
                    </div>
                    <div className="tier-actions">
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={editing !== null}
                        onClick={() => setEditing({ mode: 'edit', id: t.id })}
                      >
                        <Icon name="edit" /> Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost btn-icon danger-hover"
                        disabled={editing !== null}
                        onClick={() => setDeleting(t)}
                        aria-label={`Remover faixa ${tierRange(t)}`}
                        title="Remover faixa"
                      >
                        <Icon name="trash" />
                      </button>
                    </div>
                  </li>
                ),
              )}
              {editing?.mode === 'new' && (
                <li>
                  <TierEditor tiers={list} users={users.data ?? []} onSave={save} onCancel={() => setEditing(null)} />
                </li>
              )}
            </ol>
          </>
        )}
      </section>

      <aside className="rules-side">
        <Simulator tiers={list} onChange={setSimulated} disabled={!tiers.data} />
        <UsersPanel users={users} />
      </aside>

      <ConfirmDialog
        open={deleting !== null}
        title="Remover esta faixa?"
        confirmLabel="Remover faixa"
        danger
        busy={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      >
        {deleting && <DeleteConsequence tier={deleting} tiers={list} />}
      </ConfirmDialog>
    </div>
  )
}

function DeleteConsequence({ tier, tiers }: { tier: Tier; tiers: Tier[] }) {
  const rest = tiers.filter((t) => t.id !== tier.id)
  const fallback = tier.upToCents === null ? null : resolveTier(rest, tier.upToCents)
  return (
    <p>
      <strong className="money">{tierRange(tier)}</strong>.{' '}
      {fallback
        ? `Novos pedidos nesse valor passam a seguir a faixa de ${fallback.approvers.map((a) => a.name.split(' ')[0]).join(' → ')}.`
        : 'Novos pedidos nesse valor ficarão sem regra e serão bloqueados.'}{' '}
      Pedidos já criados não mudam.
    </p>
  )
}

function TierEditor(props: {
  initial?: Tier
  tiers: Tier[]
  users: User[]
  onSave: (p: TierPayload) => Promise<void>
  onCancel: () => void
}) {
  const { initial, tiers, users } = props
  const others = tiers.filter((t) => t.id !== initial?.id)
  const otherOpen = others.some((t) => t.upToCents === null)

  const [open, setOpen] = useState(initial ? initial.upToCents === null : false)
  const [limit, setLimit] = useState(initial?.upToCents ? centsToInput(initial.upToCents) : '')
  const [approvers, setApprovers] = useState<number[]>(initial?.approvers.map((a) => a.id) ?? [])
  const [tried, setTried] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const limitCents = parseMoney(limit)
  const limitError = open
    ? null
    : !limit.trim()
      ? 'Informe o limite da faixa.'
      : limitCents === null
        ? 'Valor inválido. Use o formato 10.000,00.'
        : limitCents <= 0
          ? 'O limite precisa ser maior que zero.'
          : others.some((t) => t.upToCents === limitCents)
            ? 'Já existe uma faixa com esse limite.'
            : null
  const approversError = approvers.length === 0 ? 'Adicione pelo menos um aprovador.' : null
  const valid = !limitError && !approversError

  // de onde até onde esta faixa vai valer, considerando as outras
  const range = useMemo(() => {
    const upTo = open ? null : limitCents
    if (!open && (limitCents === null || limitCents <= 0)) return null
    const below = others.filter((t) => t.upToCents !== null && (upTo === null || t.upToCents < upTo)).map((t) => t.upToCents!)
    const from = below.length ? Math.max(...below) + 1 : 0
    return tierRange({ fromCents: from, upToCents: upTo })
  }, [open, limitCents, others])

  const byId = new Map(users.map((u) => [u.id, u]))
  const available = users.filter((u) => !approvers.includes(u.id))

  function move(index: number, delta: number) {
    setApprovers((list) => {
      const next = [...list]
      const [item] = next.splice(index, 1)
      next.splice(index + delta, 0, item)
      return next
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setTried(true)
    if (!valid) return
    setSaving(true)
    setServerError(null)
    try {
      await props.onSave({ upToCents: open ? null : limitCents, approverIds: approvers })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Não foi possível salvar.')
      setSaving(false)
    }
  }

  const titleId = `editor-${initial?.id ?? 'new'}`

  return (
    <form className="tier-editor" onSubmit={submit} noValidate aria-labelledby={titleId}>
      <h3 id={titleId}>{initial ? 'Editar faixa' : 'Nova faixa'}</h3>

      <div className="editor-grid">
        <fieldset className="editor-limit">
          <legend className="field-label">Limite de valor</legend>
          <label className="check">
            <input type="checkbox" checked={open} disabled={otherOpen && !open} onChange={(e) => setOpen(e.target.checked)} />
            Sem limite superior (faixa “acima de”)
          </label>
          {otherOpen && !open && <span className="field-hint">Esta obra já tem uma faixa sem limite.</span>}
          {!open && (
            <div className="field">
              <label htmlFor={`${titleId}-limit`}>Até (R$, inclusive)</label>
              <input
                id={`${titleId}-limit`}
                className="input num"
                inputMode="decimal"
                placeholder="10.000,00"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                onBlur={() => limit && setTried(true)}
                aria-invalid={tried && !!limitError}
                aria-describedby={`${titleId}-limit-msg`}
              />
              <span id={`${titleId}-limit-msg`} className={tried && limitError ? 'field-error' : 'field-hint'}>
                {tried && limitError ? limitError : range ? `Vai valer para pedidos ${rangePhrase(range)}.` : ' '}
              </span>
            </div>
          )}
          {open && range && <span className="field-hint">Vai valer para pedidos {rangePhrase(range)}.</span>}
        </fieldset>

        <fieldset className="editor-approvers">
          <legend className="field-label">Aprovadores, na ordem do fluxo</legend>
          {approvers.length === 0 ? (
            <p className={tried ? 'field-error' : 'field-hint'}>
              {tried ? approversError : 'Escolha abaixo quem aprova, começando pelo primeiro.'}
            </p>
          ) : (
            <ol className="approver-list">
              {approvers.map((id, i) => {
                const u = byId.get(id)
                return (
                  <li key={id}>
                    <span className="approver-pos mono">{i + 1}</span>
                    <span className="approver-name">
                      {u?.name ?? `Usuário ${id}`}
                      <span className="muted small"> {u?.role}</span>
                    </span>
                    <span className="approver-tools">
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        aria-label={`Subir ${u?.name}`}
                      >
                        <Icon name="up" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        disabled={i === approvers.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label={`Descer ${u?.name}`}
                      >
                        <Icon name="down" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon danger-hover"
                        onClick={() => setApprovers((l) => l.filter((x) => x !== id))}
                        aria-label={`Tirar ${u?.name} da faixa`}
                      >
                        <Icon name="x" />
                      </button>
                    </span>
                  </li>
                )
              })}
            </ol>
          )}

          {available.length > 0 && (
            <div className="add-approver">
              <span className="field-hint">Adicionar ao fim da cadeia:</span>
              <div className="user-chips">
                {available.map((u) => (
                  <button key={u.id} type="button" className="user-chip" onClick={() => setApprovers((l) => [...l, u.id])} title={u.role}>
                    <Icon name="plus" size={12} /> {u.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </fieldset>
      </div>

      {serverError && (
        <div className="notice notice-danger" role="alert">
          <Icon name="alert" />
          <span>{serverError}</span>
        </div>
      )}

      <div className="editor-actions">
        <button type="button" className="btn" onClick={props.onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Salvando…' : initial ? 'Salvar faixa' : 'Criar faixa'}
        </button>
      </div>
    </form>
  )
}

// "Até R$ 10,00" -> "até R$ 10,00"; "R$ 1,00 a R$ 2,00" -> "de R$ 1,00 a R$ 2,00"
const rangePhrase = (range: string) => (range.startsWith('R$') ? `de ${range}` : range.charAt(0).toLowerCase() + range.slice(1))

function Simulator({ tiers, onChange, disabled }: { tiers: Tier[]; onChange: (cents: number | null) => void; disabled: boolean }) {
  const [value, setValue] = useState('')
  const cents = parseMoney(value)
  const tier = cents !== null ? resolveTier(tiers, cents) : null

  useEffect(() => onChange(cents), [cents, onChange])

  return (
    <section className="panel side-box" aria-labelledby="sim-title">
      <h2 id="sim-title" className="side-title">
        Simular um pedido
      </h2>
      <div className="field">
        <label htmlFor="sim-value">Total do pedido (R$)</label>
        <input
          id="sim-value"
          className="input num"
          inputMode="decimal"
          placeholder="12.500,00"
          disabled={disabled}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      {value.trim() !== '' &&
        (cents === null ? (
          <p className="field-error">Valor inválido.</p>
        ) : tier ? (
          <div className="sim-result">
            <span className="small">
              Cai em <strong>{tierRange(tier)}</strong>
            </span>
            <ApprovalChain steps={tier.approvers.map((a, i) => ({ approver: a, status: i === 0 ? 'PENDING' : 'WAITING' }))} compact />
          </div>
        ) : (
          <div className="notice notice-danger small">
            <Icon name="alert" />
            <span>Nenhuma faixa cobre {formatBRL(cents)}. O pedido seria bloqueado.</span>
          </div>
        ))}
    </section>
  )
}

function UsersPanel({ users }: { users: ReturnType<typeof useUsers> }) {
  return (
    <section className="panel side-box" aria-labelledby="users-title">
      <h2 id="users-title" className="side-title">
        Usuários disponíveis
      </h2>
      {users.isPending ? (
        <ListSkeleton rows={4} label="Carregando usuários…" />
      ) : users.isError ? (
        <ErrorState error={users.error} onRetry={() => users.refetch()} />
      ) : (
        <ul className="user-list">
          {users.data.map((u) => (
            <li key={u.id}>
              <Avatar person={u} size={30} />
              <span>
                {u.name}
                <span className="muted small"> {u.role}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
