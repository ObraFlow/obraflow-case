const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const quantityFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })

/**
 * Display only. Values arrive as decimal strings and are converted to number
 * just to format them; calculations never use floating point.
 */
export function formatBRL(value: string | number) {
  return brl.format(Number(value))
}

/** "12.5" -> "12,5" */
export function formatQuantity(value: string | number) {
  return quantityFormat.format(Number(value))
}
