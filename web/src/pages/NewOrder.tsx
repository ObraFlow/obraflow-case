import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useChainPreview, useCreateOrder, useOrder, useSites, useSuppliers, useUnits, useUsers } from '../api/hooks'
import type { OrderDetail, Site, Tier } from '../api/types'
import { ApprovalChain } from '../components/ApprovalChain'
import { BudgetMeter, pct } from '../components/charts'
import { Icon } from '../components/Icon'
import { EmptyState, ErrorState, ListSkeleton } from '../components/States'
import { useActor } from '../lib/actor'
import { formatBRL, formatDateTime, plural, tierRange, todayISO } from '../lib/format'
import { useDebounced } from '../lib/useDebounced'
import { blankItem, fieldKey, formFromOrder, serverPathToKey, validateOrder, type ItemRow, type OrderForm } from './orderForm'
import '../styles/new-order.css'

const emptyForm = (): OrderForm => ({ siteId: '', supplierId: '', orderDate: todayISO(), notes: '', items: [blankItem()] })

export function NewOrderPage() {
  const sites = useSites()
  const suppliers = useSuppliers()
  const [params, setParams] = useSearchParams()
  const baseId = Number(params.get('corrigir')) || null
  const base = useOrder(baseId)
  const [created, setCreated] = useState<OrderDetail | null>(null)
  const [formKey, setFormKey] = useState(0)

  const correcting = base.data?.status === 'REJECTED' ? base.data : null

  const head = (
    <header className="page-head">
      <div className="page-title">
        {correcting && (
          <nav className="crumbs" aria-label="Caminho">
            <Link to={`/aprovacoes/${correcting.id}`} className="mono">
              {correcting.code}
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Correção</span>
          </nav>
        )}
        <h1>{correcting ? 'Corrigir e reenviar' : 'Novo pedido'}</h1>
      </div>
    </header>
  )

  if (sites.isPending || suppliers.isPending || (baseId && base.isPending)) {
    return (
      <>
        {head}
        <div className="panel">
          <ListSkeleton rows={4} label="Carregando obras e fornecedores…" />
        </div>
      </>
    )
  }
  if (sites.isError || suppliers.isError) {
    return (
      <>
        {head}
        <div className="panel">
          <ErrorState
            error={sites.error ?? suppliers.error}
            onRetry={() => {
              sites.refetch()
              suppliers.refetch()
            }}
          />
        </div>
      </>
    )
  }
  if (sites.data.length === 0) {
    return (
      <>
        {head}
        <div className="panel">
          <EmptyState icon="layers" title="Nenhuma obra cadastrada">
            Todo pedido pertence a uma obra. Cadastre uma obra (ou rode <code>npm run setup</code> para carregar os dados de demonstração) e
            volte aqui.
          </EmptyState>
        </div>
      </>
    )
  }
  if (suppliers.data.length === 0) {
    return (
      <>
        {head}
        <div className="panel">
          <EmptyState title="Nenhum fornecedor cadastrado">Cadastre um fornecedor para conseguir emitir pedidos.</EmptyState>
        </div>
      </>
    )
  }

  if (created) {
    return (
      <>
        {head}
        <Created
          order={created}
          onAnother={() => {
            setCreated(null)
            setParams({}, { replace: true })
            setFormKey((k) => k + 1)
          }}
        />
      </>
    )
  }

  // link de correção para um pedido que não pode ser corrigido
  const badBase = baseId && !correcting
  return (
    <>
      {head}
      {badBase && (
        <div className="notice notice-warn page-notice" role="alert">
          <Icon name="alert" />
          <span>
            {base.isError
              ? 'Não encontramos o pedido a corrigir.'
              : `O pedido ${base.data?.code} não foi rejeitado, então não há o que corrigir.`}{' '}
            Você pode cadastrar um pedido novo normalmente.
          </span>
        </div>
      )}
      <OrderFormView
        key={`${formKey}-${correcting?.id ?? 'novo'}`}
        sites={sites.data}
        suppliers={suppliers.data}
        base={correcting}
        onDiscardBase={() => setParams({}, { replace: true })}
        onCreated={setCreated}
      />
    </>
  )
}

function OrderFormView({
  sites,
  suppliers,
  base,
  onDiscardBase,
  onCreated,
}: {
  sites: Site[]
  suppliers: { id: number; name: string; cnpj: string }[]
  base: OrderDetail | null
  onDiscardBase: () => void
  onCreated: (o: OrderDetail) => void
}) {
  const units = useUnits()
  const create = useCreateOrder()
  const { actorId } = useActor()
  const [form, setForm] = useState<OrderForm>(() => (base ? formFromOrder(base) : emptyForm()))
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})
  const [banner, setBanner] = useState<string | null>(null)
  const [focusKey, setFocusKey] = useState<string | null>(null)

  const { errors, lines, totalCents, valid, payload } = useMemo(() => validateOrder(form), [form])
  const site = sites.find((s) => String(s.id) === form.siteId) ?? null

  // não consulta a cada tecla: espera o usuário parar de digitar
  const debouncedTotal = useDebounced(totalCents, 300)
  const preview = useChainPreview(site?.id ?? null, debouncedTotal)
  const tier = preview.data?.tier
  const previewSettled = !!site && !preview.isPending && debouncedTotal === totalCents && !preview.isFetching
  const noRule = previewSettled && preview.isSuccess && tier === null
  // segregação de funções: quem cadastra não pode estar na cadeia que vai aprovar
  const selfInChain = !!tier && tier.approvers.some((a) => a.id === actorId)

  useEffect(() => {
    if (focusKey) document.getElementById(focusKey)?.focus()
    setFocusKey(null)
  }, [focusKey])

  const touch = (key: string) => setTouched((t) => (t.has(key) ? t : new Set(t).add(key)))
  const errorFor = (key: string) => serverErrors[key] ?? (touched.has(key) ? errors[key] : undefined)

  function update<K extends keyof OrderForm>(field: K, value: OrderForm[K]) {
    setForm((f) => ({ ...f, [field]: value }))
    clearServerError(field)
  }

  function updateItem(key: string, field: keyof ItemRow, value: string) {
    setForm((f) => ({ ...f, items: f.items.map((it) => (it.key === key ? { ...it, [field]: value } : it)) }))
    clearServerError(fieldKey(key, field))
  }

  function clearServerError(key: string) {
    setServerErrors((e) => {
      if (!(key in e)) return e
      const { [key]: _, ...rest } = e
      return rest
    })
  }

  function addItem() {
    const item = blankItem()
    setForm((f) => ({ ...f, items: [...f.items, item] }))
    setFocusKey(fieldKey(item.key, 'description'))
  }

  function removeItem(key: string) {
    setForm((f) => ({ ...f, items: f.items.filter((it) => it.key !== key) }))
    touch('items')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!payload || noRule || selfInChain) return
    setBanner(null)
    try {
      onCreated(await create.mutateAsync({ ...payload, resubmissionOfId: base?.id ?? null }))
    } catch (err) {
      if (err instanceof ApiError && err.details.length) {
        setServerErrors(Object.fromEntries(err.details.map((d) => [serverPathToKey(d.path, form.items), d.message])))
      }
      setBanner(err instanceof Error ? err.message : 'Não foi possível cadastrar o pedido.')
    }
  }

  // o que falta para liberar o botão, em linguagem de gente
  const missing: string[] = []
  if (errors.siteId) missing.push('selecionar a obra')
  if (errors.supplierId) missing.push('selecionar o fornecedor')
  if (errors.orderDate) missing.push('informar a data')
  if (errors.items) missing.push('adicionar ao menos um item')
  const badItems = form.items.filter((it) => (['description', 'quantity', 'unitPrice'] as const).some((f) => errors[fieldKey(it.key, f)]))
  if (badItems.length) missing.push(`completar ${plural(badItems.length, 'item', 'itens')}`)

  const canSubmit = valid && !noRule && !selfInChain && previewSettled && !create.isPending

  return (
    <form className="order-layout" onSubmit={submit} noValidate>
      <div className="order-main">
        {base && <CorrectionBanner order={base} onDiscard={onDiscardBase} />}
        <section className="panel" aria-labelledby="sec-geral">
          <div className="panel-head">
            <h2 id="sec-geral">Dados gerais</h2>
          </div>
          <div className="panel-body general-grid">
            <div className="field">
              <label htmlFor="siteId">
                Obra<span className="req">*</span>
              </label>
              <select
                id="siteId"
                className="select"
                value={form.siteId}
                onChange={(e) => update('siteId', e.target.value)}
                onBlur={() => touch('siteId')}
                aria-invalid={!!errorFor('siteId')}
                aria-describedby="siteId-msg"
              >
                <option value="">Selecione a obra</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {s.name}
                  </option>
                ))}
              </select>
              <FieldMsg id="siteId-msg" error={errorFor('siteId')}>
                {site?.city}
              </FieldMsg>
            </div>

            <div className="field">
              <label htmlFor="supplierId">
                Fornecedor<span className="req">*</span>
              </label>
              <select
                id="supplierId"
                className="select"
                value={form.supplierId}
                onChange={(e) => update('supplierId', e.target.value)}
                onBlur={() => touch('supplierId')}
                aria-invalid={!!errorFor('supplierId')}
                aria-describedby="supplierId-msg"
              >
                <option value="">Selecione o fornecedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <FieldMsg id="supplierId-msg" error={errorFor('supplierId')} />
            </div>

            <div className="field">
              <label htmlFor="orderDate">
                Data do pedido<span className="req">*</span>
              </label>
              <input
                id="orderDate"
                type="date"
                className="input"
                value={form.orderDate}
                onChange={(e) => update('orderDate', e.target.value)}
                onBlur={() => touch('orderDate')}
                aria-invalid={!!errorFor('orderDate')}
                aria-describedby="orderDate-msg"
              />
              <FieldMsg id="orderDate-msg" error={errorFor('orderDate')} />
            </div>

            <div className="field span-3">
              <label htmlFor="notes">
                Observações internas <span className="muted">(opcional)</span>
              </label>
              <textarea
                id="notes"
                className="textarea"
                rows={2}
                maxLength={2000}
                placeholder="Justificativa, urgência, condição negociada…"
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="panel" aria-labelledby="sec-itens">
          <div className="panel-head">
            <h2 id="sec-itens">
              Itens <span className="muted count">{form.items.length}</span>
            </h2>
            <button type="button" className="btn btn-sm" onClick={addItem}>
              <Icon name="plus" /> Adicionar item
            </button>
          </div>

          {form.items.length === 0 ? (
            <div className="items-empty" role="alert">
              <p>
                <strong>O pedido está sem itens.</strong> Adicione pelo menos um material ou serviço para poder enviar.
              </p>
              <button type="button" className="btn btn-primary btn-sm" onClick={addItem}>
                <Icon name="plus" /> Adicionar item
              </button>
            </div>
          ) : (
            <div className="items" role="list">
              <div className="items-header" aria-hidden="true">
                <span>#</span>
                <span>Descrição</span>
                <span className="r">Qtd.</span>
                <span>Un.</span>
                <span className="r">Preço unit.</span>
                <span className="r">Total</span>
                <span />
              </div>
              {form.items.map((it, i) => (
                <ItemRowView
                  key={it.key}
                  index={i}
                  item={it}
                  units={units.data ?? ['un']}
                  totalCents={lines[i].totalCents}
                  errorFor={errorFor}
                  onChange={(field, v) => updateItem(it.key, field, v)}
                  onBlur={(field) => touch(fieldKey(it.key, field))}
                  onRemove={() => removeItem(it.key)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="order-summary panel" aria-labelledby="sec-resumo">
        <div className="panel-body summary-body">
          <h2 id="sec-resumo" className="side-title">
            Resumo
          </h2>

          <div className="summary-total">
            <span className="muted">Total do pedido</span>
            <strong className="money" aria-live="polite">
              {formatBRL(totalCents)}
            </strong>
            <span className="muted small">
              {plural(form.items.length, 'item', 'itens')}
              {badItems.length > 0 && ' · itens incompletos não entram na soma'}
            </span>
          </div>

          <div className="summary-chain">
            <span className="field-label">Alçada aplicável</span>
            {!site ? (
              <p className="muted small">Selecione a obra para ver quem vai aprovar.</p>
            ) : preview.isError ? (
              <p className="field-error">Não foi possível consultar a regra agora.</p>
            ) : preview.isPending ? (
              <span className="skeleton" style={{ width: '70%' }} />
            ) : tier && selfInChain ? (
              <SelfApprovalNotice tier={tier} />
            ) : tier ? (
              <div className={preview.isFetching ? 'is-stale' : undefined}>
                <p className="small">
                  {site.code} · {tierRange(tier)}
                </p>
                <ApprovalChain steps={tier.approvers.map((a, i) => ({ approver: a, status: i === 0 ? 'PENDING' : 'WAITING' }))} />
                <p className="muted small">
                  {tier.approvers.length === 1 ? 'Uma aprovação libera o pedido.' : `${tier.approvers.length} aprovações, nesta ordem.`}
                </p>
              </div>
            ) : (
              <div className="notice notice-danger">
                <Icon name="alert" />
                <span>
                  {site.tierCount === 0
                    ? `A obra ${site.code} ainda não tem regras de alçada.`
                    : `Nenhuma faixa da obra ${site.code} cobre ${formatBRL(totalCents)}.`}{' '}
                  O pedido não pode ser enviado. <Link to={`/regras?obra=${site.id}`}>Configurar regras</Link>
                </span>
              </div>
            )}
          </div>

          {site && site.budgetCents > 0 && <BudgetImpact site={site} orderCents={totalCents} />}

          {banner && (
            <div className="notice notice-danger" role="alert">
              <Icon name="alert" />
              <span>{banner}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={!canSubmit}>
            {create.isPending ? 'Enviando…' : base ? 'Reenviar pedido corrigido' : 'Cadastrar pedido'}
          </button>
          {missing.length > 0 && (
            <p className="muted small" id="submit-hint">
              Para enviar falta {joinPt(missing)}.
            </p>
          )}
        </div>
      </aside>
    </form>
  )
}

function ItemRowView(props: {
  index: number
  item: ItemRow
  units: string[]
  totalCents: number | null
  errorFor: (key: string) => string | undefined
  onChange: (field: keyof ItemRow, value: string) => void
  onBlur: (field: keyof ItemRow) => void
  onRemove: () => void
}) {
  const { item, index } = props
  const id = (f: keyof ItemRow) => fieldKey(item.key, f)
  const err = (f: keyof ItemRow) => props.errorFor(id(f))
  const input = (f: keyof ItemRow) => ({
    id: id(f),
    value: item[f],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => props.onChange(f, e.target.value),
    onBlur: () => props.onBlur(f),
    'aria-invalid': !!err(f),
    'aria-describedby': `${id(f)}-msg`,
  })

  return (
    <div className="item-row" role="listitem" aria-label={`Item ${index + 1}`}>
      <span className="item-index mono">{String(index + 1).padStart(2, '0')}</span>

      <div className="field item-desc">
        <label htmlFor={id('description')} className="item-label">
          Descrição
        </label>
        <input className="input" placeholder="Ex.: Cimento CP-II 50 kg" maxLength={300} {...input('description')} />
      </div>
      <div className="field item-qty">
        <label htmlFor={id('quantity')} className="item-label">
          Quantidade
        </label>
        <input className="input num" inputMode="decimal" placeholder="0" {...input('quantity')} />
      </div>
      <div className="field item-unit">
        <label htmlFor={id('unit')} className="item-label">
          Unidade
        </label>
        <select className="select" {...input('unit')}>
          {props.units.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </div>
      <div className="field item-price">
        <label htmlFor={id('unitPrice')} className="item-label">
          Preço unitário (R$)
        </label>
        <input className="input num" inputMode="decimal" placeholder="0,00" {...input('unitPrice')} />
      </div>
      <div className="item-total">
        <span className="item-label">Total</span>
        <span className="money">{props.totalCents === null ? '-' : formatBRL(props.totalCents)}</span>
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-icon item-remove"
        onClick={props.onRemove}
        aria-label={`Remover item ${index + 1}`}
        title="Remover item"
      >
        <Icon name="trash" />
      </button>

      <div className="item-errors">
        {(['description', 'quantity', 'unitPrice'] as const).map((f) =>
          err(f) ? (
            <span key={f} id={`${id(f)}-msg`} className="field-error">
              {err(f)}
            </span>
          ) : (
            <span key={f} id={`${id(f)}-msg`} hidden />
          ),
        )}
        <span id={`${id('unit')}-msg`} hidden />
      </div>
    </div>
  )
}

function FieldMsg({ id, error, children }: { id: string; error?: string; children?: React.ReactNode }) {
  if (error)
    return (
      <span id={id} className="field-error">
        {error}
      </span>
    )
  return (
    <span id={id} className="field-hint">
      {children}
    </span>
  )
}

function CorrectionBanner({ order, onDiscard }: { order: OrderDetail; onDiscard: () => void }) {
  const rejected = order.steps.find((s) => s.status === 'REJECTED')
  return (
    <section className="correction" aria-label="Pedido que está sendo corrigido">
      <div className="correction-head">
        <Icon name="redo" />
        <span>
          Corrigindo{' '}
          <Link to={`/aprovacoes/${order.id}`} className="mono">
            {order.code}
          </Link>
          , rejeitado por <strong>{rejected?.approver.name}</strong>
          {rejected?.decidedAt && <span className="muted"> em {formatDateTime(rejected.decidedAt)}</span>}
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDiscard}>
          Começar do zero
        </button>
      </div>
      {rejected?.reason && <blockquote>{rejected.reason}</blockquote>}
    </section>
  )
}

function SelfApprovalNotice({ tier }: { tier: Tier }) {
  const { actorId, setActorId } = useActor()
  const users = useUsers()
  const me = tier.approvers.find((a) => a.id === actorId)
  // sugere quem pode cadastrar: alguém fora da cadeia, de preferência do setor de compras
  const outside = users.data?.filter((u) => !tier.approvers.some((a) => a.id === u.id)) ?? []
  const suggestion = outside.find((u) => /compr/i.test(u.role)) ?? outside[0]

  return (
    <div className="notice notice-danger self-approval">
      <Icon name="user" />
      <div>
        <p>
          <strong>{me?.name.split(' ')[0]}, você está nesta alçada</strong> ({tierRange(tier)}:{' '}
          {tier.approvers.map((a) => a.name.split(' ')[0]).join(' → ')}). Quem aprova não pode cadastrar o próprio pedido.
        </p>
        {suggestion && (
          <button type="button" className="btn btn-sm" onClick={() => setActorId(suggestion.id)}>
            Cadastrar como {suggestion.name}
          </button>
        )}
      </div>
    </div>
  )
}

function Created({ order, onAnother }: { order: OrderDetail; onAnother: () => void }) {
  const first = order.steps[0]
  return (
    <section className="panel created" aria-live="polite">
      <div className="created-icon">
        <Icon name="check" size={22} />
      </div>
      <div className="created-text">
        <span className="eyebrow">{order.code}</span>
        <h2>
          {order.resubmissionOf
            ? `Correção do ${order.resubmissionOf.code} enviada para aprovação`
            : 'Pedido cadastrado e enviado para aprovação'}
        </h2>
        <p>
          {formatBRL(order.totalCents)} em {plural(order.itemCount, 'item', 'itens')} para a obra {order.site.code}. Agora está com{' '}
          <strong>{first.approver.name}</strong>
          {order.steps.length > 1 ? `, etapa 1 de ${order.steps.length}.` : ', que decide sozinho(a).'}
        </p>
        <ApprovalChain steps={order.steps} />
      </div>
      <div className="created-actions">
        <Link to={`/aprovacoes/${order.id}`} className="btn btn-primary">
          Abrir pedido
        </Link>
        <button type="button" className="btn" onClick={onAnother}>
          Cadastrar outro
        </button>
      </div>
    </section>
  )
}

function joinPt(parts: string[]) {
  return parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}`
}

// Quanto do orçamento da obra este pedido consome. É informativo: estourar o
// orçamento não bloqueia o envio, quem decide é a alçada.
function BudgetImpact({ site, orderCents }: { site: Site; orderCents: number }) {
  const after = site.approvedCents + site.pendingCents + orderCents
  const over = after - site.budgetCents
  return (
    <div className="summary-budget">
      <div className="budget-head">
        <span className="field-label">Orçamento da obra</span>
        <strong>{pct(after, site.budgetCents)}</strong>
      </div>
      <BudgetMeter budget={site.budgetCents} approved={site.approvedCents} pending={site.pendingCents} draft={orderCents} />
      <p className={`small ${over > 0 ? 'budget-over' : 'muted'}`}>
        {over > 0
          ? `Com este pedido a obra passa do orçamento em ${formatBRL(over)}.`
          : `Com este pedido: ${formatBRL(after)} de ${formatBRL(site.budgetCents)} comprometidos.`}
      </p>
    </div>
  )
}
