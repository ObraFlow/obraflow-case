/**
 * Tela de entrada — artboard `Login`.
 *
 * O painel de marca é o do mockup, linha por linha. O painel da direita troca o formulário de
 * e-mail e senha e o botão de SSO pela lista de quem pode entrar: senha e SSO estão fora do
 * escopo do PRD, e a divergência está declarada na SPEC (§ Mockups). O que sobra do artboard —
 * o título, a linha de apoio, a faixa âmbar de demonstração e o aviso de confidencialidade —
 * fica como está desenhado.
 *
 * Com `DEMO_MODE` desligada a tela não existe. O `middleware.ts` responde 404 antes de
 * renderizar, e o `notFound()` aqui é a segunda tranca, para quem chamar a página por outro
 * caminho.
 */

import Image from 'next/image'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { prisma } from '@/src/db/prisma'
import { ListaDeUsuarios } from '@/src/ui/componentes/ListaDeUsuarios'
import { IconeAviso } from '@/src/ui/componentes/icones'

export const metadata = { title: 'Entrar · ObraFlow' }

// A flag é lida por requisição, não no build: prerrenderizada, a tela nasceria com o valor que
// `DEMO_MODE` tinha na máquina que compilou, e seguiria aberta num servidor que a desligou.
export const instant = false

export default async function Entrar() {
  await connection()
  if (process.env.DEMO_MODE !== 'true') notFound()

  // Os números do painel saem do banco, não do artboard: a lista de divergências declara os
  // valores desenhados como ilustrativos, e um "2 obras" fixo mentiria depois do primeiro seed.
  const [obras, usuarios] = await Promise.all([prisma.obra.count(), prisma.usuario.count()])

  return (
    <div className="flex flex-1 flex-wrap items-stretch">
      <section className="flex min-w-0 flex-[1_1_440px] flex-col gap-10 bg-neutro-950 px-11 py-12 text-white">
        <div className="flex items-center gap-2.5">
          <Image src="/obraflow-icone.svg" alt="" width={26} height={26} unoptimized />
          <span className="text-[16px] font-[650] tracking-[-0.025em] text-white">
            Obra<span className="text-marca-500">Flow</span>
          </span>
        </div>

        <div className="my-auto">
          <span className="inline-flex items-center gap-2 text-[11px] font-[650] tracking-[0.07em] text-marca-100 uppercase">
            <span className="size-[7px] shrink-0 rounded-full bg-marca-500" aria-hidden="true" />
            Serviço de aprovações
          </span>
          <h1 className="mt-4 text-[36px] leading-[1.2] font-[650] tracking-[-0.035em] text-white">
            Alçadas de aprovação,
            <br />
            <em className="font-serif font-medium text-marca-100 italic">
              resolvidas na origem.
            </em>
          </h1>
          <p className="mt-[18px] max-w-[420px] text-[15px] leading-[1.6] text-neutro-300">
            O ObraFlow decide quem autoriza cada pedido de compra e em qual ordem, conforme a obra
            e o valor — e registra a trilha inteira.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-3.5">
          <Numero valor={String(obras)} rotulo={obras === 1 ? 'obra no seed' : 'obras no seed'} />
          <Numero
            valor={String(usuarios)}
            rotulo={usuarios === 1 ? 'usuário de teste' : 'usuários de teste'}
          />
          <Numero valor="100%" rotulo="decisões auditáveis" />
        </div>
      </section>

      <section className="flex min-w-0 flex-[999_1_460px] items-center justify-center bg-cartao px-11 py-12">
        <div className="w-[400px] max-w-full">
          <h2 className="mb-1.5 text-[26px] font-[650] tracking-[-0.032em] text-forte">Entrar</h2>
          <p className="mb-7 text-[14px] leading-[1.55] text-neutro-600">
            Use a conta da sua obra. A alçada que você enxerga vem do seu perfil.
          </p>

          <ListaDeUsuarios />

          <div className="mt-[26px] rounded-[11px] border border-demo-borda bg-demo-fundo px-4 py-3.5">
            <div className="flex items-center gap-2 text-[12px] font-[650] tracking-[0.05em] text-demo-texto uppercase">
              <IconeAviso />
              Ambiente de demonstração
            </div>
            <p className="mt-[11px] text-[11.5px] leading-[1.5] text-demo-texto">
              Escolher uma pessoa abre a sessão dela no servidor, sem senha. Depois de entrar, o
              seletor no topo troca de pessoa sem novo login — só com{' '}
              <span className="rounded-[5px] border border-demo-borda bg-demo-codigo-fundo px-1.5 py-0.5 font-mono text-[12px] text-demo-codigo-texto">
                DEMO_MODE
              </span>{' '}
              ligado.
            </p>
          </div>

          <p className="mt-6 text-center text-[12px] leading-[1.55] text-neutro-500">
            Dados de obra e fornecedor são confidenciais. Cada decisão fica registrada com autor,
            data e posição na cadeia.
          </p>
        </div>
      </section>
    </div>
  )
}

function Numero({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div>
      <div className="text-[22px] font-[650] tracking-[-0.03em] text-white">{valor}</div>
      <div className="mt-0.5 text-[12.5px] text-neutro-400">{rotulo}</div>
    </div>
  )
}
