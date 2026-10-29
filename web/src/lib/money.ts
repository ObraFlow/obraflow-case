import Decimal from 'decimal.js'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const quantityFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })

/** Largest value a Decimal(14, 2) column can hold (same limit as the API). */
export const MAX_MONEY = new Decimal('999999999999.99')

/**
 * Display only. Values arrive as decimal strings and are converted to number
 * just to format them; calculations never use floating point.
 */
export function formatBRL(value: string | number | Decimal) {
  return brl.format(Number(value.toString()))
}

/** "12.5" -> "12,5" */
export function formatQuantity(value: string | number) {
  return quantityFormat.format(Number(value))
}

/**
 * Reads what the user typed. Accepts a comma or a dot as decimal separator
 * ("12,5" or "12.5") and returns the API format ("12.5"), or null when it is
 * not a plain non-negative number (letters, minus sign, thousand separators).
 */
export function normalizeDecimal(input: string): string | null {
  const value = input.trim().replace(',', '.')
  return /^\d+(\.\d+)?$/.test(value) ? value : null
}

/**
 * Live mask for an amount typed in pt-BR: keeps digits and one comma, groups
 * thousands with dots and allows 2 decimals ("1234567,5" -> "1.234.567,5").
 * In this field a dot is always a thousand separator, never a decimal one.
 */
export function maskMoneyInput(input: string): string {
  const cleaned = input.replace(/[^\d,]/g, '')
  const comma = cleaned.indexOf(',')
  const integerPart = comma === -1 ? cleaned : cleaned.slice(0, comma)
  const integer = integerPart.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  if (comma === -1) return integer
  const decimals = cleaned
    .slice(comma + 1)
    .replace(/,/g, '')
    .slice(0, 2)
  return `${integer || '0'},${decimals}`
}

/** Reverse of the mask: "1.234.567,50" -> "1234567.50" (null when incomplete). */
export function parseMaskedMoney(input: string): string | null {
  return normalizeDecimal(input.replace(/\./g, ''))
}

/**
 * quantity x unit price rounded to cents, half up: the same rule the API uses
 * (Decimal, ROUND_HALF_UP), so the total on screen is the total saved.
 * Returns null while the inputs are not valid numbers.
 */
export function itemTotal(quantity: string, unitPrice: string): Decimal | null {
  const q = normalizeDecimal(quantity)
  const p = normalizeDecimal(unitPrice)
  if (q === null || p === null) return null
  return new Decimal(q).times(p).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
}

/** Sum of the rounded item totals (items still invalid count as zero). */
export function orderTotal(items: { quantity: string; unitPrice: string }[]): Decimal {
  return items.reduce(
    (sum, item) => sum.plus(itemTotal(item.quantity, item.unitPrice) ?? 0),
    new Decimal(0),
  )
}
