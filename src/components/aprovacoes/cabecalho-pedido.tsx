import Link from "next/link";
import { BadgeSituacao } from "@/components/aprovacoes/badge-situacao";
import { formatarData } from "@/lib/datas";
import type { PedidoDetalhe } from "@/lib/dto";
import { formatarCentavos } from "@/lib/money";

/** Identificação do pedido: texto bem alinhado, sem card decorativo (ui-obraflow > Detalhe). */
export function CabecalhoPedido({ pedido }: { pedido: PedidoDetalhe }) {
  const campos: Array<[string, string]> = [
    ["Obra", pedido.obraNome],
    ["Fornecedor", pedido.fornecedorNome],
    ["Data do pedido", formatarData(pedido.dataPedido)],
    ["Criado por", pedido.criadoPorNome],
  ];

  // Um rejeitado sem nova versão pode ser refeito; a nova versão passa pela alçada do zero.
  const podeRefazer = pedido.status === "REJEITADO" && pedido.refeitoPor === null;

  return (
    <div className="flex flex-col gap-3">
      {/* Trilha: onde a pessoa está e o caminho de volta. "/" é caminho, não separador decorativo. */}
      <nav
        aria-label="Você está em"
        // 40px de alvo de toque no celular; o -mt compensa para o texto não descer.
        className="-mt-2 flex min-h-10 items-center gap-2 text-sm text-muted-foreground sm:mt-0 sm:min-h-0"
      >
        <Link href="/aprovacoes" className="font-medium underline-offset-4 hover:underline">
          Aprovações
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="font-medium text-foreground tabular-nums">
          #{pedido.id}
        </span>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-[-0.015em] font-stretch-[112%] tabular-nums">
              Pedido #{pedido.id}
            </h1>
            <BadgeSituacao status={pedido.status} />
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm sm:flex sm:flex-wrap sm:gap-x-6">
            {campos.map(([rotulo, valor]) => (
              <div key={rotulo} className="contents sm:flex sm:flex-col">
                <dt className="text-xs font-semibold text-muted-foreground">{rotulo}</dt>
                <dd className="tabular-nums">{valor}</dd>
              </div>
            ))}
          </dl>
          {(pedido.refeitoDe || pedido.refeitoPor) && (
            <p className="text-sm text-muted-foreground tabular-nums">
              {pedido.refeitoDe && (
                <>
                  Nova versão do{" "}
                  <Link
                    href={`/aprovacoes/${pedido.refeitoDe.id}`}
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    pedido #{pedido.refeitoDe.id}
                  </Link>
                  , que foi rejeitado.
                </>
              )}
              {pedido.refeitoPor && (
                <>
                  Refeito pelo{" "}
                  <Link
                    href={`/aprovacoes/${pedido.refeitoPor.id}`}
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    pedido #{pedido.refeitoPor.id}
                  </Link>
                  .
                </>
              )}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-col sm:items-end">
            <span className="text-xs font-semibold text-muted-foreground">Total do pedido</span>
            <span className="text-2xl font-bold tabular-nums">
              {formatarCentavos(pedido.totalCents)}
            </span>
          </div>
          {podeRefazer && (
            <Link
              href={`/pedidos/novo?refazer=${pedido.id}`}
              className="inline-flex h-10 items-center rounded-sm border border-foreground px-3 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none sm:h-[38px]"
            >
              Refazer o pedido
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
