import { nomeDoMesCurto, nomeDoMesLongo } from "@/lib/datas";
import type { ComprasDoMesDto } from "@/lib/dto";
import { formatarCentavos, formatarCentavosCurto } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Seis barras, uma por mês, em CSS. O valor de cada mês está no `aria-label` e aparece por
 * cima da barra ao passar o mouse ou focar com o teclado. O mês atual é o único em
 * `bg-foreground`: é o que ainda está acontecendo. Eixo com três marcas, nunca mais que isso.
 */
export function ComprasPorMes({ comprasPorMes }: { comprasPorMes: ComprasDoMesDto[] }) {
  const maior = Math.max(0, ...comprasPorMes.map((mes) => mes.totalCents));
  const mesAtual = comprasPorMes[comprasPorMes.length - 1]?.mes;
  const tudoZero = maior === 0;

  return (
    <section aria-labelledby="compras-mes-titulo" className="flex flex-col gap-3">
      <div>
        <h2 id="compras-mes-titulo" className="text-lg font-bold">
          Compras aprovadas por mês
        </h2>
        <p className="text-muted-foreground">
          Pelo mês da aprovação final, que é quando o dinheiro fica comprometido.
        </p>
      </div>
      {tudoZero ? (
        <div className="rounded-sm border bg-card p-6">
          <p className="font-medium">Sem compras aprovadas nos últimos 6 meses.</p>
          <p className="text-muted-foreground">O gráfico aparece com a primeira aprovação.</p>
        </div>
      ) : (
        <figure
          aria-label="Compras aprovadas por mês, últimos 6 meses"
          className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 rounded-sm border bg-card px-5 pt-4 pb-3"
        >
          <div
            aria-hidden="true"
            className="flex h-32 flex-col justify-between text-right text-xs text-muted-foreground tabular-nums"
          >
            <span>{formatarCentavosCurto(maior)}</span>
            <span>{formatarCentavosCurto(maior / 2)}</span>
            <span>R$ 0</span>
          </div>
          <div className="relative h-32">
            <div aria-hidden="true" className="absolute inset-0 flex flex-col justify-between">
              <span className="border-t border-linha" />
              <span className="border-t border-linha" />
              <span className="border-t border-linha" />
            </div>
            <ol className="relative grid h-full grid-cols-6 items-end gap-2">
              {comprasPorMes.map((mes) => (
                <li
                  key={mes.mes}
                  tabIndex={0}
                  aria-label={`${nomeDoMesLongo(mes.mes)}: ${formatarCentavos(mes.totalCents)} em ${
                    mes.quantidade === 1 ? "1 pedido" : `${mes.quantidade} pedidos`
                  }`}
                  className="group relative flex h-full flex-col justify-end rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span
                    aria-hidden="true"
                    // Sem hover no celular, o valor fica sempre visível; no desktop aparece ao passar o mouse ou focar.
                    className="pointer-events-none absolute right-0 bottom-full left-0 mb-1 text-center text-[11px] font-medium whitespace-nowrap tabular-nums lg:text-xs lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-visible:opacity-100"
                  >
                    {formatarCentavosCurto(mes.totalCents)}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "block w-full rounded-sm",
                      mes.mes === mesAtual ? "bg-foreground" : "bg-muted-foreground/60",
                    )}
                    style={{
                      height: `${Math.max(mes.totalCents > 0 ? 2 : 0, (mes.totalCents / maior) * 100)}%`,
                    }}
                  />
                </li>
              ))}
            </ol>
          </div>
          <figcaption className="col-start-2 mt-2 grid grid-cols-6 gap-2 text-center text-xs text-muted-foreground">
            {comprasPorMes.map((mes) => (
              <span
                key={mes.mes}
                className={cn(mes.mes === mesAtual && "font-semibold text-foreground")}
              >
                {nomeDoMesCurto(mes.mes)}
              </span>
            ))}
          </figcaption>
        </figure>
      )}
    </section>
  );
}
