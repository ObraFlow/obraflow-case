import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'ObraFlow - Gestão de Pedidos e Alçadas',
  description: 'Sistema de gestão de pedidos de compra com aprovação por alçada',
  keywords: ['obraflow', 'pedidos', 'alcada', 'aprovacao', 'construcao'],
  authors: [{ name: 'ObraFlow' }],
  openGraph: {
    title: 'ObraFlow',
    description: 'Sistema de gestão de pedidos de compra com aprovação por alçada',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAFA' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} antialiased`}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.className} min-h-screen bg-neutral-50 dark:bg-neutral-900`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}