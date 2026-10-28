import Link from "next/link";
import { cn } from "@/lib/utils";

export type FiltroLista = "todos" | "minhas";

/**
 * Duas abas por link (a lista continua Server Component). O número só aparece na aba
 * "Aguardando minha decisão" e em amarelo, porque é a única coisa aqui que é "sua vez".
 */
export function AbasFiltro({ filtro, pendentes }: { filtro: FiltroLista; pendentes: number }) {
  const abas: Array<{ chave: FiltroLista; rotulo: string; href: string }> = [
    { chave: "todos", rotulo: "Todos os pedidos", href: "/aprovacoes" },
    { chave: "minhas", rotulo: "Aguardando minha decisão", href: "/aprovacoes?filtro=minhas" },
  ];

  return (
    <nav
      aria-label="Filtro de pedidos"
      className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0"
    >
      {abas.map((aba) => {
        const ativa = aba.chave === filtro;
        return (
          <Link
            key={aba.chave}
            href={aba.href}
            aria-current={ativa ? "page" : undefined}
            className={cn(
              "-mb-px flex h-10 items-center gap-2 border-b-[3px] px-3 text-sm whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
              ativa
                ? "border-foreground font-semibold text-foreground"
                : "border-transparent font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {aba.rotulo}
            {aba.chave === "minhas" && pendentes > 0 && (
              <span className="rounded-sm bg-sinalizacao px-1.5 text-[11px] leading-[18px] font-bold text-foreground tabular-nums">
                {pendentes}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
