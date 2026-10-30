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

// pt-BR: comma for decimals, dot only as a thousand separator in groups of 3.
const PT_BR_DECIMAL = /^(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$/

/**
 * Reads a number typed in pt-BR and returns the API format, or null when it is
 * not a plain non-negative number. "1.500" -> "1500", "1.234,56" -> "1234.56",
 * "12,5" -> "12.5". A dot that is not a thousand separator ("12.5") is refused
 * instead of guessed: in Brazil "1.500" means fifteen hundred, so reading dots
 * as decimals silently turned 1.500 bricks into 1,5.
 */
export function normalizeDecimal(input: string): string | null {
  const value = input.trim()
  if (!PT_BR_DECIMAL.test(value)) return null
  return value.replace(/\./g, '').replace(',', '.')
}

/** Number of decimal places of a value in API format ("12.50" -> 2). */
export function decimalPlaces(value: string) {
  return value.split('.')[1]?.length ?? 0
}

/** Same limits as the database columns: Decimal(14, 3) and Decimal(14, 2). */
export const QUANTITY_DECIMALS = 3
export const PRICE_DECIMALS = 2

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
  return normalizeDecimal(input)
}

/**
 * quantity x unit price rounded to cents, half up: the same rule the API uses
 * (Decimal, ROUND_HALF_UP), so the total on screen is the total saved.
 * Returns null while the inputs are not valid (including too many decimals),
 * so the screen never shows a total for a field marked as wrong.
 */
export function itemTotal(quantity: string, unitPrice: string): Decimal | null {
  const q = normalizeDecimal(quantity)
  const p = normalizeDecimal(unitPrice)
  if (q === null || p === null) return null
  if (decimalPlaces(q) > QUANTITY_DECIMALS || decimalPlaces(p) > PRICE_DECIMALS) return null
  if (new Decimal(q).isZero()) return null // quantity must be greater than zero
  return new Decimal(q).times(p).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
}

/** Sum of the rounded item totals (items still invalid count as zero). */
export function orderTotal(items: { quantity: string; unitPrice: string }[]): Decimal {
  return items.reduce(
    (sum, item) => sum.plus(itemTotal(item.quantity, item.unitPrice) ?? 0),
    new Decimal(0),
  )
}
