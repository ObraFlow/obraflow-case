import Link from 'next/link'

import type { Papel } from '@/src/domain'
import type { Acao } from '@/src/server/permissao'
import { IconeCadeado } from './icones'
import { CONSTRUTORA, ROTULO_DO_PAPEL } from './rotulos'

/**
 * O que cada tela protegida diz quando alguém chega a ela pela URL.
 *
 * Duas telas, dois textos, um componente: o enquadramento é o mesmo do artboard `Perfis` — ícone,
 * título, quem edita, onde você está e com quem procurar —, e o que muda é a frase. Duplicar o
 * componente por tela faria a segunda divergir da primeira na primeira correção de texto.
 */
const EXPLICACAO: Readonly<
  Record<
    Extract<Acao, 'gerir_alcada' | 'criar_pedido' | 'ver_resumo' | 'gerir_cadastros'>,
    { titulo: string; oQue: React.ReactNode; papelQuePode: string; quem: string }
  >
> = {
  gerir_alcada: {
    titulo: 'Você não tem acesso a esta configuração',
    oQue: (
      <>
        As regras de alçada — as faixas de valor de cada obra e quem assina em cada uma — são
        editadas apenas pelo papel
      </>
    ),
    papelQuePode: 'Admin',
    quem: 'Marina Alencar',
  },
  criar_pedido: {
    titulo: 'Você não tem acesso a esta tela',
    oQue: <>Criar e enviar pedidos de compra é atribuição apenas do papel</>,
    papelQuePode: 'Comprador',
    quem: 'Caio Nogueira',
  },
  ver_resumo: {
    titulo: 'Você não tem acesso a esta tela',
    oQue: (
      <>
        O painel da administração — a contagem de pedidos por situação — é visto apenas pelo
        papel
      </>
    ),
    papelQuePode: 'Admin',
    quem: 'Marina Alencar',
  },
  gerir_cadastros: {
    titulo: 'Você não tem acesso a esta configuração',
    oQue: <>O cadastro de obras e fornecedores da empresa é editado apenas pelo papel</>,
    papelQuePode: 'Admin',
    quem: 'Marina Alencar',
  },
}

/**
 * A explicação que quem não gere alçada vê ao digitar `/alcadas`.
 *
 * O artboard `Perfis` é explícito quanto a isto: o item some do menu de quem não o usa, e quem
 * chega pela URL recebe a explicação de acesso negado — com quem procurar —, não uma tela branca
 * nem um 404. Esconder o item é cortesia com quem usa; o controle é o 403 que a rota devolve, e
 * ele continua valendo independentemente do que esta página mostre.
 */
export function AcessoNegado({
  papel,
  acao = 'gerir_alcada',
}: {
  papel: Papel | null
  acao?: Extract<Acao, 'gerir_alcada' | 'criar_pedido' | 'ver_resumo' | 'gerir_cadastros'>
}) {
  const texto = EXPLICACAO[acao]

  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-auto flex-col justify-center px-6 py-14">
      <div className="rounded-[12px] border border-neutro-200 bg-cartao p-7 text-center shadow-xs">
        <span className="inline-flex size-[54px] items-center justify-center rounded-[14px] bg-marca-15 text-marca-800">
          <IconeCadeado />
        </span>

        <h1 className="mt-3.5 text-[20px] font-[650] tracking-[-0.025em] text-forte">
          {texto.titulo}
        </h1>

        <p className="mx-auto mt-2 max-w-[400px] text-[13.5px] leading-[1.55] text-neutro-600">
          {texto.oQue}{' '}
          <strong className="text-neutro-700">{texto.papelQuePode}</strong>.
          {papel ? (
            <>
              {' '}
              Você está como{' '}
              <strong className="text-neutro-700">{ROTULO_DO_PAPEL[papel]}</strong>.
            </>
          ) : (
            ' Você não está em nenhuma sessão.'
          )}
        </p>

        <p className="mx-auto mt-3 max-w-[400px] text-[13.5px] leading-[1.55] text-neutro-600">
          Procure quem tem esse papel na {CONSTRUTORA} — no seed da demonstração,{' '}
          <strong className="text-neutro-700">{texto.quem}</strong>.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Link
            href="/pedidos"
            className="inline-flex min-h-11 items-center rounded-lg border border-neutro-900 bg-neutro-900 px-4 text-[14px] font-semibold text-cartao hover:bg-neutro-950"
          >
            Voltar aos pedidos
          </Link>
        </div>
      </div>
    </main>
  )
}
