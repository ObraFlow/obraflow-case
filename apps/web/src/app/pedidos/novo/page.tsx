import type { Metadata } from 'next';
import { NewOrderView } from '@/features/new-order/new-order-view';

export const metadata: Metadata = { title: 'Novo pedido' };

export default function NovoPedidoPage() {
  return <NewOrderView />;
}
