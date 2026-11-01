import { cn } from "@/lib/utils";

/**
 * Símbolo da marca: duas lajes de concreto sobrepostas, uma cheia e uma só contorno.
 * Herda a cor do texto (`currentColor`), então funciona em branco no header escuro e em
 * `--foreground` no favicon. Sem amarelo: amarelo é ação, não marca (docs/design.md).
 * O mesmo desenho está em `app/icon.svg`, `app/apple-icon.tsx` e `app/opengraph-image.tsx`.
 */
export function SimboloMarca({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect x="1" y="8" width="11" height="11" fill="currentColor" />
      <rect x="8" y="1" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/**
 * Símbolo + wordmark "ObraFlow" em Archivo expandida (125% de largura). No celular só o
 * símbolo: com seletor, sino e tema, o header de 343px não cabe o nome (o link que envolve a
 * marca já diz "ObraFlow" no aria-label).
 */
export function Marca({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <SimboloMarca />
      <span className="text-base font-bold tracking-[-0.01em] font-stretch-125% max-sm:hidden">
        ObraFlow
      </span>
    </span>
  );
}
