import { Link, useSearchParams } from 'react-router-dom'
import { useDashboard, useOrderStats, useSites } from '../api/hooks'
import type { Dashboard } from '../api/types'
import { BudgetMeter, Donut, MonthBars, Sparkline, monthLabel, pct } from '../components/charts'
import { Icon } from '../components/Icon'
import { ErrorState } from '../components/States'
import { useActor } from '../lib/actor'
import { formatBRL, formatDateTime, plural } from '../lib/format'
import '../styles/dashboard.css'

// a partir daqui a obra entra em alerta: o que já está aprovado ou em aprovação passa deste tanto do orçamento
const NEAR_LIMIT = 0.85

export function DashboardPage() {
  const [params, setParams] = useSearchParams()
  const siteId = Number(params.get('obra')) || undefined
  const sites = useSites()
  const dash = useDashboard(siteId)
  const { actorId } = useActor()
  const stats = useOrderStats(actorId, siteId)

  return (
    <div className="dash">
      <header className="page-head">
        <h1>Painel de compras</h1>
        <div className="page-actions">
          <label className="visually-hidden" htmlFor="dash-site">
            Obra
          </label>
          <select
            id="dash-site"
            className="select pill-select"
            value={siteId ?? ''}
            onChange={(e) => setParams(e.target.value ? { obra: e.target.value } : {}, { replace: true })}
          >
            <option value="">Todas as obras</option>
            {sites.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} · {s.name}
              </option>
            ))}
          </select>
          <Link to="/pedidos/novo" className="btn btn-primary">
            <Icon name="plus" /> Novo pedido
          </Link>
        </div>
      </header>

      {dash.isError ? (
        <div className="panel">
          <ErrorState error={dash.error} onRetry={() => dash.refetch()} />
        </div>
      ) : !dash.data ? (
        <DashSkeleton />
      ) : (
        <DashBody d={dash.data} awaiting={stats.data?.awaitingMe} stalled={stats.data?.stalled.count} siteId={siteId} />
      )}
    </div>
  )
}

function DashBody({
  d,
  awaiting,
  stalled,
  siteId,
}: {
  d: Dashboard
  awaiting?: { count: number; totalCents: number }
  stalled?: number
  siteId?: number
}) {
  const committed = d.approvedCents + d.pendingCents
  const thisMonth = d.months.at(-1)!
  const lastMonth = d.months.at(-2)
  const delta = lastMonth && lastMonth.approvedCents > 0 ? thisMonth.approvedCents / lastMonth.approvedCents - 1 : null
  const supMax = Math.max(...d.suppliers.map((s) => s.approvedCents), 1)
  const qs = siteId ? `&obra=${siteId}` : ''

  return (
    <div className="dash-grid">
      <section className="hero-card" aria-label="Gasto aprovado">
        <div className="hero-top">
          <span>Gasto aprovado · {plural(d.counts.approved, 'pedido', 'pedidos')}</span>
          <span className="hero-chip">{pct(d.approvedCents, d.budgetCents)} do orçamento</span>
        </div>
        <strong className="hero-value money">{formatBRL(d.approvedCents)}</strong>
        <span className="hero-sub">de {formatBRL(d.budgetCents)} orçados</span>
        <Sparkline values={d.months.map((m) => m.approvedCents)} />
        <dl className="hero-split">
          <div>
            <dt>Em aprovação</dt>
            <dd className="money">{formatBRL(d.pendingCents)}</dd>
          </div>
          <div>
            <dt>Disponível</dt>
            <dd className="money">{formatBRL(d.availableCents)}</dd>
          </div>
        </dl>
      </section>

      <section className="panel card donut-card" aria-labelledby="t-budget">
        <h2 id="t-budget" className="card-title">
          Orçamento comprometido
        </h2>
        <div className="donut-wrap">
          <Donut
            size={150}
            total={d.budgetCents}
            segments={[
              { value: d.approvedCents, className: 'seg-approved', label: 'Aprovado' },
              { value: d.pendingCents, className: 'seg-pending', label: 'Em aprovação' },
            ]}
          >
            <strong>{pct(committed, d.budgetCents)}</strong>
            <span>comprometido</span>
          </Donut>
          <ul className="legend">
            <li>
              <i className="dot dot-approved" />
              <span>Aprovado</span>
              <strong className="money">{formatBRL(d.approvedCents)}</strong>
            </li>
            <li>
              <i className="dot dot-pending" />
              <span>Em aprovação</span>
              <strong className="money">{formatBRL(d.pendingCents)}</strong>
            </li>
            <li>
              <i className="dot dot-free" />
              <span>Livre</span>
              <strong className="money">{formatBRL(Math.max(d.availableCents, 0))}</strong>
            </li>
          </ul>
        </div>
      </section>

      <div className="mini-stack">
        <Link to={`/aprovacoes?${qs.slice(1)}`} className="panel card mini">
          <span className="mini-icon is-accent">
            <Icon name="inbox" size={20} />
          </span>
          <span className="mini-body">
            <span className="mini-label">Aguardando você</span>
            <strong>{awaiting ? plural(awaiting.count, 'pedido', 'pedidos') : '–'}</strong>
            <span className="mini-sub money">{awaiting ? formatBRL(awaiting.totalCents) : ' '}</span>
          </span>
          <Icon name="arrowRight" />
        </Link>
        <Link to={`/aprovacoes?filtro=parados${qs}`} className="panel card mini">
          <span className={`mini-icon ${stalled ? 'is-warn' : ''}`}>
            <Icon name="clock" size={20} />
          </span>
          <span className="mini-body">
            <span className="mini-label">Parados há 3+ dias</span>
            <strong>{stalled ?? '–'}</strong>
            <span className="mini-sub">
              {d.avgApprovalHours !== null ? `aprovação leva ${duration(d.avgApprovalHours)} em média` : ' '}
            </span>
          </span>
          <Icon name="arrowRight" />
        </Link>
      </div>

      <section className="panel card months-card" aria-labelledby="t-months">
        <div className="card-head">
          <h2 id="t-months" className="card-title">
            Gasto aprovado por mês
          </h2>
          <span className="card-meta">
            {monthLabel(thisMonth.month)}: <strong className="money">{formatBRL(thisMonth.approvedCents)}</strong>
            {delta !== null && (
              <span className={`delta ${delta >= 0 ? 'is-up' : 'is-down'}`}>
                {delta >= 0 ? '↑' : '↓'} {Math.abs(Math.round(delta * 100))}% vs {monthLabel(lastMonth!.month)}
              </span>
            )}
          </span>
        </div>
        <MonthBars data={d.months} />
      </section>

      <section className="panel card suppliers-card" aria-labelledby="t-sup">
        <h2 id="t-sup" className="card-title">
          Maiores fornecedores
        </h2>
        {d.suppliers.length === 0 ? (
          <p className="muted small">Nenhum pedido aprovado ainda.</p>
        ) : (
          <ol className="sup-list">
            {d.suppliers.map((s) => (
              <li key={s.id}>
                <div className="sup-line">
                  <span className="truncate">{s.name}</span>
                  <strong className="money">{formatBRL(s.approvedCents)}</strong>
                </div>
                <span className="sup-bar">
                  <span style={{ width: `${(s.approvedCents / supMax) * 100}%` }} />
                </span>
                <span className="muted small">{plural(s.count, 'pedido', 'pedidos')}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel card sites-card" aria-labelledby="t-sites">
        <div className="card-head">
          <h2 id="t-sites" className="card-title">
            Obras
          </h2>
          <span className="card-meta legend-inline">
            <i className="dot dot-approved" /> aprovado <i className="dot dot-pending" /> em aprovação
          </span>
        </div>
        <ul className="site-budgets">
          {d.sites.map((s) => {
            const used = s.budgetCents > 0 ? (s.approvedCents + s.pendingCents) / s.budgetCents : 0
            return (
              <li key={s.id} data-dim={siteId && siteId !== s.id ? true : undefined}>
                <div className="sb-head">
                  <span className="truncate">
                    <span className="mono site-code">{s.code}</span> <strong>{s.name}</strong>
                  </span>
                  {used >= NEAR_LIMIT && <span className="badge badge-PENDING">Perto do limite</span>}
                  <span className="sb-pct">{pct(s.approvedCents + s.pendingCents, s.budgetCents)}</span>
                </div>
                <BudgetMeter budget={s.budgetCents} approved={s.approvedCents} pending={s.pendingCents} />
                <div className="sb-foot muted small">
                  <span>
                    <span className="money">{formatBRL(s.approvedCents)}</span> aprovado
                    {s.pendingCount > 0 && (
                      <>
                        {' · '}
                        <span className="money">{formatBRL(s.pendingCents)}</span> em {plural(s.pendingCount, 'pedido', 'pedidos')}
                      </>
                    )}
                  </span>
                  <span>
                    orçamento <span className="money">{formatBRL(s.budgetCents)}</span>
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="panel card activity-card" aria-labelledby="t-act">
        <h2 id="t-act" className="card-title">
          Atividade recente
        </h2>
        <ol className="activity">
          {d.activity.slice(0, 6).map((a) => (
            <li key={a.id} data-type={a.type}>
              <span className="act-icon">
                <Icon name={a.type === 'APPROVED' ? 'check' : a.type === 'REJECTED' ? 'x' : 'plus'} size={14} />
              </span>
              <span className="act-body">
                <span>
                  <strong>{a.actor.split(' ')[0]}</strong> {ACT[a.type]}{' '}
                  <Link to={`/aprovacoes/${a.orderId}?filtro=todos`} className="mono">
                    {a.code}
                  </Link>
                </span>
                <span className="muted small">
                  {a.siteCode} · <span className="money">{formatBRL(a.totalCents)}</span> · {formatDateTime(a.at)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

const ACT = { CREATED: 'criou', APPROVED: 'aprovou', REJECTED: 'rejeitou' } as const

function duration(hours: number) {
  if (hours < 24) return plural(hours, 'hora', 'horas')
  const days = Math.round((hours / 24) * 10) / 10
  return `${days.toLocaleString('pt-BR')} ${days === 1 ? 'dia' : 'dias'}`
}

function DashSkeleton() {
  return (
    <div className="dash-grid" aria-busy="true" aria-label="Carregando painel">
      <div className="hero-card is-skeleton" />
      <div className="panel card donut-card skeleton-card" />
      <div className="mini-stack">
        <div className="panel card mini skeleton-card" />
        <div className="panel card mini skeleton-card" />
      </div>
      <div className="panel card months-card skeleton-card" />
      <div className="panel card suppliers-card skeleton-card" />
    </div>
  )
}
