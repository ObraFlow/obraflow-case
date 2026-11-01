import { Barra } from "@/components/graficos/barra";
import type { FornecedorCompradoDto } from "@/lib/dto";
import { formatarCentavos } from "@/lib/money";

/** Até cinco fornecedores, do maior valor aprovado para o menor; a barra compara com o primeiro. */
export function FornecedoresMaisComprados({
  fornecedores,
}: {
  fornecedores: FornecedorCompradoDto[];
}) {
  const maior = fornecedores[0]?.totalCents ?? 0;

  return (
    <section aria-labelledby="fornecedores-titulo" className="flex flex-col gap-3">
      <div>
        <h2 id="fornecedores-titulo" className="text-lg font-bold">
          Fornecedores com mais compras
        </h2>
        <p className="text-muted-foreground">Só pedidos aprovados; pendente ainda pode cair.</p>
      </div>
      {fornecedores.length === 0 ? (
        <div className="rounded-sm border bg-card p-6">
          <p className="font-medium">Nenhuma compra aprovada ainda.</p>
          <p className="text-muted-foreground">O ranking aparece com a primeira aprovação.</p>
        </div>
      ) : (
        <ol className="flex flex-col divide-y divide-linha rounded-sm border bg-card">
          {fornecedores.map((fornecedor) => (
            <li key={fornecedor.fornecedorId} className="flex flex-col gap-2 px-5 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h3 className="truncate font-semibold">{fornecedor.fornecedorNome}</h3>
                <span className="text-sm text-muted-foreground tabular-nums">
                  <span className="font-semibold text-foreground">
                    {formatarCentavos(fornecedor.totalCents)}
                  </span>{" "}
                  em{" "}
                  {fornecedor.pedidosAprovados === 1
                    ? "1 pedido"
                    : `${fornecedor.pedidosAprovados} pedidos`}
                </span>
              </div>
              <Barra
                escala={maior}
                segmentos={[
                  {
                    valor: fornecedor.totalCents,
                    classe: "bg-foreground",
                    rotulo: `Aprovado: ${formatarCentavos(fornecedor.totalCents)}`,
                  },
                ]}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
