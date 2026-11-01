import { Barra } from "@/components/graficos/barra";
import type { OrcamentoObraDto } from "@/lib/dto";
import { formatarCentavos } from "@/lib/money";

function Legenda({ classe, rotulo, valor }: { classe: string; rotulo: string; valor: string }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-sm ${classe}`} />
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="ml-auto font-medium tabular-nums">{valor}</dd>
    </div>
  );
}

/**
 * O número que quem administra quer primeiro: quanto do orçamento já está comprometido
 * (aprovado mais em aprovação) e quanto sobra. Com filtro é a obra; sem filtro é a soma
 * das obras que têm orçamento. Sem orçamento cadastrado, só os valores.
 */
export function Comprometido({
  orcamento,
  titulo,
}: {
  orcamento: OrcamentoObraDto;
  titulo: string;
}) {
  const temOrcamento = orcamento.orcamentoCents > 0;
  const livreCents = Math.max(0, orcamento.disponivelCents ?? 0);
  const acimaCents = Math.max(0, -(orcamento.disponivelCents ?? 0));

  return (
    <section aria-labelledby="comprometido-titulo" className="flex flex-col gap-3">
      <div>
        <h2 id="comprometido-titulo" className="text-lg font-bold">
          Orçamento comprometido
        </h2>
        <p className="text-muted-foreground">{titulo}</p>
      </div>
      <div className="flex flex-col gap-3 rounded-sm border bg-card px-5 py-4">
        <div className="flex flex-col">
          <span className="text-3xl leading-none font-bold tabular-nums">
            {formatarCentavos(orcamento.comprometidoCents)}
          </span>
          <span className="mt-1 text-sm text-muted-foreground tabular-nums">
            {temOrcamento ? (
              <>
                <span className="font-semibold text-foreground">
                  {orcamento.percentualComprometido}%
                </span>{" "}
                de {formatarCentavos(orcamento.orcamentoCents)} orçados
              </>
            ) : (
              "Sem orçamento cadastrado para comparar."
            )}
          </span>
        </div>
        {temOrcamento && (
          <Barra
            escala={Math.max(orcamento.orcamentoCents, orcamento.comprometidoCents)}
            segmentos={[
              {
                valor: orcamento.aprovadoCents,
                classe: "bg-aprovado",
                rotulo: `Aprovado: ${formatarCentavos(orcamento.aprovadoCents)}`,
              },
              {
                valor: orcamento.pendenteCents,
                classe: "bg-muted-foreground/60",
                rotulo: `Em aprovação: ${formatarCentavos(orcamento.pendenteCents)}`,
              },
            ]}
          />
        )}
        <dl className="flex flex-col gap-1 text-sm">
          <Legenda
            classe="bg-aprovado"
            rotulo="Aprovado"
            valor={formatarCentavos(orcamento.aprovadoCents)}
          />
          <Legenda
            classe="bg-muted-foreground/60"
            rotulo="Em aprovação"
            valor={formatarCentavos(orcamento.pendenteCents)}
          />
          {temOrcamento &&
            (acimaCents > 0 ? (
              <Legenda
                classe="bg-foreground"
                rotulo="Acima do orçamento"
                valor={formatarCentavos(acimaCents)}
              />
            ) : (
              <Legenda classe="bg-muted" rotulo="Livre" valor={formatarCentavos(livreCents)} />
            ))}
        </dl>
      </div>
    </section>
  );
}
