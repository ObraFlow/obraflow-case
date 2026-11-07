/**
 * Barra superior do artboard `TrocarConta`.
 *
 * Três zonas: a marca à esquerda, a navegação no meio e o seletor de usuário à direita. O menu
 * consulta a mesma matriz que a rota consulta (`src/server/permissao.ts`), e o item que o papel
 * não pode usar **some** — não aparece desabilitado. É o que o artboard `Perfis` mostra, e a
 * razão está escrita lá: esconder o item é cortesia com quem usa, o controle é o 403 da rota.
 *
 * `Aprovações` entrou na Sprint 6 e aponta para a **mesma** rota de `Pedidos`, com a fila de
 * quem decide já aberta: é a mesma tela 2, e um segundo endereço para ela faria dois lugares
 * discordarem sobre o que está pendente. `Estados`, que o artboard desenha, é divergência
 * deliberada declarada na SPEC: é catálogo de estados, não tela. `Empresa` entrou depois da
 * entrega, com o cadastro de obra e de fornecedor. O botão `Sair`, que o artboard não desenha, é a divergência no outro sentido: está
 * declarada pelo mesmo mecanismo.
 */

import Image from 'next/image'
import Link from 'next/link'

import { pode } from '@/src/server/permissao'
import { sessaoAtual } from '@/src/ui/sessao-no-servidor'
import { BotaoSair } from './BotaoSair'
import { SeletorDeUsuario } from './SeletorDeUsuario'
import { CONSTRUTORA } from './rotulos'

export async function Cabecalho() {
  const sessao = await sessaoAtual()
  const demo = process.env.DEMO_MODE === 'true'

  return (
    <header className="relative z-[3] border-b border-neutro-200 bg-cartao px-9 py-3">
      <div className="flex flex-wrap items-center justify-between gap-[18px]">
        <Marca />

        <nav className="flex flex-wrap gap-0.5" aria-label="Navegação principal">
          <ItemDeMenu href="/pedidos?aba=todos">Pedidos</ItemDeMenu>
          {pode(sessao?.papel, 'decidir') && (
            <ItemDeMenu href="/pedidos?aba=para-mim">Aprovações</ItemDeMenu>
          )}
          {pode(sessao?.papel, 'gerir_alcada') && (
            <ItemDeMenu href="/alcadas">Alçadas</ItemDeMenu>
          )}
          {pode(sessao?.papel, 'ver_resumo') && (
            <ItemDeMenu href="/admin">Administração</ItemDeMenu>
          )}
          {pode(sessao?.papel, 'gerir_cadastros') && (
            <ItemDeMenu href="/empresa">Empresa</ItemDeMenu>
          )}
        </nav>

        {demo && (
          <div className="flex items-center gap-2.5">
            <SeletorDeUsuario
              sessao={
                sessao ? { id: sessao.usuarioId, nome: sessao.nome, papel: sessao.papel } : null
              }
            />
            {sessao && <BotaoSair />}
          </div>
        )}
      </div>
    </header>
  )
}

/** Mesma moldura, sem a parte que depende da sessão: é o fallback do Suspense do layout. */
export function CabecalhoEsqueleto() {
  return (
    <header className="relative z-[3] border-b border-neutro-200 bg-cartao px-9 py-3">
      <div className="flex flex-wrap items-center justify-between gap-[18px]">
        <Marca />
        <span className="h-[46px] w-[260px] animate-pulse rounded-[10px] bg-neutro-50" />
      </div>
    </header>
  )
}

/**
 * O bloco de marca do artboard, mais o nome da construtora.
 *
 * A marca é a da documentação: o ícone e `Obra` + `Flow` na cor da marca. O artboard mostra só
 * a marca no topo e põe `Construtora Vértice` no cabeçalho do seletor; a sprint exige a construtora como marca fixa no cabeçalho. Os dois cabem: o produto
 * à esquerda, a construtora logo depois, em texto — nunca em botão, porque um seletor de empresa
 * anunciaria uma troca que não existe (ADR 0006).
 */
function Marca() {
  return (
    <div className="flex items-center gap-[9px]">
      <Link href="/" className="flex items-center gap-[9px]">
        <Image src="/obraflow-icone.svg" alt="" width={22} height={22} unoptimized />
        <span className="text-[15px] font-[650] tracking-[-0.025em] text-forte">
          Obra<span className="text-marca-500">Flow</span>
        </span>
      </Link>
      <span className="h-3.5 w-px bg-neutro-200" aria-hidden="true" />
      <span className="text-[13px] text-neutro-600">{CONSTRUTORA}</span>
    </div>
  )
}

function ItemDeMenu({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center rounded-lg px-[13px] py-2.5 text-[14px] font-medium text-neutro-600 hover:bg-neutro-50 hover:text-neutro-700"
    >
      {children}
    </Link>
  )
}
