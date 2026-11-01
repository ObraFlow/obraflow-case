import Link from "next/link";
import { Barra } from "@/components/graficos/barra";
import type { ContagemDto, OrcamentoObraDto, ResumoObraDto } from "@/lib/dto";
import { formatarCentavos } from "@/lib/money";
import { cn } from "@/lib/utils";

function Contagem({ rotulo, contagem }: { rotulo: string; contagem: ContagemDto }) {
  return (
    <div className="flex flex-col gap-0.5 text-right">
      <dt className="text-xs font-semibold text-muted-foreground">{rotulo}</dt>
      <dd className="tabular-nums">
        {contagem.quantidade === 0
          ? "nenhum"
          : contagem.quantidade === 1
            ? "1 pedido"
            : `${contagem.quantidade} pedidos`}
      </dd>
      <dd className="font-medium tabular-nums">{formatarCentavos(contagem.totalCents)}</dd>
    </div>
  );
}

/**
 * Aviso de orçamento, só texto com contorno: não é status de pedido nem "sua vez". O
 * critério é do domínio (`quaseNoLimite`, resumoOrcamento); aqui só se decide a aparência.
 */
function AvisoOrcamento({ orcamento }: { orcamento: OrcamentoObraDto }) {
  if (orcamento.disponivelCents !== null && orcamento.disponivelCents <= 0) {
    return (
      <span className="rounded-sm bg-foreground px-1.5 text-[11px] leading-4 font-bold text-on-color">
        Acima do orçamento
      </span>
    );
  }
  if (orcamento.quaseNoLimite) {
    return (
      <span className="rounded-sm border border-foreground px-1.5 text-[11px] leading-4 font-bold">
        Quase no limite
      </span>
    );
  }
  return null;
}

/**
 * Uma linha por obra, sempre todas (o bloco existe para comparar): quanto do orçamento já
 * está comprometido (aprovado + em aprovação) e os pedidos por situação. O nome da obra é o
 * link que filtra a tela; com filtro ativo, as outras obras ficam esmaecidas. Sem orçamento
 * cadastrado a barra mostra só a proporção entre as situações, como antes.
 */
export function OrcamentoDasObras({
  porObra,
  obraSelecionadaId,
}: {
  porObra: ResumoObraDto[];
  obraSelecionadaId: number | null;
}) {
  return (
    <section aria-labelledby="orcamento-obras-titulo" className="flex flex-col gap-3">
      <div>
        <h2 id="orcamento-obras-titulo" className="text-lg font-bold">
          Orçamento das obras
        </h2>
        <p className="text-muted-foreground">
          Aprovado e em aprovação contra o orçamento de cada obra. Clique na obra para ver só ela.
        </p>
      </div>
      <ol className="flex flex-col divide-y divide-linha rounded-sm border bg-card">
        {porObra.map((obra) => {
          const { orcamento } = obra;
          const temOrcamento = orcamento.orcamentoCents > 0;
          const selecionada = obraSelecionadaId === obra.obraId;
          const esmaecida = obraSelecionadaId !== null && !selecionada;
          return (
            <li
              key={obra.obraId}
              aria-current={selecionada ? "true" : undefined}
              className={cn("flex flex-col gap-2 px-5 py-4", esmaecida && "opacity-50")}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h3 className="flex flex-wrap items-center gap-2 font-semibold">
                  <Link
                    href={selecionada ? "/acompanhamento" : `/acompanhamento?obra=${obra.obraId}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {obra.obraNome}
                  </Link>
                  <AvisoOrcamento orcamento={orcamento} />
                </h3>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {temOrcamento ? (
                    <>
                      <span className="font-semibold text-foreground">
                        {formatarCentavos(orcamento.comprometidoCents)}
                      </span>{" "}
                      de {formatarCentavos(orcamento.orcamentoCents)} (
                      {orcamento.percentualComprometido}%)
                    </>
                  ) : (
                    <>
                      sem orçamento cadastrado. Total{" "}
                      <span className="font-semibold text-foreground">
                        {formatarCentavos(obra.totalCents)}
                      </span>
                    </>
                  )}
                </span>
              </div>
              <Barra
                escala={
                  temOrcamento
                    ? Math.max(orcamento.orcamentoCents, orcamento.comprometidoCents)
                    : obra.totalCents
                }
                segmentos={[
                  {
                    valor: obra.aprovados.totalCents,
                    classe: "bg-aprovado",
                    rotulo: `Aprovado: ${formatarCentavos(obra.aprovados.totalCents)}`,
                  },
                  {
                    valor: obra.pendentes.totalCents,
                    classe: "bg-muted-foreground/60",
                    rotulo: `Em aprovação: ${formatarCentavos(obra.pendentes.totalCents)}`,
                  },
                  ...(temOrcamento
                    ? []
                    : [
                        {
                          valor: obra.rejeitados.totalCents,
                          classe: "bg-rejeitado",
                          rotulo: `Rejeitado: ${formatarCentavos(obra.rejeitados.totalCents)}`,
                        },
                      ]),
                ]}
              />
              <dl className="grid grid-cols-3 gap-x-4 text-sm">
                <Contagem rotulo="Em aprovação" contagem={obra.pendentes} />
                <Contagem rotulo="Aprovado" contagem={obra.aprovados} />
                <Contagem rotulo="Rejeitado" contagem={obra.rejeitados} />
              </dl>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
