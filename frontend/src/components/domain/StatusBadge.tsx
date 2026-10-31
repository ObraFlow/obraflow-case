import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/lib/types';

const map: Record<OrderStatus, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  APPROVED: { label: 'Aprovado', tone: 'success' },
  PENDING: { label: 'Pendente', tone: 'warning' },
  REJECTED: { label: 'Rejeitado', tone: 'danger' },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, tone } = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}
