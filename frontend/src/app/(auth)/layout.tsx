import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - ObraFlow',
  description: 'Acesse o sistema de gestão de pedidos e alçadas',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
