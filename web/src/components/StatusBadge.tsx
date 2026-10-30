import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types/api'

const config = {
  PENDING: { label: 'Pendente', icon: Clock, className: 'bg-amber-100 text-amber-900' },
  APPROVED: { label: 'Aprovado', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-900' },
  REJECTED: { label: 'Rejeitado', icon: XCircle, className: 'bg-red-100 text-red-900' },
} satisfies Record<OrderStatus, unknown>

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const { label, icon: Icon, className: colors } = config[status]
  return (
    <Badge variant="secondary" className={cn('gap-1', colors, className)}>
      <Icon aria-hidden />
      {label}
    </Badge>
  )
}
