"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
] as const;

export function Navegacao({ contadorAprovacoes }: { contadorAprovacoes: React.ReactNode }) {
  const pathname = usePathname();
  return <ListaNavegacao pathname={pathname} contadorAprovacoes={contadorAprovacoes} />;
}

/** A lista em si. `pathname` null = ainda não se sabe a rota (fallback do Suspense). */
export function ListaNavegacao({
  pathname,
  contadorAprovacoes,
}: {
  pathname: string | null;
  contadorAprovacoes: React.ReactNode;
}) {
  return (
    <nav aria-label="Principal" className="flex h-12 px-4 sm:h-14 sm:px-0">
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
                ? "border-sinalizacao text-white"
                : "border-transparent text-white/75 hover:text-white",
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
