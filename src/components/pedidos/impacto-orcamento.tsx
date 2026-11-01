"use client";

import { Barra } from "@/components/graficos/barra";
import type { ImpactoOrcamentoDto } from "@/lib/dto";
import { formatarCentavos } from "@/lib/money";

function Legenda({ classe, rotulo, valor }: { classe: string; rotulo: string; valor: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-sm ${classe}`} />
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="font-medium tabular-nums">{valor}</span>
    </span>
  );
}

/**
 * O que este pedido faz com o orçamento da obra, antes de enviar. Avisa, não bloqueia:
 * quem decide é a alçada. Por isso não é vermelho (não é rejeição) nem amarelo (não é
 * "sua vez"); passar do orçamento só deixa a frase em negrito.
 */
export function ImpactoOrcamento({ impacto }: { impacto: ImpactoOrcamentoDto }) {
  const estePedidoCents = impacto.comEsteCents - impacto.comprometidoAntesCents;

  return (
    <section
      aria-labelledby="impacto-orcamento-titulo"
      className="flex flex-col gap-2 rounded-sm bg-muted px-4 py-3"
    >
      <h3 id="impacto-orcamento-titulo" className="text-xs font-semibold text-muted-foreground">
        Orçamento da obra
      </h3>
      <Barra
        escala={Math.max(impacto.orcamentoCents, impacto.comEsteCents)}
        segmentos={[
          {
            valor: impacto.comprometidoAntesCents,
            classe: "bg-muted-foreground/60",
            rotulo: `Já comprometido: ${formatarCentavos(impacto.comprometidoAntesCents)}`,
          },
          {
            valor: estePedidoCents,
            classe: "bg-foreground",
            rotulo: `Este pedido: ${formatarCentavos(estePedidoCents)}`,
          },
        ]}
      />
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <Legenda
          classe="bg-muted-foreground/60"
          rotulo="Já comprometido"
          valor={formatarCentavos(impacto.comprometidoAntesCents)}
        />
        <Legenda
          classe="bg-foreground"
          rotulo="Este pedido"
          valor={formatarCentavos(estePedidoCents)}
        />
        <Legenda
          classe="bg-muted"
          rotulo="Orçamento"
          valor={formatarCentavos(impacto.orcamentoCents)}
        />
      </div>
      <p className="text-sm tabular-nums" aria-live="polite">
        {impacto.ultrapassa ? (
          <strong className="font-semibold">
            Este pedido ultrapassa o orçamento da obra em {formatarCentavos(impacto.excedenteCents)}
            .
          </strong>
        ) : (
          <>
            Depois deste pedido, a obra fica com{" "}
            <strong className="font-semibold">{formatarCentavos(impacto.comEsteCents)}</strong> dos{" "}
            <strong className="font-semibold">{formatarCentavos(impacto.orcamentoCents)}</strong> do
            orçamento comprometidos ({impacto.percentualComEste}%); restam{" "}
            {formatarCentavos(impacto.orcamentoCents - impacto.comEsteCents)}.
          </>
        )}
      </p>
    </section>
  );
}
