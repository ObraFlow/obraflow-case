import Decimal from 'decimal.js'
import { formatBRL } from '@/lib/money'

/**
 * A tier covers totals above the previous tier's limit (min, exclusive) and up
 * to its own limit (max, inclusive). Only max is stored; min is derived.
 */
export function tierRangeLabel(min: string | null, max: string | null) {
  if (min === null && max === null) return 'Qualquer valor'
  if (min === null) return `Até ${formatBRL(max!)}`
  if (max === null) return `Acima de ${formatBRL(min)}`
  return `De ${formatBRL(new Decimal(min).plus('0.01'))} a ${formatBRL(max)}`
}

/** Highest limit among the given ones that is below `limit` (null limit = no upper limit). */
export function previousLimit(limits: (string | null)[], limit: string | null): string | null {
  const bounded = limits.filter((value): value is string => value !== null)
  const below = limit === null ? bounded : bounded.filter((v) => new Decimal(v).lessThan(limit))
  if (below.length === 0) return null
  return below.reduce((a, b) => (new Decimal(a).greaterThan(b) ? a : b))
}
