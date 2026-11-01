import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { QueryProvider } from '@/lib/query-provider';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'ObraFlow · Aprovações',
  description: 'Gestão de pedidos de compra e alçadas de aprovação.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
