'use client';

import { Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav-items';

/** Conteúdo da barra lateral: usado fixo no desktop e dentro do menu (Sheet) no celular. */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <span
          aria-hidden="true"
          className="grid size-7 place-items-center rounded-md bg-sidebar-primary text-[13px] font-bold text-sidebar-primary-foreground"
        >
          O
        </span>
        <span className="text-[15px] font-bold tracking-tight text-white">
          ObraFlow
        </span>
      </div>

      <nav aria-label="Menu principal" className="flex-1 space-y-0.5 p-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent/60 hover:text-zinc-200',
              )}
            >
              <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <ThemeToggle />
      </div>
    </div>
  );
}

/** Desktop: barra lateral fixa. No celular ela some e vira o menu do topo. */
export function Sidebar() {
  return (
    <aside
      aria-label="Navegação"
      className="sticky top-0 hidden h-dvh w-60 shrink-0 lg:block"
    >
      <SidebarContent />
    </aside>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors hover:bg-sidebar-accent/60 hover:text-zinc-200"
    >
      {/* O ícone certo é escolhido via CSS: evita diferença entre o HTML do servidor e o do navegador. */}
      <Moon className="size-4 dark:hidden" aria-hidden="true" />
      <Sun className="hidden size-4 dark:block" aria-hidden="true" />
      <span className="dark:hidden">Modo escuro</span>
      <span className="hidden dark:inline">Modo claro</span>
    </button>
  );
}
