import Link from "next/link";
import { descreverIdade } from "@/lib/datas";
import type { MovimentacaoDto } from "@/lib/dto";
import { formatarCentavos } from "@/lib/money";

const VERBO: Record<MovimentacaoDto["tipo"], string> = {
  cadastrou: "cadastrou",
  refez: "refez",
  aprovou: "aprovou",
  rejeitou: "rejeitou",
};

/**
 * O que aconteceu por último com os pedidos: quem cadastrou, refez, aprovou ou rejeitou.
 * Tudo sai da cadeia que o pedido já guarda; não há tabela de eventos.
 */
export function UltimasMovimentacoes({
  movimentacoes,
  geradoEm,
}: {
  movimentacoes: MovimentacaoDto[];
  geradoEm: string;
}) {
  return (
    <section aria-labelledby="movimentacoes-titulo" className="flex flex-col gap-3">
      <div>
        <h2 id="movimentacoes-titulo" className="text-lg font-bold">
          Últimas movimentações
        </h2>
        <p className="text-muted-foreground">
          Cadastros e decisões, do mais recente para o mais antigo.
        </p>
      </div>
      {movimentacoes.length === 0 ? (
        <div className="rounded-sm border bg-card p-6">
          <p className="font-medium">Nenhuma movimentação ainda.</p>
        </div>
      ) : (
        <ol className="grid divide-y divide-linha rounded-sm border bg-card md:grid-cols-2 md:divide-y-0 lg:grid-cols-3">
          {movimentacoes.map((movimentacao) => (
            <li
              key={`${movimentacao.tipo}-${movimentacao.pedidoId}-${movimentacao.em}`}
              className="flex flex-col gap-0.5 px-5 py-3 text-sm md:border-b md:border-linha md:nth-last-[-n+2]:border-b-0 lg:nth-last-[-n+3]:border-b-0"
            >
              <p>
                <strong className="font-semibold">{movimentacao.usuarioNome}</strong>{" "}
                {VERBO[movimentacao.tipo]}{" "}
                <Link
                  href={`/aprovacoes/${movimentacao.pedidoId}`}
                  className="font-semibold font-stretch-[112%] tabular-nums underline-offset-4 hover:underline"
                >
                  #{movimentacao.pedidoId}
                </Link>
              </p>
              <p className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 text-xs text-muted-foreground tabular-nums">
                <span className="truncate">{movimentacao.obraNome}</span>
                <span>{formatarCentavos(movimentacao.totalCents)}</span>
                <span>{descreverIdade(movimentacao.em, geradoEm)}</span>
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
