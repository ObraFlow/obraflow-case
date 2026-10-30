import {
  ClipboardCheck,
  type LucideIcon,
  Plus,
  ShieldCheck,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}

/** Itens da navegação principal (barra lateral e menu do celular). */
export const NAV_ITEMS: NavItem[] = [
  {
    href: '/pedidos',
    label: 'Pedidos',
    icon: ClipboardCheck,
    isActive: (pathname) =>
      pathname === '/pedidos' ||
      (pathname.startsWith('/pedidos/') && pathname !== '/pedidos/novo'),
  },
  {
    href: '/pedidos/novo',
    label: 'Novo pedido',
    icon: Plus,
    isActive: (pathname) => pathname === '/pedidos/novo',
  },
  {
    href: '/alcadas',
    label: 'Alçadas',
    icon: ShieldCheck,
    isActive: (pathname) => pathname.startsWith('/alcadas'),
  },
];

/** Título exibido no topo, a partir da rota atual. */
export function pageTitle(pathname: string): string {
  return NAV_ITEMS.find((item) => item.isActive(pathname))?.label ?? 'Dokimos';
}
