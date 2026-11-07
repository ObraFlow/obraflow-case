'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { Dinheiro, type Centavos, type SituacaoDoPedido } from '@/src/domain'
import { listarPedidos } from '@/src/ui/pedidos'
import { useRecurso } from '@/src/ui/hooks/useRecurso'
import type { ObraDoPedido, PaginaDePedidos, ResumoDePedido } from '@/src/ui/tipos'
import { TrilhaDaCadeia } from './CadeiaDoPedido'
import { Recurso, Vazio } from './estados'
import {
  ALVO_DE_TOQUE,
  BOTAO_ESCURO,
  BOTAO_PEQUENO,
  BOTAO_PEQUENO_ESCURO,
  CARTAO,
} from './estilos'
import { IconeCadeado, IconeObra } from './icones'
import { ETIQUETA_DA_SITUACAO, dataCurta, faixaDoSnapshot } from './rotulos'

/**
 * As abas do artboard `Aprovacoes`, e o que cada uma pede ao servidor.
 *
 * `paraMim` é a única que não é um filtro de situação: ela pede os pendentes e depois guarda
 * apenas aqueles em que `podeDecidir` é verdadeiro. O recorte podia ser do servidor, mas o
 * contrato de `GET /api/pedidos` declara `situacao` e `obraId` e mais nada — inventar um
 * terceiro parâmetro aqui faria a tela depender de uma rota que a SPEC não descreve.
 *
 * `rascunho` existe como aba explícita porque é a única forma de um rascunho aparecer: a rota
 * devolve rascunho **só de quem está dentro**, e nunca sob "Todos".
 */
type Aba = 'paraMim' | 'pendente' | 'aprovado' | 'rejeitado' | 'rascunho' | 'todos'

const SITUACOES_DA_ABA: Readonly<Record<Aba, readonly SituacaoDoPedido[] | undefined>> = {
  paraMim: ['pendente'],
  pendente: ['pendente'],
  aprovado: ['aprovado'],
  rejeitado: ['rejeitado'],
  rascunho: ['rascunho'],
  todos: undefined,
}

/**
 * O nome da aba na URL.
 *
 * Existe porque o cabeçalho tem dois itens para esta mesma tela — `Pedidos` e `Aprovações` — e a
 * diferença entre eles é a aba em que ela abre. Duas rotas para a mesma tabela seriam duas telas
 * a manter dizendo a mesma coisa.
 *
 * Sem `?aba=`, quem decide cai em `para-mim`: é o critério "a lista abre filtrada em aguardando
 * minha decisão", e ele vale para `/pedidos` puro, não só para o link do menu.
 */
const SLUG_DA_ABA: Readonly<Record<Aba, string>> = {
  paraMim: 'para-mim',
  pendente: 'pendentes',
  aprovado: 'aprovados',
  rejeitado: 'rejeitados',
  rascunho: 'rascunhos',
  todos: 'todos',
}

function abaDoSlug(slug: string | null): Aba | null {
  const encontrada = (Object.keys(SLUG_DA_ABA) as Aba[]).find((a) => SLUG_DA_ABA[a] === slug)
  return encontrada ?? null
}

const TITULO_DA_ABA: Readonly<Record<Aba, string>> = {
  paraMim: 'Aguardando minha decisão',
  pendente: 'Pendentes',
  aprovado: 'Aprovados',
  rejeitado: 'Rejeitados',
  rascunho: 'Meus rascunhos',
  todos: 'Todos',
}

type Props = {
  /** Quem está dentro. `podeDecidir` da linha já vem resolvido do servidor; isto é só rótulo. */
  sessao: { id: string; nome: string; papel: string }
  /** Verdadeiro para o papel aprovador — é o que faz a lista abrir já filtrada. */
  decide: boolean
  podeCriar: boolean
  obras: ObraDoPedido[]
}

/**
 * Tela 2 — a lista de aprovação (artboard `Aprovacoes`).
 *
 * Abre filtrada em "aguardando minha decisão" para quem decide, e o filtro sai em um clique: a
 * aba "Todos" está ao lado, e o vazio da fila oferece o mesmo caminho. A fila é pessoal, então
 * a mesma URL mostra listas diferentes para Amanda e para João — a diferença vem de
 * `podeDecidir`, que o servidor calcula a partir da cadeia **gravada**.
 *
 * A alçada de cada linha é a do snapshot do pedido, escrita como o servidor a devolveu. A tela
 * não resolve faixa e não recebe a alçada da obra: editar a faixa depois não muda uma linha
 * daqui (ADR 0001).
 */
export function ListaDePedidos({ sessao, decide, podeCriar, obras }: Props) {
  // Leitura só na montagem, como a obra escolhida da tela 3: quem troca a aba depois é
  // `trocarAba`, e nada no servidor depende do parâmetro.
  const parametros = useSearchParams()
  const [aba, setAba] = useState<Aba>(
    abaDoSlug(parametros.get('aba')) ?? (decide ? 'paraMim' : 'pendente'),
  )
  const [obraId, setObraId] = useState('')
  const [page, setPage] = useState(1)

  const situacoes = SITUACOES_DA_ABA[aba]
  // A sessão entra na chave pelo mesmo motivo do detalhe: a fila é pessoal, e `podeDecidir` vem
  // calculado para quem perguntou. Trocar de pessoa pelo cabeçalho precisa refazer a pergunta.
  const chave = `${sessao.id}|${aba}|${obraId}|${page}`

  const buscar = useCallback(
    () => listarPedidos({ situacao: situacoes, obraId: obraId || undefined, page }),
    // `situacoes` é constante por aba e `aba` já entra na chave.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aba, obraId, page],
  )

  const pagina = useRecurso<PaginaDePedidos>(
    buscar,
    chave,
    'Não foi possível carregar os pedidos.',
  )

  const recebidos = pagina.dados?.itens ?? []
  const linhas = aba === 'paraMim' ? recebidos.filter((p) => p.podeDecidir) : recebidos
  const total = pagina.dados?.total ?? 0
  const perPage = pagina.dados?.perPage ?? 50
  const ultimaPagina = Math.max(1, Math.ceil(total / perPage))

  function trocarAba(nova: Aba) {
    setAba(nova)
    setPage(1)
    // `replaceState`, e não `router.replace`: trocar de aba não é navegação — nada no servidor
    // depende do parâmetro, e uma navegação remontaria a página para mudar um dado de leitura.
    const endereco = new URL(window.location.href)
    endereco.searchParams.set('aba', SLUG_DA_ABA[nova])
    window.history.replaceState(null, '', endereco)
  }

  const abas: Aba[] = decide
    ? ['paraMim', 'pendente', 'aprovado', 'rejeitado', 'todos']
    : ['pendente', 'aprovado', 'rejeitado', 'todos']
  if (podeCriar) abas.push('rascunho')

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex flex-col gap-4 border-b border-neutro-200 bg-cartao px-8 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1.5 text-[12px] text-neutro-600">Aprovações</p>
            <h1 className="text-[24px] font-[650] tracking-[-0.03em] text-forte">
              {aba === 'paraMim' ? 'Pedidos aguardando decisão' : 'Pedidos de compra'}
            </h1>
          </div>

          <div className="flex flex-wrap items-end gap-2.5">
            <div className="flex min-w-[220px] flex-col gap-1.5">
              <label htmlFor="obra" className="text-[13px] font-semibold text-neutro-700">
                Obra
              </label>
              <select
                id="obra"
                value={obraId}
                onChange={(evento) => {
                  setObraId(evento.target.value)
                  setPage(1)
                }}
                className="min-h-11 w-full rounded-lg border border-neutro-300 bg-cartao px-3 py-[11px] text-[14px] text-forte"
              >
                <option value="">Todas as obras</option>
                {obras.map((obra) => (
                  <option key={obra.id} value={obra.id}>
                    {obra.nome} — {obra.cidade}
                  </option>
                ))}
              </select>
            </div>

            {podeCriar && (
              <Link
                href="/pedidos/novo"
                className={`${BOTAO_ESCURO} inline-flex items-center`}
              >
                Novo pedido
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filtrar pedidos">
          {abas.map((nome) => (
            <button
              key={nome}
              type="button"
              role="tab"
              aria-selected={aba === nome}
              onClick={() => trocarAba(nome)}
              className={`min-h-11 cursor-pointer border-b-2 px-3.5 py-3 text-[14px] font-[550] ${
                aba === nome
                  ? 'border-marca-500 font-[650] text-marca-800'
                  : 'border-transparent text-neutro-600 hover:text-neutro-700'
              }`}
            >
              {TITULO_DA_ABA[nome]}
            </button>
          ))}
        </div>
      </header>

      <div className="px-8 pt-[26px] pb-10">
        {/* O filtro padrão é anunciado, e a saída dele está ao lado da frase que o anuncia:
            sair custa um clique, e não procurar qual aba desfaz o que a tela fez sozinha. */}
        {aba === 'paraMim' && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[10px] border border-marca-100 bg-marca-15 px-4 py-3 text-[13px] text-marca-850">
            <span>
              Filtrado em <strong>aguardando minha decisão</strong>: só os pedidos em que{' '}
              {sessao.nome} é o aprovador da vez.
            </span>
            <button
              type="button"
              onClick={() => trocarAba('todos')}
              className={`min-h-[34px] ${ALVO_DE_TOQUE} cursor-pointer rounded-lg border border-marca-100 bg-cartao px-3 text-[13px] font-semibold text-marca-800 hover:bg-marca-25`}
            >
              Ver todos os pedidos
            </button>
          </div>
        )}

        <section className={CARTAO}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutro-100 px-5 py-[18px]">
            <div>
              <h2 className="text-[15px] font-[650] tracking-[-0.02em] text-forte">
                {TITULO_DA_ABA[aba]}
              </h2>
              <p className="mt-1 text-[12px] text-neutro-600">
                {pagina.carregando
                  ? 'Carregando os pedidos…'
                  : pagina.erro
                    ? 'A contagem depende da leitura que falhou.'
                    : 'A alçada atual vem do back-end — só quem está na vez decide.'}
              </p>
            </div>
            <span className="text-[12px] text-neutro-600">Ordenado por data</span>
          </div>

          {/* `estaVazio` olha para `linhas`, e não para a página: a aba "aguardando minha
              decisão" é um recorte do que o servidor devolveu, e é o recorte que pode estar
              vazio com a página cheia. */}
          <Recurso
            recurso={pagina}
            rotulo="Carregando os pedidos"
            tituloDoErro="Não foi possível carregar os pedidos"
            estaVazio={() => linhas.length === 0}
            vazio={
              <VazioDaAba
                aba={aba}
                temFiltroDeObra={obraId !== ''}
                aoVerTodos={() => trocarAba('todos')}
                aoLimparObra={() => {
                  setObraId('')
                  setPage(1)
                }}
              />
            }
          >
            {() => <Tabela linhas={linhas} />}
          </Recurso>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutro-100 px-5 py-4">
            <p className="text-[12px] text-neutro-600">
              {pagina.carregando || pagina.erro
                ? 'Paginação de 50 por página.'
                : aba === 'paraMim'
                  ? `${linhas.length} de ${total} pendentes aguardam você nesta página.`
                  : `Mostrando ${linhas.length} de ${total} ${total === 1 ? 'pedido' : 'pedidos'}.`}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || pagina.carregando}
                onClick={() => setPage((n) => Math.max(1, n - 1))}
                className={`${BOTAO_PEQUENO} disabled:cursor-not-allowed disabled:border-neutro-200 disabled:text-neutro-300`}
              >
                Anterior
              </button>
              <span className="text-[12px] text-neutro-600 tabular-nums">
                Página {page} de {ultimaPagina}
              </span>
              <button
                type="button"
                disabled={page >= ultimaPagina || pagina.carregando}
                onClick={() => setPage((n) => n + 1)}
                className={`${BOTAO_PEQUENO} disabled:cursor-not-allowed disabled:border-neutro-200 disabled:text-neutro-300`}
              >
                Próxima
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

/**
 * As nove colunas do enunciado, em tabela.
 *
 * O artboard desenha cada pedido como uma faixa e não como linha de tabela; as nove informações
 * são exatamente as mesmas, e a tabela é o que torna "nove colunas" verificável em vez de
 * inferida. A divergência está declarada na SPEC.
 *
 * Em tela estreita a tabela rola na horizontal dentro do próprio cartão — a página não ganha
 * barra lateral por causa dela.
 */
function Tabela({ linhas }: { linhas: readonly ResumoDePedido[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse">
        <caption className="sr-only">
          Pedidos visíveis para esta sessão, com a alçada atual de cada um
        </caption>
        <thead>
          <tr>
            <th scope="col" className={CABECALHO}>
              Pedido
            </th>
            <th scope="col" className={CABECALHO}>
              Obra
            </th>
            <th scope="col" className={CABECALHO}>
              Fornecedor
            </th>
            <th scope="col" className={CABECALHO}>
              Data
            </th>
            <th scope="col" className={`${CABECALHO} text-right`}>
              Itens
            </th>
            <th scope="col" className={`${CABECALHO} text-right`}>
              Total
            </th>
            <th scope="col" className={CABECALHO}>
              Situação
            </th>
            <th scope="col" className={CABECALHO}>
              Alçada atual
            </th>
            <th scope="col" className={CABECALHO}>
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((pedido) => {
            const etiqueta = ETIQUETA_DA_SITUACAO[pedido.situacao]
            return (
              <tr key={pedido.id} className={pedido.podeDecidir ? 'bg-marca-5' : undefined}>
                <td className={`${CELULA} font-[650] text-forte tabular-nums`}>#{pedido.id}</td>
                <td className={CELULA}>{pedido.obra?.nome ?? '—'}</td>
                <td className={CELULA}>{pedido.fornecedor?.nome ?? '—'}</td>
                <td className={`${CELULA} whitespace-nowrap tabular-nums`}>
                  {dataCurta(pedido.dataPedido)}
                </td>
                <td className={`${CELULA} text-right tabular-nums`}>{pedido.qtdItens}</td>
                <td className={`${CELULA} text-right font-[650] text-forte tabular-nums`}>
                  {Dinheiro.formatar(pedido.totalCentavos as Centavos)}
                </td>
                <td className={CELULA}>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-[650] ${etiqueta.classe}`}
                  >
                    {etiqueta.texto}
                  </span>
                </td>
                <td className={`${CELULA} min-w-[280px]`}>
                  <TrilhaDaCadeia cadeia={pedido.cadeia} etapaAtual={pedido.etapaAtual} />
                  <p className="mt-1.5 text-[11.5px] text-neutro-500">
                    {faixaDoSnapshot(pedido.faixa)}
                  </p>
                </td>
                <td className={`${CELULA} whitespace-nowrap`}>
                  {pedido.situacao === 'rascunho' ? (
                    <Link
                      href={`/pedidos/novo?rascunho=${pedido.id}`}
                      className={`${BOTAO_PEQUENO} inline-flex items-center`}
                    >
                      Continuar
                    </Link>
                  ) : (
                    <Link
                      href={`/pedidos/${pedido.id}`}
                      className={`${
                        pedido.podeDecidir ? BOTAO_PEQUENO_ESCURO : BOTAO_PEQUENO
                      } inline-flex items-center`}
                    >
                      {pedido.podeDecidir ? 'Decidir' : 'Ver mais'}
                    </Link>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function VazioDaAba({
  aba,
  temFiltroDeObra,
  aoVerTodos,
  aoLimparObra,
}: {
  aba: Aba
  temFiltroDeObra: boolean
  aoVerTodos: () => void
  aoLimparObra: () => void
}) {
  const limparObra = temFiltroDeObra ? (
    <button type="button" onClick={aoLimparObra} className={BOTAO_PEQUENO}>
      Ver todas as obras
    </button>
  ) : null

  if (aba === 'paraMim') {
    return (
      <Vazio
        titulo="Sua fila está vazia"
        icone={<IconeConfirmadoGrande />}
        acao={
          <>
            <button
              type="button"
              onClick={aoVerTodos}
              className={BOTAO_PEQUENO_ESCURO}
            >
              Ver todos os pedidos
            </button>
            {limparObra}
          </>
        }
      >
        Nenhum pedido aguarda a sua decisão agora. Os que já passaram por você continuam
        visíveis em <strong>Todos</strong>.
      </Vazio>
    )
  }

  if (aba === 'rascunho') {
    return (
      <Vazio titulo="Nenhum rascunho salvo" icone={<IconeCadeado />} acao={limparObra}>
        Rascunho é privado de quem o criou — ninguém mais o vê, em filtro nenhum. Comece um em{' '}
        <strong>Novo pedido</strong>.
      </Vazio>
    )
  }

  return (
    <Vazio
      titulo="Nenhum pedido neste filtro"
      icone={<IconeObra />}
      acao={
        <>
          {aba !== 'todos' && (
            <button
              type="button"
              onClick={aoVerTodos}
              className={BOTAO_PEQUENO}
            >
              Ver todos os pedidos
            </button>
          )}
          {limparObra}
        </>
      }
    >
      Nenhum pedido submetido casa com este filtro. Com o banco recém-semeado não há pedido
      nenhum: rode <code className={CODIGO}>npm run seed</code> e crie o primeiro em{' '}
      <strong>Novo pedido</strong>.
    </Vazio>
  )
}

function IconeConfirmadoGrande() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 12l5 5L20 6" />
    </svg>
  )
}

const CABECALHO =
  'border-b border-neutro-200 bg-neutro-25 px-3.5 py-2.5 text-left text-[12px] font-semibold whitespace-nowrap text-neutro-600'
const CELULA = 'border-b border-neutro-100 px-3.5 py-3 align-top text-[13px]'
const CODIGO =
  'rounded-[5px] border border-neutro-200 bg-neutro-100 px-1.5 py-0.5 font-mono text-[12px]'
