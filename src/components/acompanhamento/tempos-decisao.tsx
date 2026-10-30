import { Barra } from "@/components/acompanhamento/barra";
import { formatarDuracao } from "@/lib/datas";
import type { TempoAprovadorDto, TempoObraDto } from "@/lib/dto";

/**
 * Bloco 3: quanto tempo cada aprovador leva, em média, da chegada do pedido na mesa até a
 * decisão (o mais lento primeiro), e quanto tempo um pedido leva da criação ao encerramento,
 * por obra. "Chegada na mesa" é a criação no primeiro nível e a decisão anterior nos demais.
 */
export function TemposDecisao({
  porAprovador,
  porObra,
}: {
  porAprovador: TempoAprovadorDto[];
  porObra: TempoObraDto[];
}) {
  const maisLento = porAprovador[0]?.mediaMs ?? 0;

  return (
    <section aria-labelledby="tempos-titulo" className="flex flex-col gap-3">
      <div>
        <h2 id="tempos-titulo" className="text-lg font-bold">
          Tempo até decidir
        </h2>
        <p className="text-muted-foreground">
          Média entre o pedido chegar na mesa e a decisão, o mais lento primeiro.
        </p>
      </div>

      {porAprovador.length === 0 ? (
        <div className="rounded-sm border bg-card p-6">
          <p className="font-medium">Ainda sem decisões para medir.</p>
          <p className="text-muted-foreground">
            A média aparece depois da primeira aprovação ou rejeição.
          </p>
        </div>
      ) : (
        <div className="flex flex-col rounded-sm border bg-card">
          <ol className="flex flex-col divide-y divide-linha">
            {porAprovador.map((tempo) => (
              <li key={tempo.aprovadorId} className="flex flex-col gap-2 px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <h3 className="font-semibold">{tempo.aprovadorNome}</h3>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    média de{" "}
                    <span className="font-semibold text-foreground">
                      {formatarDuracao(tempo.mediaMs)}
                    </span>{" "}
                    em {tempo.decisoes === 1 ? "1 decisão" : `${tempo.decisoes} decisões`}
                  </span>
                </div>
                <Barra
                  escala={maisLento}
                  segmentos={[
                    {
                      valor: tempo.mediaMs,
                      classe: "bg-foreground",
                      rotulo: `Média: ${formatarDuracao(tempo.mediaMs)}`,
                    },
                  ]}
                />
              </li>
            ))}
          </ol>
          {porObra.length > 0 && (
            <div className="flex flex-col gap-1.5 border-t-2 border-foreground px-5 py-3 text-sm">
              <h3 className="text-xs font-semibold text-muted-foreground">
                Da criação ao encerramento, por obra
              </h3>
              <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1">
                {porObra.map((tempo) => (
                  <div key={tempo.obraId} className="contents">
                    <dt>{tempo.obraNome}</dt>
                    <dd className="text-right tabular-nums">
                      <span className="font-medium">{formatarDuracao(tempo.mediaMs)}</span>{" "}
                      <span className="text-muted-foreground">
                        em{" "}
                        {tempo.pedidosEncerrados === 1
                          ? "1 pedido"
                          : `${tempo.pedidosEncerrados} pedidos`}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
