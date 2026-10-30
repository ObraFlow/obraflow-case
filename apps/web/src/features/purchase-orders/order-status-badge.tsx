import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/lib/api/types';
import { ORDER_STATUS_LABELS } from '@/lib/format';
import { cn } from '@/lib/utils';

const STYLES: Record<OrderStatus, string> = {
  PENDING: 'bg-warning-soft text-warning-strong border-warning-border',
  APPROVED: 'bg-success-soft text-success-strong border-success-border',
  REJECTED: 'bg-danger-soft text-danger-strong border-danger-border',
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn('rounded-md', STYLES[status], className)}
    >
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
