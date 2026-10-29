const DECIMAL_PATTERN = /^(\d+)(?:[.,](\d*))?$/

/** Converts a decimal string to an integer at the requested scale without floating point rounding. */
export function parseDecimalScaled(value: string, scale: number): bigint | null {
  const trimmed = value.trim()
  const match = DECIMAL_PATTERN.exec(trimmed)
  if (!match) return null
  const fraction = match[2] ?? ''
  if (fraction.length > scale) return null
  const factor = 10n ** BigInt(scale)
  return BigInt(match[1]) * factor + BigInt((fraction + '0'.repeat(scale)).slice(0, scale) || '0')
}

/** Calculates a line amount in cents, rounding half up to match the backend policy. */
export function lineTotalCents(quantity: string, unitPrice: string): bigint | null {
  const quantityMillis = parseDecimalScaled(quantity, 3)
  const unitPriceCents = parseDecimalScaled(unitPrice, 2)
  if (quantityMillis === null || quantityMillis <= 0n || unitPriceCents === null) return null
  return (quantityMillis * unitPriceCents + 500n) / 1000n
}

/** Formats integer cents as a Brazilian real amount. */
export function formatCurrencyCents(cents: bigint): string {
  const reais = cents / 100n
  const centavos = (cents % 100n).toString().padStart(2, '0')
  return `R$ ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(reais)},${centavos}`
}

/** Returns a decimal representation suitable for a JSON BigDecimal field. */
export function decimalString(value: string, scale: number): string {
  const scaled = parseDecimalScaled(value, scale)
  if (scaled === null) return ''
  const factor = 10n ** BigInt(scale)
  const whole = scaled / factor
  const fraction = (scaled % factor).toString().padStart(scale, '0')
  return scale ? `${whole}.${fraction}` : whole.toString()
}
