import { cn } from "@/lib/utils";

/**
 * Título de página (h1 em Archivo semi-expandida, docs/design.md > Tipografia) com a frase de
 * contexto e, à direita, o número que importa naquela tela ("2 aguardam você", "2 faixas,
 * sem lacunas", "R$ 33.000,00 parados em 2 pedidos"). É informação, não decoração: cada tela
 * passa o dado que decide a ação. `suaVez` marca o valor em amarelo só quando é ação do
 * usuário atual. Em telas estreitas o destaque desce para baixo do título.
 */
export function CabecalhoPagina({
  titulo,
  descricao,
  destaque,
  acoes,
}: {
  titulo: string;
  descricao: string;
  destaque?: { valor: string; rotulo: string; suaVez?: boolean };
  /** Controles à direita (seletor de obra, botão principal), quando a tela tiver. */
  acoes?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.015em] font-stretch-[112%]">{titulo}</h1>
        <p className="text-muted-foreground">{descricao}</p>
      </div>
      {destaque && (
        <p className="flex flex-col items-start sm:items-end">
          <span
            className={cn(
              "text-2xl leading-none font-bold tabular-nums",
              destaque.suaVez && "rounded-sm bg-sinalizacao px-1.5",
            )}
          >
            {destaque.valor}
          </span>
          <span className="mt-1 text-xs font-semibold text-muted-foreground">
            {destaque.rotulo}
          </span>
        </p>
      )}
      {acoes}
    </div>
  );
}
