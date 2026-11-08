import type { OrderSummary, Person } from '../api/types'
import { formatBRL, since } from './format'

// Lembrete pronto para o aprovador da vez. Obra se resolve no WhatsApp,
// então o sistema entrega a mensagem escrita em vez de pedir para copiar dados.
export function reminderLink(order: OrderSummary, approver: Person) {
  if (!approver.phone) return null
  const first = approver.name.split(' ')[0]
  const waiting = order.waitingSince ? ` ${since(order.waitingSince)}` : ''
  const text =
    `Olá, ${first}! O pedido ${order.code} (${formatBRL(order.totalCents)}, ${order.site.code} · ${order.supplier.name}) ` +
    `aguarda sua aprovação${waiting}.\n${window.location.origin}/aprovacoes/${order.id}`
  return `https://wa.me/${approver.phone}?text=${encodeURIComponent(text)}`
}
