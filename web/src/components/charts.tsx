import { useState } from 'react'
import { formatBRL } from '../lib/format'

// Gráficos em SVG à mão: são poucos, simples e precisam seguir os tokens de cor
// nos dois temas. Uma lib de gráficos pesaria mais que a página inteira.

const compact = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1, style: 'currency', currency: 'BRL' })

/** Linha suave para dentro do card de destaque. */
export function Sparkline({ values, height = 90 }: { values: number[]; height?: number }) {
  const w = 300
  const max = Math.max(...values, 1)
  const pts = values.map((v, i) => [(i / Math.max(values.length - 1, 1)) * w, height - 6 - (v / max) * (height - 12)])
  // curva de Catmull-Rom convertida em Bézier: passa por todos os pontos sem "quinas"
  const d = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`
    const [x0, y0] = pts[i - 2] ?? pts[i - 1]
    const [x1, y1] = pts[i - 1]
    const [x3, y3] = pts[i + 1] ?? [x, y]
    const c1 = [x1 + (x - x0) / 6, y1 + (y - y0) / 6]
    const c2 = [x - (x3 - x1) / 6, y - (y3 - y1) / 6]
    return `${acc} C${c1.join(',')} ${c2.join(',')} ${x},${y}`
  }, '')
  const last = pts.at(-1)!
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="spark-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${height} L0,${height} Z`} fill="url(#spark-fade)" />
      <path d={d} className="spark-line" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="4" className="spark-dot" />
    </svg>
  )
}

/** Anel com segmentos (aprovado, em aprovação) sobre o total do orçamento. */
export function Donut({
  segments,
  total,
  size = 168,
  children,
}: {
  segments: { value: number; className: string; label: string }[]
  total: number
  size?: number
  children?: React.ReactNode
}) {
  const stroke = 16
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={segments.map((s) => `${s.label}: ${pct(s.value, total)}`).join(', ')}>
        <circle cx={size / 2} cy={size / 2} r={r} className="donut-track" strokeWidth={stroke} fill="none" />
        {segments.map((s) => {
          const len = total > 0 ? Math.min(s.value / total, 1) * c : 0
          const el = (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap={len > 0 ? 'round' : 'butt'}
              className={s.className}
              strokeDasharray={`${Math.max(len - 4, 0)} ${c}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          )
          offset += len
          return el
        })}
      </svg>
      <div className="donut-center">{children}</div>
    </div>
  )
}

export const pct = (value: number, total: number) =>
  total > 0 ? `${(Math.round((value / total) * 1000) / 10).toLocaleString('pt-BR')}%` : '–'

const MONTH = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const monthLabel = (key: string) => MONTH[Number(key.slice(5, 7)) - 1]

/** Barras por mês; o mês atual em destaque, valor ao passar o mouse ou focar. */
export function MonthBars({ data }: { data: { month: string; approvedCents: number; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.approvedCents), 1)
  const [active, setActive] = useState(data.length - 1)
  const ticks = [1, 0.5, 0]
  return (
    <div className="bars">
      <div className="bars-axis" aria-hidden="true">
        {ticks.map((t) => (
          <span key={t}>{compact(max * t)}</span>
        ))}
      </div>
      <ol className="bars-plot" aria-label="Gasto aprovado por mês">
        {data.map((d, i) => (
          <li key={d.month} data-current={i === data.length - 1 || undefined} data-active={i === active || undefined}>
            <button
              type="button"
              className="bar"
              style={{ '--h': `${(d.approvedCents / max) * 100}%` } as React.CSSProperties}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              aria-label={`${monthLabel(d.month)}: ${formatBRL(d.approvedCents)} em ${d.count} pedidos`}
            >
              {i === active && (
                <span className="bar-tip money" aria-hidden="true">
                  {formatBRL(d.approvedCents)}
                </span>
              )}
            </button>
            <span className="bar-label">{monthLabel(d.month)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Barra de orçamento: aprovado (cheio) + em aprovação (listrado) sobre o total. */
export function BudgetMeter({
  budget,
  approved,
  pending,
  draft = 0,
}: {
  budget: number
  approved: number
  pending: number
  draft?: number
}) {
  const w = (v: number) => `${budget > 0 ? Math.min((v / budget) * 100, 100) : 0}%`
  return (
    <div className="meter" aria-hidden="true">
      <span className="meter-approved" style={{ width: w(approved) }} />
      <span className="meter-pending" style={{ width: w(pending) }} />
      {draft > 0 && <span className="meter-draft" style={{ width: w(draft) }} />}
    </div>
  )
}
