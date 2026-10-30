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

  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/aprovacoes"
        // 40px de alvo de toque no celular; o -mt compensa para o texto não descer.
        className="-mt-2 flex min-h-10 w-fit items-center text-sm font-medium text-muted-foreground underline-offset-4 hover:underline sm:mt-0 sm:min-h-0"
      >
        Voltar para aprovações
      </Link>
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
        </div>
        <div className="flex flex-col sm:items-end">
          <span className="text-xs font-semibold text-muted-foreground">Total do pedido</span>
          <span className="text-2xl font-bold tabular-nums">
            {formatarCentavos(pedido.totalCents)}
          </span>
        </div>
      </div>
    </div>
  );
}
