import type { ItemPedidoDto } from "@/lib/dto";
import { formatarCentavos } from "@/lib/money";

/** "2.5" (Decimal como texto) → "2,5"; "150" fica "150". */
function formatarQuantidade(quantidade: string): string {
  return quantidade.replace(".", ",");
}

/**
 * Itens do pedido, só leitura, com as mesmas colunas do formulário e rodapé com o total.
 * No celular a tabela rola dentro do próprio container, para não alargar a página.
 */
export function TabelaItens({
  itens,
  totalCents,
  observacoes,
}: {
  itens: ItemPedidoDto[];
  totalCents: number;
  observacoes: string | null;
}) {
  return (
    <section aria-labelledby="itens-titulo" className="flex min-w-0 flex-col gap-3">
      <h2 id="itens-titulo" className="text-lg font-bold">
        Itens do pedido
      </h2>
      <div className="relative overflow-x-auto rounded-sm border bg-card">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-foreground text-left text-xs font-semibold text-muted-foreground">
              <th className="px-3 py-2.5">Descrição</th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap">Quantidade</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Unidade</th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap">Preço unitário</th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap">Total</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id} className="border-b border-linha">
                <td className="min-w-48 px-3 py-2.5">{item.descricao}</td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums">
                  {formatarQuantidade(item.quantidade)}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">{item.unidade}</td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums">
                  {formatarCentavos(item.precoUnitarioCents)}
                </td>
                <td className="px-3 py-2.5 text-right font-medium whitespace-nowrap tabular-nums">
                  {formatarCentavos(item.totalCents)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-foreground">
              <th scope="row" colSpan={4} className="px-3 py-2.5 text-left text-sm font-semibold">
                Total do pedido
              </th>
              <td className="px-3 py-2.5 text-right text-base font-bold whitespace-nowrap tabular-nums">
                {formatarCentavos(totalCents)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {observacoes && (
        <div className="rounded-sm bg-muted px-4 py-3 text-sm">
          <p className="text-xs font-semibold text-muted-foreground">Observações internas</p>
          <p className="mt-1 whitespace-pre-line">{observacoes}</p>
        </div>
      )}
    </section>
  );
}
