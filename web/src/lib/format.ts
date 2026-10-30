const dateFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })

const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

/** PC-0006 */
export function formatOrderNumber(number: number) {
  return `PC-${String(number).padStart(4, '0')}`
}

/**
 * Date-only values (orderDate) are stored as midnight UTC. Formatting them in
 * UTC keeps 26/10 as 26/10; in Brazil's timezone it would show 25/10.
 */
export function formatDate(iso: string) {
  return dateFormat.format(new Date(iso))
}

/** Moments in time (decisions, events), shown in the user's timezone. */
export function formatDateTime(iso: string) {
  return dateTimeFormat.format(new Date(iso))
}

/** Today in the user's timezone, as YYYY-MM-DD for <input type="date">. */
export function todayIsoDate() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

/** 11222333000181 -> 11.222.333/0001-81 */
export function formatCnpj(digits: string) {
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0]
}
