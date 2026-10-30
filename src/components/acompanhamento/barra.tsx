import { cn } from "@/lib/utils";

export type Segmento = {
  valor: number;
  /** Classe de fundo (`bg-aprovado`, `bg-rejeitado`, `bg-border`, `bg-foreground`). */
  classe: string;
  /** Vai no `title`, para o mouse; o número em si fica sempre no texto ao lado da barra. */
  rotulo: string;
};

/**
 * Barra horizontal de 8px em CSS puro (docs/design.md: nada decora, cada pedaço codifica
 * um valor). `escala` é o que corresponde a 100%: a soma dos segmentos numa barra empilhada,
 * ou o maior valor da lista numa barra de comparação. `aria-hidden` porque os números estão
 * no texto; a barra só dá a proporção de relance.
 */
export function Barra({
  segmentos,
  escala,
  className,
}: {
  segmentos: Segmento[];
  escala: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex h-2 w-full overflow-hidden rounded-sm bg-muted", className)}
    >
      {escala > 0 &&
        segmentos
          .filter((segmento) => segmento.valor > 0)
          .map((segmento) => (
            <span
              key={segmento.rotulo}
              title={segmento.rotulo}
              className={cn("h-full", segmento.classe)}
              style={{ width: `${Math.min(100, (segmento.valor / escala) * 100)}%` }}
            />
          ))}
    </div>
  );
}
