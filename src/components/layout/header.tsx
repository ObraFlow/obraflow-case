import Link from "next/link";
import { Suspense } from "react";
import { AgindoComo, AgindoComoSkeleton, AvisoSemUsuario } from "@/components/layout/agindo-como";
import { ContadorPendencias } from "@/components/layout/contador-pendencias";
import { LimiteDeErro } from "@/components/layout/limite-de-erro";
import { Marca } from "@/components/layout/marca";
import { ListaNavegacao, Navegacao } from "@/components/layout/navegacao";
import { SeletorTema } from "@/components/layout/seletor-tema";

/**
 * Header de 56px em tokens próprios (--header, docs/design.md > Forma). Marca, navegação,
 * "Agindo como" e o seletor de tema.
 * Abaixo de `lg` a navegação desce para uma segunda linha; marca e seletor ficam na primeira
 * (abaixo de `sm` a marca é só o símbolo, senão os quatro controles não cabem).
 * (Até ~900px não cabe tudo em uma linha: a quebra automática deixava o seletor sozinho.)
 * A ordem no DOM é marca → navegação → seletor (ordem de Tab igual à visual no desktop).
 * Tudo que depende do cookie fica em <Suspense> próprio (Next 16 + cacheComponents)
 * e dentro de um error boundary, para uma falha do banco não derrubar a navegação.
 */
export function Header() {
  return (
    <header className="border-b border-header-foreground/15 bg-header text-header-foreground">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-4 px-4 sm:gap-x-7 sm:px-8">
        <Link
          href="/aprovacoes"
          aria-label="ObraFlow, ir para as aprovações"
          className="flex h-14 items-center text-header-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
        >
          <Marca />
        </Link>

        <div className="order-last -mx-4 basis-[calc(100%+2rem)] [scrollbar-width:none] overflow-x-auto border-t border-header-foreground/15 sm:-mx-8 sm:basis-[calc(100%+4rem)] lg:order-none lg:mx-0 lg:basis-auto lg:border-t-0">
          {/* usePathname suspende no prerender de rotas dinâmicas (/aprovacoes/[id]); o fallback é a lista sem item ativo. */}
          <Suspense fallback={<ListaNavegacao pathname={null} contadorAprovacoes={null} />}>
            <Navegacao
              contadorAprovacoes={
                <LimiteDeErro fallback={null}>
                  <Suspense fallback={null}>
                    <ContadorPendencias />
                  </Suspense>
                </LimiteDeErro>
              }
            />
          </Suspense>
        </div>

        <div className="ml-auto flex h-14 items-center gap-2 sm:gap-3">
          <LimiteDeErro
            fallback={
              <span className="text-sm text-header-foreground/75">Usuários indisponíveis</span>
            }
          >
            <Suspense fallback={<AgindoComoSkeleton />}>
              <AgindoComo />
            </Suspense>
          </LimiteDeErro>
          {/* Fora do Suspense: o tema vem do localStorage, não do cookie. */}
          <SeletorTema />
        </div>
      </div>

      <LimiteDeErro fallback={null}>
        <Suspense fallback={null}>
          <AvisoSemUsuario />
        </Suspense>
      </LimiteDeErro>
    </header>
  );
}
