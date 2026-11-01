import type { ItemPedidoDto } from "@/lib/dto";
import { formatarCentavos } from "@/lib/money";
import { formatarQuantidade } from "@/lib/quantidade";

/**
 * Itens do pedido, só leitura, com as mesmas colunas do formulário e rodapé com o total.
 * Abaixo de `md` ficam só Descrição e Total: quantidade, unidade e preço viram uma segunda
 * linha da descrição ("1.000 kg × R$ 30,90"), para o total de cada item e o total do pedido
 * (o número que decide a compra) nunca saírem da tela.
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
              <th scope="col" className="px-3 py-2.5">
                Descrição
              </th>
              <th
                scope="col"
                className="hidden px-3 py-2.5 text-right whitespace-nowrap md:table-cell"
              >
                Quantidade
              </th>
              <th scope="col" className="hidden px-3 py-2.5 whitespace-nowrap md:table-cell">
                Unidade
              </th>
              <th
                scope="col"
                className="hidden px-3 py-2.5 text-right whitespace-nowrap md:table-cell"
              >
                Preço unitário
              </th>
              {/* `w-px` no celular: a coluna encolhe ao conteúdo e a descrição fica com o resto. */}
              <th scope="col" className="w-px px-3 py-2.5 text-right whitespace-nowrap md:w-auto">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id} className="border-b border-linha">
                <td className="px-3 py-2.5 md:min-w-48">
                  {item.descricao}
                  <span className="block text-xs text-muted-foreground tabular-nums md:hidden">
                    {formatarQuantidade(item.quantidade)} {item.unidade} ×{" "}
                    {formatarCentavos(item.precoUnitarioCents)}
                  </span>
                </td>
                <td className="hidden px-3 py-2.5 text-right whitespace-nowrap tabular-nums md:table-cell">
                  {formatarQuantidade(item.quantidade)}
                </td>
                <td className="hidden px-3 py-2.5 whitespace-nowrap md:table-cell">
                  {item.unidade}
                </td>
                <td className="hidden px-3 py-2.5 text-right whitespace-nowrap tabular-nums md:table-cell">
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
              {/* Dois cabeçalhos de linha: um `colSpan` de 4 manteria quatro colunas de
                  largura mesmo com três delas escondidas no celular. */}
              <th scope="row" className="px-3 py-2.5 text-left text-sm font-semibold md:hidden">
                Total do pedido
              </th>
              <th
                scope="row"
                colSpan={4}
                className="hidden px-3 py-2.5 text-left text-sm font-semibold md:table-cell"
              >
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
