import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useDecision, useOrder, useOrderStats, useOrders, useSites, type OrderFilter } from '../api/hooks'
import type { OrderDetail, OrderStats, OrderSummary, Step } from '../api/types'
import { DecisionActions } from '../components/DecisionActions'
import { ConfirmDialog } from '../components/Dialog'
import { Icon } from '../components/Icon'
import { EmptyState, ErrorState, ListSkeleton } from '../components/States'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../components/Toasts'
import { useActor } from '../lib/actor'
import { decisionState } from '../lib/decision'
import { formatBRL, formatDate, formatDateTime, formatQuantity, plural, since } from '../lib/format'
import { reminderLink } from '../lib/whatsapp'
import '../styles/approvals.css'

const TABS = [
  { id: 'meus', label: 'Aguardando você', count: 'awaitingMe' },
  { id: 'pendentes', label: 'Em aprovação', status: 'PENDING', count: 'pending' },
  { id: 'parados', label: 'Parados', status: 'PENDING', count: 'stalled' },
  { id: 'aprovados', label: 'Aprovados', status: 'APPROVED' },
  { id: 'rejeitados', label: 'Rejeitados', status: 'REJECTED' },
  { id: 'todos', label: 'Todos' },
] as const
type TabId = (typeof TABS)[number]['id']

export function ApprovalsPage() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const { actorId } = useActor()
  const sites = useSites()

  const tabId = (TABS.find((t) => t.id === params.get('filtro'))?.id ?? 'meus') as TabId
  const tab = TABS.find((t) => t.id === tabId)!
  const siteId = Number(params.get('obra')) || undefined

  const filter: OrderFilter = {
    status: 'status' in tab ? tab.status : undefined,
    awaiting: tabId === 'meus' ? 'me' : undefined,
    siteId,
    actorId,
  }
  const orders = useOrders(filter)
  const stats = useOrderStats(actorId, siteId)
  // "Parados" é a lista de pendentes filtrada pelo prazo que o backend já calculou
  const rows = tabId === 'parados' ? orders.data?.filter((o) => o.stalled) : orders.data

  const selectedId = id ? Number(id) : null
  const qs = params.toString() ? `?${params}` : ''

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <div className={`approvals ${selectedId ? 'has-detail' : ''}`}>
      <div className="approvals-list">
        <header className="page-head">
          <h1>Aprovações</h1>
          <Link to="/pedidos/novo" className="btn btn-primary">
            <Icon name="plus" /> Novo pedido
          </Link>
        </header>

        <StatCards stats={stats.data} active={tabId} onPick={(t) => setParam('filtro', t === 'meus' ? null : t)} />

        <nav className="tabs" aria-label="Filtrar por situação">
          {TABS.map((t) => {
            const count = 'count' in t ? stats.data?.[t.count].count : undefined
            return (
              <button
                key={t.id}
                type="button"
                className="tab"
                aria-current={t.id === tabId ? 'page' : undefined}
                onClick={() => setParam('filtro', t.id === 'meus' ? null : t.id)}
              >
                {t.label}
                {count !== undefined && <span className={`tab-count ${t.id === 'parados' && count > 0 ? 'is-warn' : ''}`}>{count}</span>}
              </button>
            )
          })}
        </nav>

        <div className="toolbar">
          <label className="visually-hidden" htmlFor="site-filter">
            Filtrar por obra
          </label>
          <select
            id="site-filter"
            className="select site-filter"
            value={siteId ?? ''}
            onChange={(e) => setParam('obra', e.target.value || null)}
          >
            <option value="">Todas as obras</option>
            {sites.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} · {s.name}
              </option>
            ))}
          </select>
        </div>

        <section className="panel list-panel" aria-busy={orders.isFetching}>
          {orders.isPending ? (
            <ListSkeleton rows={6} label="Carregando pedidos…" />
          ) : orders.isError ? (
            <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
          ) : !rows?.length ? (
            <EmptyList tabId={tabId} filtered={!!siteId} onShowPending={() => setParam('filtro', 'pendentes')} />
          ) : (
            <OrderTable orders={rows} selectedId={selectedId} qs={qs} />
          )}
        </section>
      </div>

      {selectedId && (
        <>
          <Link to={`/aprovacoes${qs}`} className="detail-backdrop" aria-label="Fechar detalhes" tabIndex={-1} />
          <OrderDetailPanel id={selectedId} closeTo={`/aprovacoes${qs}`} />
        </>
      )}
    </div>
  )
}

const CARDS = [
  { tab: 'meus', key: 'awaitingMe', label: 'Aguardando você', icon: 'inbox', tone: 'accent' },
  { tab: 'pendentes', key: 'pending', label: 'Em aprovação', icon: 'file', tone: 'plain' },
  { tab: 'parados', key: 'stalled', label: 'Parados', icon: 'clock', tone: 'warn' },
  { tab: 'aprovados', key: 'approvedThisMonth', label: 'Aprovado no mês', icon: 'check', tone: 'ok' },
] as const

// Cards do topo: cada um é um atalho para a aba correspondente
function StatCards({ stats, active, onPick }: { stats?: OrderStats; active: TabId; onPick: (t: TabId) => void }) {
  return (
    <div className="stat-cards" aria-label="Resumo">
      {CARDS.map((c) => {
        const data = stats?.[c.key]
        const value = data && 'totalCents' in data ? formatBRL(data.totalCents) : data ? `há ${data.afterDays}+ dias sem decisão` : ' '
        return (
          <button
            key={c.key}
            type="button"
            className={`stat-card tone-${c.tone}`}
            data-active={active === c.tab || undefined}
            data-empty={data?.count === 0 || undefined}
            onClick={() => onPick(c.tab)}
          >
            <span className="stat-icon">
              <Icon name={c.icon} size={20} />
            </span>
            <span className="stat-body">
              <span className="stat-label">{c.label}</span>
              <strong>{data ? data.count : '–'}</strong>
              <span className="stat-sub money">{value}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function EmptyList({ tabId, filtered, onShowPending }: { tabId: TabId; filtered: boolean; onShowPending: () => void }) {
  if (tabId === 'parados')
    return (
      <EmptyState icon="clock" title="Nenhum pedido parado">
        Todo pedido pendente teve movimento nos últimos dias.
      </EmptyState>
    )
  if (tabId === 'meus')
    return (
      <EmptyState
        icon="check"
        title="Nada esperando sua decisão"
        action={
          <button type="button" className="btn" onClick={onShowPending}>
            Ver pedidos em aprovação
          </button>
        }
      >
        Quando um pedido chegar na sua etapa da alçada, ele aparece aqui.
      </EmptyState>
    )
  return (
    <EmptyState
      title="Nenhum pedido encontrado"
      action={
        tabId === 'todos' && !filtered ? (
          <Link to="/pedidos/novo" className="btn btn-primary">
            Cadastrar pedido
          </Link>
        ) : undefined
      }
    >
      {filtered ? 'Nenhum pedido desta obra com essa situação.' : 'Não há pedidos com essa situação.'}
    </EmptyState>
  )
}

function OrderTable({ orders, selectedId, qs }: { orders: OrderSummary[]; selectedId: number | null; qs: string }) {
  const { actorId } = useActor()
  const decision = useDecision()
  const toast = useToast()
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [confirming, setConfirming] = useState(false)

  // só entra na seleção o que está na etapa de quem está atuando
  const decidable = useMemo(() => orders.filter((o) => decisionState(o, actorId).kind === 'mine'), [orders, actorId])
  const chosen = decidable.filter((o) => picked.has(o.id))
  const chosenTotal = chosen.reduce((sum, o) => sum + o.totalCents, 0)
  const allPicked = decidable.length > 0 && chosen.length === decidable.length

  // trocou o filtro, a pessoa ou alguém decidiu: some da seleção o que não está mais na tela
  useEffect(() => {
    setPicked((prev) => {
      const keep = new Set(decidable.filter((o) => prev.has(o.id)).map((o) => o.id))
      return keep.size === prev.size ? prev : keep
    })
  }, [decidable])

  function toggle(id: number) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function approveAll() {
    // um por vez: cada aprovação passa pelas mesmas regras do backend que a aprovação individual
    const failed: string[] = []
    for (const o of chosen) {
      try {
        await decision.mutateAsync({ id: o.id })
      } catch (err) {
        failed.push(`${o.code}: ${err instanceof Error ? err.message : 'erro'}`)
      }
    }
    setConfirming(false)
    setPicked(new Set())
    const ok = chosen.length - failed.length
    if (ok) toast(`${plural(ok, 'pedido aprovado', 'pedidos aprovados')}.`)
    if (failed.length) toast(`Não aprovados: ${failed.join('; ')}`, 'error')
  }

  return (
    <>
      {chosen.length > 0 && (
        <div className="bulk-bar" role="region" aria-label="Seleção">
          <span>
            <strong>{plural(chosen.length, 'selecionado', 'selecionados')}</strong>
            <span className="muted"> · </span>
            <span className="money">{formatBRL(chosenTotal)}</span>
          </span>
          <span className="bulk-note muted small">Rejeição é individual, com motivo.</span>
          <div className="bulk-actions">
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setPicked(new Set())}>
              Limpar
            </button>
            <button type="button" className="btn btn-sm btn-approve" onClick={() => setConfirming(true)}>
              <Icon name="check" /> Aprovar selecionados
            </button>
          </div>
        </div>
      )}

      <div className="orders" role="table" aria-label="Pedidos">
        <div className="order-row order-head" role="row">
          <span role="columnheader" className="c-sel">
            {decidable.length > 0 && (
              <input
                type="checkbox"
                className="check"
                aria-label="Selecionar todos que aguardam você"
                checked={allPicked}
                ref={(el) => {
                  if (el) el.indeterminate = chosen.length > 0 && !allPicked
                }}
                onChange={() => setPicked(allPicked ? new Set() : new Set(decidable.map((o) => o.id)))}
              />
            )}
          </span>
          <span role="columnheader">Pedido</span>
          <span role="columnheader">Obra · fornecedor</span>
          <span role="columnheader">Solicitante</span>
          <span role="columnheader" className="r">
            Total
          </span>
          <span role="columnheader">Situação</span>
          <span role="columnheader">Etapa atual</span>
          <span role="columnheader" className="r">
            Ações
          </span>
        </div>
        {orders.map((o) => {
          const canPick = decidable.includes(o)
          return (
            <div key={o.id} role="row" className="order-row" aria-current={o.id === selectedId ? 'true' : undefined}>
              <span role="cell" className="c-sel">
                {canPick && (
                  <input
                    type="checkbox"
                    className="check"
                    aria-label={`Selecionar ${o.code}`}
                    checked={picked.has(o.id)}
                    onChange={() => toggle(o.id)}
                  />
                )}
              </span>
              <span role="cell" className="c-code">
                <Link to={`/aprovacoes/${o.id}${qs}`} className="row-link mono">
                  {o.code}
                </Link>
                <span className="muted small">
                  {formatDate(o.orderDate)} · {plural(o.itemCount, 'item', 'itens')}
                </span>
              </span>
              <span role="cell" className="c-site">
                <span className="truncate">
                  <span className="mono site-code">{o.site.code}</span> {o.site.name}
                </span>
                <span className="muted small truncate">{o.supplier.name}</span>
              </span>
              <span role="cell" className="c-req truncate">
                {o.requester.name}
              </span>
              <span role="cell" className="c-total r money">
                {formatBRL(o.totalCents)}
              </span>
              <span role="cell" className="c-status">
                <StatusBadge status={o.status} />
                {o.waitingSince && <WaitingChip since={o.waitingSince} stalled={o.stalled} />}
              </span>
              <span role="cell" className="c-step">
                <CurrentStep order={o} />
              </span>
              <span role="cell" className="c-actions">
                <DecisionActions order={o} variant="row" />
              </span>
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        open={confirming}
        title={`Aprovar ${plural(chosen.length, 'pedido', 'pedidos')}?`}
        confirmLabel="Aprovar"
        busy={decision.isPending}
        onConfirm={approveAll}
        onClose={() => setConfirming(false)}
      >
        <p>
          Você aprova a sua etapa em cada um. Os que tiverem próxima etapa seguem para o próximo aprovador. Total{' '}
          <strong className="money">{formatBRL(chosenTotal)}</strong>.
        </p>
        <ul className="confirm-list">
          {chosen.map((o) => (
            <li key={o.id}>
              <span className="mono">{o.code}</span>
              <span className="truncate">{o.supplier.name}</span>
              <span className="money">{formatBRL(o.totalCents)}</span>
            </li>
          ))}
        </ul>
      </ConfirmDialog>
    </>
  )
}

function CurrentStep({ order }: { order: OrderSummary }) {
  const total = order.steps.length
  if (order.status === 'PENDING' && order.currentStep !== null) {
    const s = order.steps[order.currentStep]
    return (
      <>
        <span className="truncate">{s.approver.name}</span>
        <span className="muted small">
          Etapa {order.currentStep + 1} de {total}
        </span>
      </>
    )
  }
  if (order.status === 'REJECTED') {
    const by = order.steps.find((s) => s.status === 'REJECTED')
    return <span className="muted small">Rejeitado por {by?.approver.name.split(' ')[0]}</span>
  }
  return <span className="muted small">{plural(total, 'etapa concluída', 'etapas concluídas')}</span>
}

function WaitingChip({ since: at, stalled }: { since: string; stalled: boolean }) {
  return (
    <span className={`wait ${stalled ? 'is-stalled' : ''}`} title={`Esperando desde ${formatDateTime(at)}`}>
      {stalled ? `parado ${since(at)}` : since(at)}
    </span>
  )
}

const STEP_TEXT: Record<Step['status'], string> = {
  WAITING: 'Próxima',
  PENDING: 'Aguardando',
  APPROVED: 'Aprovou',
  REJECTED: 'Rejeitou',
  CANCELED: 'Não decidiu',
}

function OrderDetailPanel({ id, closeTo }: { id: number; closeTo: string }) {
  const order = useOrder(id)
  const navigate = useNavigate()

  // Esc fecha o painel (quando não há um dialog aberto por cima)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) navigate(closeTo)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, closeTo])

  return (
    <aside className="detail panel" aria-label="Detalhes do pedido">
      <div className="detail-top">
        <nav className="crumbs" aria-label="Caminho">
          <Link to={closeTo}>Aprovações</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="mono">
            {order.data?.code ?? '…'}
          </span>
        </nav>
        <button type="button" className="btn btn-ghost btn-sm detail-close" aria-label="Voltar à lista" onClick={() => navigate(closeTo)}>
          <Icon name="x" /> <span aria-hidden="true">Voltar à lista</span>
        </button>
      </div>
      {order.isPending ? (
        <ListSkeleton rows={5} label="Carregando pedido…" />
      ) : order.isError ? (
        <ErrorState error={order.error} onRetry={() => order.refetch()} title="Não foi possível abrir o pedido" />
      ) : (
        <OrderDetailBody order={order.data} />
      )}
    </aside>
  )
}

function OrderDetailBody({ order }: { order: OrderDetail }) {
  const { actorId } = useActor()
  const current = order.currentStep !== null ? order.steps[order.currentStep] : null
  const reminder = current && current.approver.id !== actorId ? reminderLink(order, current.approver) : null
  const rejectedStep = order.steps.find((s) => s.status === 'REJECTED')
  const cnpj = order.supplier.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')

  return (
    <div className="detail-scroll">
      <header className="detail-head">
        <h2>
          Pedido <span className="mono">{order.code}</span>
        </h2>
        <StatusBadge status={order.status} />
      </header>

      <DecisionActions order={order} variant="bar" />

      {order.resubmissionOf && (
        <Link to={`/aprovacoes/${order.resubmissionOf.id}`} className="relation">
          <Icon name="redo" size={14} />
          <span>
            Correção do pedido <strong className="mono">{order.resubmissionOf.code}</strong>, que foi rejeitado
          </span>
          <Icon name="arrowRight" size={14} />
        </Link>
      )}

      {rejectedStep && (
        <div className="rejection">
          <p className="rejection-head">
            <strong>Motivo da rejeição</strong>
            <span className="muted">
              {rejectedStep.approver.name}
              {rejectedStep.decidedAt && ` · ${formatDateTime(rejectedStep.decidedAt)}`}
            </span>
          </p>
          <blockquote>{rejectedStep.reason}</blockquote>
          {order.resubmissions.length > 0 ? (
            <div className="rejection-next">
              {order.resubmissions.map((r) => (
                <Link key={r.id} to={`/aprovacoes/${r.id}`} className="btn btn-sm">
                  Corrigido em <span className="mono">{r.code}</span> <Icon name="arrowRight" size={14} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="rejection-next">
              <span className="muted small">O fluxo deste pedido acabou. Ajuste o que foi apontado e envie de novo.</span>
              <Link to={`/pedidos/novo?corrigir=${order.id}`} className="btn btn-primary btn-sm">
                <Icon name="redo" size={14} /> Corrigir e reenviar
              </Link>
            </div>
          )}
        </div>
      )}

      <dl className="meta">
        <div>
          <dt>Total</dt>
          <dd className="money meta-total">{formatBRL(order.totalCents)}</dd>
        </div>
        <div>
          <dt>Data do pedido</dt>
          <dd>{formatDate(order.orderDate)}</dd>
        </div>
        <div>
          <dt>Obra</dt>
          <dd>
            <span className="mono">{order.site.code}</span> {order.site.name}
          </dd>
        </div>
        <div>
          <dt>Solicitante</dt>
          <dd>{order.requester.name}</dd>
        </div>
        <div>
          <dt>Fornecedor</dt>
          <dd>
            {order.supplier.name}
            <span className="muted mono meta-sub">{cnpj}</span>
          </dd>
        </div>
        <div>
          <dt>Faixa aplicada</dt>
          <dd>
            {order.tierUpToCents === null ? 'Sem teto' : `Até ${formatBRL(order.tierUpToCents)}`}
            <span className="muted meta-sub">retrato do momento da criação</span>
          </dd>
        </div>
        {order.notes && (
          <div className="meta-wide">
            <dt>Observações internas</dt>
            <dd className="notes">{order.notes}</dd>
          </div>
        )}
      </dl>

      <section className="detail-section">
        <h3>Alçada</h3>
        <div className="table-wrap">
          <table className="data-table chain-table">
            <thead>
              <tr>
                <th className="col-pos">Etapa</th>
                <th>Aprovador</th>
                <th>Situação</th>
                <th className="col-date">Data</th>
              </tr>
            </thead>
            <tbody>
              {order.steps.map((s) => (
                <tr key={s.position} data-status={s.status}>
                  <td className="mono col-pos">{s.position + 1}</td>
                  <td>
                    {s.approver.name}
                    <span className="cell-sub">{s.approver.role}</span>
                  </td>
                  <td>
                    <span className="step-state">{STEP_TEXT[s.status]}</span>
                    {s.status === 'PENDING' && order.waitingSince && (
                      <span className="cell-sub">
                        <WaitingChip since={order.waitingSince} stalled={order.stalled} />
                      </span>
                    )}
                    {s.status === 'PENDING' && reminder && (
                      <a className="whatsapp-link" href={reminder} target="_blank" rel="noreferrer">
                        <Icon name="whatsapp" size={14} /> Lembrar {s.approver.name.split(' ')[0]} no WhatsApp
                      </a>
                    )}
                  </td>
                  <td className="mono nowrap col-date">{s.decidedAt ? formatDateTime(s.decidedAt) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="detail-section">
        <h3>Itens ({order.items.length})</h3>
        <div className="table-wrap">
          <table className="data-table items-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th className="r">Qtd.</th>
                <th className="r col-unit">Preço unit.</th>
                <th className="r">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it) => (
                <tr key={it.position}>
                  <td>
                    {it.description}
                    <span className="item-sub money">
                      {formatBRL(it.unitPriceCents)} / {it.unit}
                    </span>
                  </td>
                  <td className="r mono nowrap">
                    {formatQuantity(it.quantity)} <span className="muted">{it.unit}</span>
                  </td>
                  <td className="r money col-unit">{formatBRL(it.unitPriceCents)}</td>
                  <td className="r money">{formatBRL(it.totalCents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Total do pedido</td>
                <td className="col-unit" />
                <td className="r money">{formatBRL(order.totalCents)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="detail-section">
        <h3>Histórico</h3>
        <ol className="history">
          {order.history.map((h) => (
            <li key={h.id} data-type={h.type}>
              <time className="muted mono" dateTime={h.createdAt}>
                {formatDateTime(h.createdAt)}
              </time>
              <span>
                <strong>{h.actor.name}</strong> {h.type === 'CREATED' ? 'criou o pedido' : h.type === 'APPROVED' ? 'aprovou' : 'rejeitou'}
              </span>
              {h.reason && <blockquote className="history-reason">{h.reason}</blockquote>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
