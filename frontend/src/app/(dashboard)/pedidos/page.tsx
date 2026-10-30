import { Metadata } from 'next';
import { PedidosList } from '@/components/pedidos/PedidosList';

export const metadata: Metadata = {
  title: 'Pedidos - ObraFlow',
  description: 'Lista de pedidos de compra',
};

export default function PedidosPage() {
  return <PedidosList />;
}