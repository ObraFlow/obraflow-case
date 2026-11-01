"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Client component só para marcar a rota ativa (usePathname). O contador vem pronto do
// server como ReactNode, então este componente não busca nada.
//
// Em rotas com parâmetro dinâmico (`/aprovacoes/[id]`) o pathname só existe na request,
// então `usePathname` suspende durante o prerender do App Shell e o Header precisa envolver
// a <Navegacao> em <Suspense>. O fallback é a mesma lista sem item ativo (`ListaNavegacao`).

const ITENS = [
  { href: "/aprovacoes", rotulo: "Aprovações" },
  { href: "/pedidos/novo", rotulo: "Novo pedido" },
  { href: "/regras", rotulo: "Regras" },
  { href: "/acompanhamento", rotulo: "Acompanhamento" },
] as const;

export function Navegacao({ contadorAprovacoes }: { contadorAprovacoes: React.ReactNode }) {
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);

  // No celular a navegação rola na horizontal e o último item fica fora da tela: ao trocar
  // de rota, trazemos o item ativo para a área visível (só rola a barra, não a página).
  // Repete quando a fonte carrega e quando o contador de pendências chega por streaming,
  // porque os dois mudam a largura dos itens depois da primeira passada.
  useEffect(() => {
    const rolar = () =>
      nav.current
        ?.querySelector<HTMLElement>("[aria-current='page']")
        ?.scrollIntoView({ inline: "nearest", block: "nearest" });
    rolar();
    void document.fonts.ready.then(rolar);
    const observador = new ResizeObserver(rolar);
    for (const item of nav.current?.children ?? []) observador.observe(item);
    return () => observador.disconnect();
  }, [pathname]);

  return <ListaNavegacao ref={nav} pathname={pathname} contadorAprovacoes={contadorAprovacoes} />;
}

/** A lista em si. `pathname` null = ainda não se sabe a rota (fallback do Suspense). */
export function ListaNavegacao({
  ref,
  pathname,
  contadorAprovacoes,
}: {
  ref?: React.Ref<HTMLElement>;
  pathname: string | null;
  contadorAprovacoes: React.ReactNode;
}) {
  return (
    <nav
      ref={ref}
      aria-label="Principal"
      className="flex h-12 scroll-px-4 px-4 sm:px-8 lg:h-14 lg:px-0"
    >
      {ITENS.map((item) => {
        const ativo =
          pathname !== null && (pathname === item.href || pathname.startsWith(item.href + "/"));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 border-b-[3px] px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
              ativo
                ? "border-sinalizacao text-header-foreground"
                : "border-transparent text-header-foreground/75 hover:text-header-foreground",
            )}
          >
            {item.rotulo}
            {item.href === "/aprovacoes" ? contadorAprovacoes : null}
          </Link>
        );
      })}
    </nav>
  );
}
