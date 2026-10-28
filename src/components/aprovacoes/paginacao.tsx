import Link from "next/link";
import { urlDaLista, type FiltrosDaLista } from "@/components/aprovacoes/url-da-lista";
import type { PaginaDePedidos } from "@/lib/dto";
import { cn } from "@/lib/utils";

const CLASSE_LINK =
  "inline-flex h-8 items-center rounded-sm border border-border bg-card px-3 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
const CLASSE_DESABILITADO = "pointer-events-none opacity-45";

/** Rodapé "1 a 10 de 23" com Anterior e Próxima. Links: a lista continua Server Component. */
export function Paginacao({
  pagina,
  valores,
}: {
  pagina: Pick<PaginaDePedidos, "total" | "pagina" | "porPagina" | "totalPaginas">;
  valores: FiltrosDaLista;
}) {
  if (pagina.total === 0) return null;

  const inicio = (pagina.pagina - 1) * pagina.porPagina + 1;
  const fim = Math.min(pagina.pagina * pagina.porPagina, pagina.total);
  const primeira = pagina.pagina <= 1;
  const ultima = pagina.pagina >= pagina.totalPaginas;

  return (
    <nav
      aria-label="Paginação"
      className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"
    >
      <p className="tabular-nums">
        {pagina.total === 1 ? "1 pedido" : `${inicio} a ${fim} de ${pagina.total} pedidos`}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={urlDaLista({ ...valores, pagina: pagina.pagina - 1 })}
          aria-disabled={primeira || undefined}
          tabIndex={primeira ? -1 : undefined}
          className={cn(CLASSE_LINK, primeira && CLASSE_DESABILITADO)}
        >
          Anterior
        </Link>
        <span className="tabular-nums">
          Página {pagina.pagina} de {pagina.totalPaginas}
        </span>
        <Link
          href={urlDaLista({ ...valores, pagina: pagina.pagina + 1 })}
          aria-disabled={ultima || undefined}
          tabIndex={ultima ? -1 : undefined}
          className={cn(CLASSE_LINK, ultima && CLASSE_DESABILITADO)}
        >
          Próxima
        </Link>
      </div>
    </nav>
  );
}
