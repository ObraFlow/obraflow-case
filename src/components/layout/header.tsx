import Link from "next/link";
import { Suspense } from "react";
import { AgindoComo, AgindoComoSkeleton, AvisoSemUsuario } from "@/components/layout/agindo-como";
import { ContadorPendencias } from "@/components/layout/contador-pendencias";
import { LimiteDeErro } from "@/components/layout/limite-de-erro";
import { ListaNavegacao, Navegacao } from "@/components/layout/navegacao";

/**
 * Header escuro de 56px (docs/design.md > Forma). Marca, navegação e "Agindo como".
 * No celular a navegação desce para uma segunda linha; marca e seletor ficam na primeira.
 * A ordem no DOM é marca → navegação → seletor (ordem de Tab igual à visual no desktop).
 * Tudo que depende do cookie fica em <Suspense> próprio (Next 16 + cacheComponents)
 * e dentro de um error boundary, para uma falha do banco não derrubar a navegação.
 */
export function Header() {
  return (
    <header className="bg-foreground text-white">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-4 px-4 sm:gap-x-7 sm:px-8">
        <Link
          href="/aprovacoes"
          className="flex h-14 items-center text-base font-bold tracking-[-0.015em] text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
        >
          ObraFlow
        </Link>

        <div className="order-last -mx-4 basis-[calc(100%+2rem)] overflow-x-auto border-t border-white/15 sm:order-none sm:mx-0 sm:basis-auto sm:border-t-0">
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

        <div className="ml-auto flex h-14 items-center">
          <LimiteDeErro
            fallback={<span className="text-sm text-white/75">Usuários indisponíveis</span>}
          >
            <Suspense fallback={<AgindoComoSkeleton />}>
              <AgindoComo />
            </Suspense>
          </LimiteDeErro>
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
