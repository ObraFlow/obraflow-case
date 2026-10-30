import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PedidoDetail } from '@/components/pedidos/PedidoDetail';
import { getPedido } from '@/lib/api';
import { getServerAuthSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Detalhes do Pedido - ObraFlow',
};

export default async function PedidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerAuthSession();
  const accessToken = (session as any)?.accessToken;
  const pedido = await getPedido(id, accessToken);

  if (!pedido) {
    notFound();
  }

  return (
    <PedidoDetail
      pedido={pedido}
    />
  );
}