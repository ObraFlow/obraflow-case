// Regra central da alçada: entre as faixas da obra, vale a de menor teto que
// comporta o total (limite inclusivo: "até R$ 10.000,00" inclui 10.000,00).
// A faixa sem teto (upToCents = null) pega tudo que passa das outras.
// Se nenhuma faixa comporta o total, o pedido não pode ser criado.

export interface TierLike {
  upToCents: number | null
}

export function sortTiers<T extends TierLike>(tiers: T[]): T[] {
  return [...tiers].sort((a, b) => (a.upToCents ?? Infinity) - (b.upToCents ?? Infinity))
}

export function resolveTier<T extends TierLike>(tiers: T[], totalCents: number): T | null {
  return sortTiers(tiers).find((t) => t.upToCents === null || totalCents <= t.upToCents) ?? null
}

// Piso de cada faixa = teto da anterior + 1 centavo. Só para exibição.
export function withLowerBounds<T extends TierLike>(tiers: T[]): Array<T & { fromCents: number }> {
  const sorted = sortTiers(tiers)
  return sorted.map((tier, i) => ({
    ...tier,
    fromCents: i === 0 ? 0 : (sorted[i - 1].upToCents ?? 0) + 1,
  }))
}
