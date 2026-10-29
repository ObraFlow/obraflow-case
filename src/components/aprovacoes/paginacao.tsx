import Link from "next/link";
import { urlDaLista, type FiltrosDaLista } from "@/components/aprovacoes/url-da-lista";
import { CLASSE_LINK_PENDENTE, MarcadorPendente } from "@/components/layout/marcador-pendente";
import type { PaginaDePedidos } from "@/lib/dto";
import { cn } from "@/lib/utils";

/** 40px de alvo de toque no celular, 32px no desktop. */
const CLASSE_LINK =
  "inline-flex h-10 items-center rounded-sm border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:h-8";
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
      {/* O contador é informação, não ação inativa: fica em `text-foreground` para não se
          confundir com os links apagados das pontas. */}
      <p className="text-foreground tabular-nums">
        {pagina.total === 1 ? "1 pedido" : `${inicio} a ${fim} de ${pagina.total} pedidos`}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={urlDaLista({ ...valores, pagina: pagina.pagina - 1 })}
          aria-disabled={primeira || undefined}
          tabIndex={primeira ? -1 : undefined}
          className={cn(CLASSE_LINK, CLASSE_LINK_PENDENTE, primeira && CLASSE_DESABILITADO)}
        >
          <MarcadorPendente />
          Anterior
        </Link>
        <span className="tabular-nums">
          Página {pagina.pagina} de {pagina.totalPaginas}
        </span>
        <Link
          href={urlDaLista({ ...valores, pagina: pagina.pagina + 1 })}
          aria-disabled={ultima || undefined}
          tabIndex={ultima ? -1 : undefined}
          className={cn(CLASSE_LINK, CLASSE_LINK_PENDENTE, ultima && CLASSE_DESABILITADO)}
        >
          <MarcadorPendente />
          Próxima
        </Link>
      </div>
    </nav>
  );
}
