import { MarcadorNivel } from "@/components/alcada/marcador-nivel";
import { ehSuaVez, estadoDoNivel, type EstadoNivel } from "@/lib/cadeia";
import { formatarDataHora } from "@/lib/datas";
import type { AprovacaoDto, PedidoDetalhe } from "@/lib/dto";
import { cn } from "@/lib/utils";

function descricao(aprovacao: AprovacaoDto, estado: EstadoNivel, suaVez: boolean): string {
  const quando = aprovacao.decididoEm ? ` em ${formatarDataHora(aprovacao.decididoEm)}` : "";
  switch (estado) {
    case "aprovou":
      return `Aprovou${quando}`;
    case "rejeitou":
      return `Rejeitou${quando}`;
    case "atual":
      return suaVez ? "Aguardando a sua decisão" : "Aguardando a decisão";
    case "cancelado":
      return "Não chegou a decidir";
    default:
      return "Ainda não decidiu";
  }
}

const CLASSE_TEXTO: Record<EstadoNivel, string> = {
  proximo: "text-muted-foreground",
  herdado: "text-muted-foreground",
  atual: "font-semibold text-foreground",
  aprovou: "text-foreground",
  rejeitou: "text-rejeitado",
  cancelado: "text-cancelado",
};

/**
 * Histórico da alçada, um nível por linha, na ordem de decisão: concluídos (quando), o
 * atual (aguardando), os próximos (apagados). A rejeição aparece no nível em que ocorreu,
 * com o motivo; os níveis seguintes ficam riscados.
 */
export function TimelineAlcada({
  pedido,
  usuarioAtualId,
}: {
  pedido: PedidoDetalhe;
  usuarioAtualId: number | null;
}) {
  return (
    <section aria-labelledby="alcada-titulo" className="flex min-w-0 flex-col gap-3">
      <h2 id="alcada-titulo" className="text-lg font-bold">
        Alçada
      </h2>
      <ol className="flex flex-col rounded-sm border bg-card px-5 py-4">
        {pedido.aprovacoes.map((aprovacao, indice) => {
          const estado = estadoDoNivel(aprovacao, pedido);
          const ultimo = indice === pedido.aprovacoes.length - 1;
          const suaVez = estado === "atual" && ehSuaVez(pedido, usuarioAtualId);
          return (
            <li key={aprovacao.ordem} className="flex gap-3">
              <div className="flex flex-col items-center">
                <MarcadorNivel numero={indice + 1} estado={estado} />
                {!ultimo && <span aria-hidden="true" className="my-1 w-px flex-1 bg-border" />}
              </div>
              <div className={cn("flex min-w-0 flex-1 flex-col gap-0.5", !ultimo && "pb-4")}>
                <p
                  className={cn(
                    "leading-7 font-semibold",
                    estado === "cancelado" && "text-cancelado line-through",
                  )}
                >
                  {aprovacao.aprovadorNome}
                </p>
                <p className={cn("text-sm tabular-nums", CLASSE_TEXTO[estado])}>
                  {descricao(aprovacao, estado, suaVez)}
                </p>
                {estado === "rejeitou" && aprovacao.motivo && (
                  <p className="mt-1 rounded-sm bg-rejeitado-fundo px-3 py-2 text-sm whitespace-pre-line text-rejeitado-texto">
                    {aprovacao.motivo}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
