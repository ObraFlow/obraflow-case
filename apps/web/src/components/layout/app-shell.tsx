'use client';

import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { pageTitle } from './nav-items';
import { Sidebar, SidebarContent } from './sidebar';
import { ViewerSwitcher } from './viewer-switcher';

/** Estrutura comum às três telas: barra lateral, topo (título + "Visualizando como") e conteúdo. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b bg-card px-4 sm:px-6 lg:flex lg:justify-between">
          <MobileMenu />
          <h1 className="text-center text-[15px] font-semibold lg:text-left">
            {pageTitle(pathname)}
          </h1>
          <div className="flex justify-end">
            <ViewerSwitcher />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-7">{children}</main>
      </div>
    </div>
  );
}

/** Celular/tablet: a barra lateral abre num menu lateral pelo botão do topo. */
function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Abrir menu"
        className="-ml-2 grid size-10 place-items-center rounded-md hover:bg-muted lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-64 border-0 p-0"
        showCloseButton={false}
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Navegação principal
        </SheetDescription>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
