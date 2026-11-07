'use client'

/**
 * O cartão "Situação dos N pedidos" do artboard `Dashboard`.
 *
 * Fiel ao desenho: uma **barra empilhada** no topo, com a contagem escrita dentro de cada
 * segmento, e abaixo dela a lista de situações com ícone redondo, nome, contagem e percentual —
 * que é exatamente o `.stack` + `.status-list` do artboard.
 *
 * A lista não é enfeite nem repetição: é a alternativa textual da barra. Quem não distingue as
 * cores nem compara larguras lê os mesmos números em texto, do lado. Por isso a barra é
 * `aria-hidden` e a lista não.
 *
 * O número só é escrito **dentro** do segmento quando ele é largo o bastante para o número caber
 * — abaixo disso o dígito sairia pela borda ou encavalaria no vizinho. Nada se perde: a lista
 * logo abaixo tem a contagem de todas as situações, sempre.
 *
 * Duas divergências declaradas do artboard, as duas por causa do dado real:
 *
 * 1. **Quatro situações, e não três.** O artboard desenha aprovado, pendente e rejeitado; o
 *    contrato de `GET /api/pedidos/resumo` tem as quatro do domínio. Omitir rascunho faria a soma
 *    dos segmentos não bater com o total escrito no título.
 * 2. **A frase sob o rascunho explica a privacidade.** "só os seus" não está no artboard porque o
 *    artboard não desenha rascunho; sem ela, um admin leria "Rascunho 0" como "ninguém tem
 *    rascunho", que é falso — ele apenas não vê o de mais ninguém.
 */

import { useCallback } from 'react'

import { SITUACOES_DO_PEDIDO, type SituacaoDoPedido } from '@/src/domain'
import { useRecurso } from '@/src/ui/hooks/useRecurso'
import { pegarResumo } from '@/src/ui/pedidos'
import type { ResumoDePedidos } from '@/src/ui/tipos'
import { Recurso, Vazio } from './estados'
import { CARTAO, CODIGO } from './estilos'
import { IconeObra } from './icones'
import { ETIQUETA_DA_SITUACAO } from './rotulos'

/**
 * O preenchimento de cada segmento, em token — nunca hexadecimal solto.
 *
 * São os tons da etiqueta de situação (`ETIQUETA_DA_SITUACAO`) na versão sólida: a etiqueta usa o
 * par claro porque escreve texto escuro sobre ele; o segmento usa o escuro porque escreve branco.
 */
const PREENCHIMENTO: Readonly<Record<SituacaoDoPedido, string>> = {
  rascunho: 'bg-neutro-350',
  pendente: 'bg-alerta-texto',
  aprovado: 'bg-sucesso-acao',
  rejeitado: 'bg-erro-texto',
}

/** O par claro do ícone redondo da lista, como o artboard o desenha (`.status-row .ic`). */
const ICONE: Readonly<Record<SituacaoDoPedido, string>> = {
  rascunho: 'bg-neutro-100 text-neutro-600',
  pendente: 'bg-aviso-fundo text-alerta-texto',
  aprovado: 'bg-sucesso-fundo text-sucesso-acao',
  rejeitado: 'bg-erro-fundo text-erro-texto',
}

/** A frase sob o nome da situação, como o artboard a escreve ("Aprovados · cadeia concluída"). */
const EXPLICACAO: Readonly<Record<SituacaoDoPedido, string>> = {
  rascunho: 'Rascunhos · ainda não submetidos, só os seus',
  pendente: 'Pendentes · aguardando assinatura',
  aprovado: 'Aprovados · cadeia concluída',
  rejeitado: 'Rejeitados · com motivo registrado',
}

/** Abaixo desta fatia do total, o número não cabe dentro do segmento e fica só na lista. */
const FATIA_MINIMA_PARA_O_NUMERO = 0.12

export function GraficoDeSituacoes({ obraId = null }: { obraId?: string | null } = {}) {
  const buscar = useCallback(() => pegarResumo(obraId ?? undefined), [obraId])
  const resumo = useRecurso<ResumoDePedidos>(
    buscar,
    `resumo|${obraId ?? 'todas'}`,
    'Não foi possível carregar a contagem de pedidos.',
  )

  const total = resumo.dados ? somar(resumo.dados) : 0

  return (
    <section className={CARTAO}>
      <div className="px-5 pt-[18px] pb-3.5">
        <h2 className="text-[15.5px] font-[650] tracking-[-0.022em] text-forte">
          {total === 0
            ? 'Situação dos pedidos'
            : total === 1
              ? 'Situação do 1 pedido'
              : `Situação dos ${total} pedidos`}
        </h2>
        <p className="mt-1 text-[12px] text-neutro-600">Estado atual da cadeia de aprovação</p>
      </div>

      {/* Os três estados saem de `<Recurso>`, como em toda lista do projeto. O vazio é pelo
          total: as quatro chaves chegam sempre, e todas em zero é o banco vazio que o critério
          manda não desenhar com barra nenhuma. */}
      <Recurso
        recurso={resumo}
        rotulo="Carregando a contagem de pedidos"
        tituloDoErro="Não foi possível carregar a contagem"
        linhas={4}
        estaVazio={(dados) => somar(dados) === 0}
        vazio={
          <Vazio titulo="Nenhum pedido para contar" icone={<IconeObra />}>
            Não há pedido visível nesta sessão, e uma barra de quatro segmentos vazios diria o
            contrário. Rode <code className={CODIGO}>npm run seed</code> para popular a
            demonstração.
          </Vazio>
        }
      >
        {(dados) => <Distribuicao porSituacao={dados.porSituacao} total={total} />}
      </Recurso>
    </section>
  )
}

function somar(dados: ResumoDePedidos): number {
  return SITUACOES_DO_PEDIDO.reduce((soma, s) => soma + dados.porSituacao[s], 0)
}

function Distribuicao({
  porSituacao,
  total,
}: {
  porSituacao: Record<SituacaoDoPedido, number>
  total: number
}) {
  const presentes = SITUACOES_DO_PEDIDO.filter((s) => porSituacao[s] > 0)

  return (
    <div className="px-5 pb-[18px]">
      {/* A barra empilhada do artboard (`.stack`). Decoração: tudo que ela mostra está escrito na
          lista abaixo, em texto. Uma situação sozinha ocupa a barra inteira e continua legível. */}
      <div className="mt-1 mb-3.5 flex gap-0.5" aria-hidden="true">
        {presentes.map((situacao) => {
          const fatia = porSituacao[situacao] / total
          return (
            <div
              key={situacao}
              style={{ width: `${fatia * 100}%` }}
              className={`flex h-[34px] items-center justify-center rounded-[4px] first:rounded-l-[6px] last:rounded-r-[6px] ${PREENCHIMENTO[situacao]}`}
            >
              {fatia >= FATIA_MINIMA_PARA_O_NUMERO && (
                <span className="text-[12.5px] font-bold text-cartao tabular-nums">
                  {porSituacao[situacao]}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <ul className="flex flex-col gap-2.5">
        {SITUACOES_DO_PEDIDO.map((situacao) => (
          <li key={situacao} className="flex items-center gap-2.5 text-[13px]">
            <span
              aria-hidden="true"
              className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full ${ICONE[situacao]}`}
            >
              <IconeDaSituacao situacao={situacao} />
            </span>

            <span className="min-w-0 flex-auto text-neutro-700">{EXPLICACAO[situacao]}</span>

            <span className="font-[650] text-forte tabular-nums">{porSituacao[situacao]}</span>
            <span className="w-12 text-right text-[12px] text-neutro-600 tabular-nums">
              {((porSituacao[situacao] / total) * 100).toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              %
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Os quatro ícones do artboard: visto, relógio, xis — e um traço para o rascunho, que ele não desenha. */
function IconeDaSituacao({ situacao }: { situacao: SituacaoDoPedido }) {
  const comum = {
    width: 12,
    height: 12,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
  } as const

  if (situacao === 'aprovado') {
    return (
      <svg {...comum} strokeWidth="3">
        <path d="M4 12l5 5L20 6" />
      </svg>
    )
  }
  if (situacao === 'pendente') {
    return (
      <svg {...comum} strokeWidth="2.6">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    )
  }
  if (situacao === 'rejeitado') {
    return (
      <svg {...comum} strokeWidth="3">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    )
  }
  return (
    <svg {...comum} strokeWidth="3">
      <path d="M6 12h12" />
    </svg>
  )
}

/** O rótulo curto de cada situação, para quem importar este módulo. Vem de `rotulos.ts`. */
export const NOME_DA_SITUACAO = ETIQUETA_DA_SITUACAO
