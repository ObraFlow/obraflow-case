import { Metadata } from 'next';
import { PedidoForm } from '@/components/pedidos/PedidoForm';
import { getObras, getFornecedores } from '@/lib/api';
import { getServerAuthSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Novo Pedido - ObraFlow',
  description: 'Cadastre um novo pedido de compra com itens',
};

export default async function NovoPedidoPage() {
  const session = await getServerAuthSession();
  const accessToken = (session as any)?.accessToken;

  if (!accessToken) {
    redirect('/login');
  }

  const [obras, fornecedores] = await Promise.all([
    getObras(accessToken),
    getFornecedores(accessToken),
  ]);

  return <PedidoForm obras={obras} fornecedores={fornecedores} />;
}
