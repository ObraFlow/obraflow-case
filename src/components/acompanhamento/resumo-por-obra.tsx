import { Barra } from "@/components/acompanhamento/barra";
import type { ContagemDto, ResumoObraDto } from "@/lib/dto";
import { formatarCentavos } from "@/lib/money";

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
 * Bloco 1: por obra, quanto está pendente, aprovado e rejeitado, com uma barra empilhada
 * proporcional ao valor. Pendente em cinza escuro (o cinza da borda some sobre o trilho),
 * aprovado e rejeitado nas cores de status; o amarelo não entra aqui porque nada nesta
 * tela é "sua vez" (docs/design.md).
 */
export function ResumoPorObra({ porObra }: { porObra: ResumoObraDto[] }) {
  return (
    <section aria-labelledby="por-obra-titulo" className="flex flex-col gap-3">
      <div>
        <h2 id="por-obra-titulo" className="text-lg font-bold">
          Por obra
        </h2>
        <p className="text-muted-foreground">Pendente, aprovado e rejeitado em cada obra.</p>
      </div>
      <ol className="flex flex-col divide-y divide-linha rounded-sm border bg-card">
        {porObra.map((obra) => (
          <li key={obra.obraId} className="flex flex-col gap-2 px-5 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h3 className="font-semibold">{obra.obraNome}</h3>
              <span className="text-sm text-muted-foreground tabular-nums">
                Total{" "}
                <span className="font-semibold text-foreground">
                  {formatarCentavos(obra.totalCents)}
                </span>
              </span>
            </div>
            <Barra
              escala={obra.totalCents}
              segmentos={[
                {
                  valor: obra.pendentes.totalCents,
                  classe: "bg-muted-foreground/60",
                  rotulo: `Pendente: ${formatarCentavos(obra.pendentes.totalCents)}`,
                },
                {
                  valor: obra.aprovados.totalCents,
                  classe: "bg-aprovado",
                  rotulo: `Aprovado: ${formatarCentavos(obra.aprovados.totalCents)}`,
                },
                {
                  valor: obra.rejeitados.totalCents,
                  classe: "bg-rejeitado",
                  rotulo: `Rejeitado: ${formatarCentavos(obra.rejeitados.totalCents)}`,
                },
              ]}
            />
            <dl className="grid grid-cols-3 gap-x-4 text-sm">
              <Contagem rotulo="Pendente" contagem={obra.pendentes} />
              <Contagem rotulo="Aprovado" contagem={obra.aprovados} />
              <Contagem rotulo="Rejeitado" contagem={obra.rejeitados} />
            </dl>
          </li>
        ))}
      </ol>
    </section>
  );
}
