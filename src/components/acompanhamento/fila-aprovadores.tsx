import Link from "next/link";
import { Barra } from "@/components/acompanhamento/barra";
import { descreverIdade } from "@/lib/datas";
import type { FilaAprovadorDto } from "@/lib/dto";
import { formatarCentavos } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Bloco 2: quanto está parado com cada aprovador agora, do maior valor para o menor, e há
 * quanto tempo o pedido mais antigo espera. A linha do usuário "Agindo como" é a única
 * amarela da tela: é a fila dele (docs/design.md: amarelo só onde o usuário atual age).
 */
export function FilaAprovadores({
  fila,
  usuarioAtualId,
  geradoEm,
}: {
  fila: FilaAprovadorDto[];
  usuarioAtualId: number | null;
  geradoEm: string;
}) {
  const maior = fila[0]?.totalCents ?? 0;

  return (
    <section aria-labelledby="fila-titulo" className="flex flex-col gap-3">
      <div>
        <h2 id="fila-titulo" className="text-lg font-bold">
          Fila por aprovador
        </h2>
        <p className="text-muted-foreground">
          Parado com cada pessoa agora, do maior valor para o menor.
        </p>
      </div>

      {fila.length === 0 ? (
        <div className="rounded-sm border bg-card p-6">
          <p className="font-medium">Nenhum pedido aguardando decisão.</p>
          <p className="text-muted-foreground">Todas as cadeias estão concluídas.</p>
        </div>
      ) : (
        <ol className="flex flex-col divide-y divide-linha rounded-sm border bg-card">
          {fila.map((linha) => {
            const minha = linha.aprovadorId === usuarioAtualId;
            return (
              <li
                key={linha.aprovadorId}
                className={cn("flex flex-col gap-2 px-5 py-4", minha && "bg-sinalizacao-fundo")}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <h3 className="flex items-center gap-2 font-semibold">
                    {linha.aprovadorNome}
                    {minha && (
                      <span className="rounded-sm bg-sinalizacao px-1 text-[11px] leading-4 font-bold text-foreground">
                        Você
                      </span>
                    )}
                  </h3>
                  <span className="font-semibold tabular-nums">
                    {formatarCentavos(linha.totalCents)}
                  </span>
                </div>
                <Barra
                  escala={maior}
                  segmentos={[
                    {
                      valor: linha.totalCents,
                      classe: "bg-foreground",
                      rotulo: `Parado: ${formatarCentavos(linha.totalCents)}`,
                    },
                  ]}
                />
                <p className="flex flex-wrap items-center gap-x-4 text-sm text-muted-foreground tabular-nums">
                  <span>
                    {linha.quantidade === 1
                      ? "1 pedido na fila"
                      : `${linha.quantidade} pedidos na fila`}
                  </span>
                  {/* A frase inteira é o link (alvo de toque de 40px no celular): é o único
                      caminho desta tela para o pedido. */}
                  <Link
                    href={`/aprovacoes/${linha.maisAntigo.pedidoId}`}
                    className="-my-2 inline-flex min-h-10 items-center underline-offset-4 hover:underline sm:my-0 sm:min-h-0"
                  >
                    Mais antigo:&nbsp;
                    <span className="font-medium text-foreground">
                      #{linha.maisAntigo.pedidoId}
                    </span>
                    , &nbsp;{descreverIdade(linha.maisAntigo.desde, geradoEm)} na mesa
                  </Link>
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
