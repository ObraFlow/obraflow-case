'use client'

/**
 * Os três estados que a SPEC exige de toda lista: carregando, vazio e erro com repetição.
 *
 * Responsabilidade única: desenhá-los uma vez só. A Sprint 4 os escreveu dentro de
 * `RegrasDaAlcada.tsx`, e a Sprint 6 traz duas listas novas — a de pedidos e o detalhe. Na
 * terceira cópia vale extrair; estas são a terceira e a quarta.
 *
 * O esqueleto tem a **forma da linha real**, e não um retângulo genérico: uma lista que troca
 * de altura ao carregar empurra o conteúdo sob o cursor de quem já ia clicar. O vazio diz o que
 * fazer, não só que não há nada. E o erro nomeia o que falhou e oferece a volta — um erro sem
 * botão de repetir obriga a recarregar a página inteira para refazer uma chamada.
 */

import type { Recurso as RecursoLido } from '@/src/ui/hooks/useRecurso'
import { IconeErro } from './icones'
import { BOTAO_PEQUENO_ESCURO } from './estilos'

export function EsqueletoDeLista({ linhas = 3, rotulo }: { linhas?: number; rotulo: string }) {
  return (
    <div className="px-5" aria-busy="true" aria-label={rotulo}>
      {Array.from({ length: linhas }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3.5 border-b border-neutro-50 py-3.5 last:border-b-0"
        >
          <div className="flex-auto">
            <div className="h-2.5 w-[38%] animate-pulse rounded-md bg-neutro-100" />
            <div className="mt-2.5 h-3.5 w-[72%] animate-pulse rounded-md bg-neutro-100" />
          </div>
          <div className="h-[26px] w-[92px] animate-pulse rounded-full bg-neutro-100" />
        </div>
      ))}
    </div>
  )
}

/**
 * O vazio do artboard `Estados`: ícone, título e uma frase que diz o próximo passo.
 *
 * `acao` é o que distingue "não há nada" de "não há nada **neste filtro**": a fila vazia do
 * aprovador oferece ver todos os pedidos no mesmo lugar em que o banco vazio aponta o seed.
 */
export function Vazio({
  titulo,
  icone,
  acao,
  children,
}: {
  titulo: string
  icone: React.ReactNode
  acao?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="px-5 pt-[18px] pb-6 text-center">
      <span className="inline-flex size-[54px] items-center justify-center rounded-[14px] bg-marca-15 text-marca-800">
        {icone}
      </span>
      <h3 className="mt-3.5 mb-1.5 text-[16px] font-[650] tracking-[-0.02em] text-forte">
        {titulo}
      </h3>
      <p className="mx-auto max-w-[380px] text-[13px] leading-[1.55] text-neutro-600">
        {children}
      </p>
      {acao && <div className="mt-4 flex flex-wrap justify-center gap-2.5">{acao}</div>}
    </div>
  )
}

/** A caixa de erro do artboard `Estados`: mantém o layout, nomeia o que falhou e oferece a volta. */
export function CaixaDeErro({
  titulo,
  detalhe,
  aoRepetir,
}: {
  titulo: string
  detalhe: string
  aoRepetir: () => void
}) {
  return (
    <div className="p-5">
      <div
        role="alert"
        className="flex gap-3.5 rounded-[10px] border border-erro-borda-forte bg-erro-papel p-[18px]"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-erro-fundo text-erro-texto">
          <IconeErro tamanho={18} />
        </span>
        <div>
          <h3 className="mb-1.5 text-[14px] font-[650] text-erro-texto">{titulo}</h3>
          <p className="mb-3 text-[13px] leading-[1.5] text-neutro-600">
            {detalhe} Seus dados não foram perdidos — tente novamente em instantes.
          </p>
          <button
            type="button"
            onClick={aoRepetir}
            className={BOTAO_PEQUENO_ESCURO}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Os três estados de um recurso, escolhidos pela **forma do hook** e não por cada tela.
 *
 * É o que a s7f1 pede com todas as letras: carregando, vazio e erro com repetição deixam de ser
 * trabalho de quem escreve a lista. Quem chama entrega o recurso, o que desenhar com os dados e
 * o que dizer quando não há nenhum; a ordem dos estados — esqueleto antes de tudo, nunca vazio
 * antes do fim do carregamento — fica aqui, escrita uma vez.
 *
 * `estaVazio` existe porque "não há nada" nem sempre é `dados.length === 0`: a fila do aprovador
 * é um recorte da página carregada, e é o recorte que está vazio. Sem ele, a tela que filtra
 * depois do hook voltaria a decidir sozinha quando mostrar o vazio — que é justamente o que esta
 * feature tira das telas.
 */
export function Recurso<T>({
  recurso,
  rotulo,
  tituloDoErro,
  linhas,
  vazio,
  estaVazio,
  children,
}: {
  recurso: RecursoLido<T>
  /** O que o esqueleto anuncia a quem usa leitor de tela: "Carregando os pedidos". */
  rotulo: string
  tituloDoErro: string
  linhas?: number
  vazio?: React.ReactNode
  estaVazio?: (dados: T) => boolean
  children: (dados: T) => React.ReactNode
}) {
  if (recurso.carregando) return <EsqueletoDeLista linhas={linhas} rotulo={rotulo} />

  if (recurso.erro !== null) {
    return (
      <CaixaDeErro
        titulo={tituloDoErro}
        detalhe={recurso.erro}
        aoRepetir={recurso.recarregar}
      />
    )
  }

  // `dados` nulo sem erro e sem carregamento não acontece com `useRecurso`; o esqueleto é a
  // resposta honesta se acontecer, porque a alternativa é a lista vazia que o critério proíbe.
  if (recurso.dados === null) return <EsqueletoDeLista linhas={linhas} rotulo={rotulo} />

  if (vazio && (estaVazio ?? vazioPorPadrao)(recurso.dados)) return <>{vazio}</>

  return <>{children(recurso.dados)}</>
}

function vazioPorPadrao(dados: unknown): boolean {
  return Array.isArray(dados) && dados.length === 0
}
