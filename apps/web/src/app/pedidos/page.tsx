import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrdersListSkeleton } from '@/features/purchase-orders/orders-list';
import { OrdersView } from '@/features/purchase-orders/orders-view';

export const metadata: Metadata = { title: 'Pedidos' };

export default function PedidosPage() {
  return (
    // Suspense: a tela lê os filtros da URL (useSearchParams), que só existem no navegador.
    <Suspense fallback={<OrdersListSkeleton />}>
      <OrdersView />
    </Suspense>
  );
}
