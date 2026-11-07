'use client'

/**
 * Os quatro cartões do painel que não são KPI: a série por semana, o corte por faixa, o corte por
 * aprovador e a fila de atenção.
 *
 * Estão separados de `PainelDoAdmin.tsx` só por tamanho — nenhum deles busca nada nem guarda
 * estado. Recebem o que já foi lido, e desenham.
 *
 * **Todo gráfico tem alternativa textual de verdade.** O de linhas traz a tabela dos mesmos
 * números num `<details>`, como o artboard desenha; os de barra escrevem a contagem ao lado da
 * barra. Nenhum deles depende de cor nem de largura para ser lido — cor e largura são o atalho
 * para quem enxerga, não o conteúdo.
 */

import Link from 'next/link'

import { Dinheiro, type Centavos } from '@/src/domain'
import type { Painel } from '@/src/ui/painel'
import { CARTAO, NOTA } from './estilos'
import { duracao, duracaoCurta, milReais } from './duracao'

const TITULO = 'text-[15.5px] font-[650] tracking-[-0.022em] text-forte'
const SUB = 'mt-1 text-[12px] text-neutro-600'

function Cabeca({
  titulo,
  sub,
  direita,
}: {
  titulo: string
  sub: string
  direita?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 px-5 pt-[18px] pb-3.5">
      <div>
        <h2 className={TITULO}>{titulo}</h2>
        <p className={SUB}>{sub}</p>
      </div>
      {direita}
    </div>
  )
}

// --- gráfico de linhas ---------------------------------------------------------------------------

/**
 * As cores de série, como **classe** e não como `var(--token)` em atributo inline.
 *
 * O Tailwind v4 poda de `:root` as variáveis de tema que não vê usadas no código-fonte. Uma cor
 * citada apenas dentro de um `var()` num atributo `stroke` não é "uso" aos olhos do scanner: a
 * variável some do CSS, o `stroke` fica inválido e a linha desaparece da tela — foi exatamente o
 * que aconteceu na primeira versão deste cartão. Escrita como utilitário, a cor é vista, emitida
 * e aplicada.
 */
const CORES_DE_SERIE = [
  { traco: 'stroke-marca-700', preenche: 'fill-marca-700', amostra: 'bg-marca-700' },
  { traco: 'stroke-serie-azul', preenche: 'fill-serie-azul', amostra: 'bg-serie-azul' },
  { traco: 'stroke-neutro-700', preenche: 'fill-neutro-700', amostra: 'bg-neutro-700' },
]

const LARGURA = 700
const ALTURA = 235
const ESQUERDA = 50
// A linha termina bem antes da borda para o rótulo de ponta caber inteiro à direita dela, como no
// artboard. 130px não bastavam para "Residencial Aurora 14,6" e o nome saía cortado.
const DIREITA = 520
const TOPO = 20
const BASE = 200

function ultimoValor(pontos: Painel['serie']['pontos'], obraId: string): number {
  return pontos[pontos.length - 1]?.porObra[obraId] ?? 0
}

/**
 * O nome da obra no rótulo de ponta, encurtado só quando não cabe.
 *
 * Cortar sempre na primeira palavra transformava "Residencial Aurora" em "Residencial", que é o
 * pedaço que **não** identifica a obra — as três do seed começam por palavra genérica. O corte
 * agora é por comprimento, e preserva o nome inteiro quando ele cabe.
 */
function nomeCurto(nome: string): string {
  return nome.length <= 20 ? nome : `${nome.slice(0, 19)}…`
}

/**
 * Valor aprovado por semana, uma linha por obra.
 *
 * SVG inline, sem biblioteca: são seis pontos por série, e a conta de onde cada ponto cai cabe em
 * quatro linhas. O eixo é escalado pelo **maior valor real** arredondado para cima, e não por um
 * teto fixo: um teto de 120 mil achataria qualquer banco que não seja o do mockup.
 */
export function GraficoDeLinhas({ serie }: { serie: Painel['serie'] }) {
  const { obras, pontos } = serie

  const valores = pontos.flatMap((p) => obras.map((o) => p.porObra[o.id] ?? 0))
  const maior = Math.max(...valores, 0)
  // Teto "redondo" acima do maior valor, para o eixo ter marcas legíveis. Em banco sem aprovação
  // nenhuma o teto é 1 — quatro linhas de grade em zero seriam um gráfico mentindo que há escala.
  const teto = maior === 0 ? 100_000 : Math.ceil(maior / 4) * 4

  const x = (i: number) =>
    pontos.length <= 1 ? ESQUERDA : ESQUERDA + (i * (DIREITA - ESQUERDA)) / (pontos.length - 1)
  const y = (valor: number) => BASE - (valor / teto) * (BASE - TOPO)

  const vazio = maior === 0

  return (
    <section className={CARTAO}>
      <Cabeca
        titulo="Valor aprovado por semana"
        sub={`Em milhares de reais · últimas ${pontos.length} semanas`}
        direita={
          <div className="flex flex-wrap items-center gap-3.5">
            {obras.map((obra, i) => (
              <span key={obra.id} className="inline-flex items-center gap-[7px] text-[12.5px] text-neutro-700">
                <span
                  aria-hidden="true"
                  className={`size-[11px] shrink-0 rounded-[3px] ${CORES_DE_SERIE[i % CORES_DE_SERIE.length].amostra}`}
                />
                {obra.nome}
              </span>
            ))}
          </div>
        }
      />

      <div className="px-5 pb-[18px]">
        {vazio ? (
          <p className={`${NOTA} border-neutro-200 bg-neutro-50 text-neutro-700`}>
            Nenhum pedido foi aprovado nas últimas {pontos.length} semanas, então não há linha a
            desenhar. O eixo só aparece quando houver valor aprovado — um gráfico de linhas rentes
            ao zero afirmaria uma série que não existe.
          </p>
        ) : (
          <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="block h-auto w-full" aria-hidden="true">
            <g>
              {[0, 1, 2, 3, 4].map((n) => {
                const valorDaLinha = (teto / 4) * (4 - n)
                const alturaDaLinha = TOPO + (n * (BASE - TOPO)) / 4
                return (
                  <g key={n}>
                    <line
                      x1={ESQUERDA}
                      y1={alturaDaLinha}
                      x2={LARGURA - 40}
                      y2={alturaDaLinha}
                      className="stroke-neutro-100"
                      strokeWidth="1"
                    />
                    <text
                      x={ESQUERDA - 8}
                      y={alturaDaLinha + 4}
                      textAnchor="end"
                      className="fill-neutro-500"
                      fontSize="11"
                    >
                      {milReais(valorDaLinha)}
                    </text>
                  </g>
                )
              })}
              {pontos.map((ponto, i) => (
                <text
                  key={ponto.rotulo}
                  x={x(i)}
                  y={BASE + 20}
                  textAnchor="middle"
                  className="fill-neutro-500"
                  fontSize="11"
                >
                  {ponto.rotulo}
                </text>
              ))}
            </g>

            {obras.map((obra, indice) => (
              <g key={obra.id}>
                <polyline
                  fill="none"
                  className={CORES_DE_SERIE[indice % CORES_DE_SERIE.length].traco}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={pontos.map((p, i) => `${x(i)},${y(p.porObra[obra.id] ?? 0)}`).join(' ')}
                />
                {pontos.map((p, i) => (
                  <circle
                    key={p.rotulo}
                    cx={x(i)}
                    cy={y(p.porObra[obra.id] ?? 0)}
                    r="4.5"
                    className={`${CORES_DE_SERIE[indice % CORES_DE_SERIE.length].preenche} stroke-cartao`}
                    strokeWidth="2"
                  />
                ))}

                {/* O rótulo de ponta do artboard: o nome da obra e o último valor, ao lado do
                    ponto final — dispensa ir e voltar até a legenda para saber qual linha é qual.
                    Só é desenhado quando a última semana **tem** valor: em zero, as obras caem
                    todas sobre a mesma linha de base e os rótulos se empilhariam um sobre o
                    outro, ilegíveis, para dizer "0,0". A legenda acima continua nomeando-as. */}
                {ultimoValor(pontos, obra.id) > 0 && (
                  <text
                    x={DIREITA + 14}
                    y={y(ultimoValor(pontos, obra.id)) + 4}
                    className={`${CORES_DE_SERIE[indice % CORES_DE_SERIE.length].preenche} font-[650]`}
                    fontSize="11.5"
                  >
                    {nomeCurto(obra.nome)} {milReais(ultimoValor(pontos, obra.id))}
                  </text>
                )}
              </g>
            ))}
          </svg>
        )}

        {/* A tabela é a alternativa textual do artboard, e não um extra: é o mesmo número, legível
            por quem não lê um traço inclinado. Fica aberta quando não há linha nenhuma. */}
        <details className="mt-3.5" open={vazio}>
          <summary className="cursor-pointer text-[12.5px] font-semibold text-neutro-600 hover:text-forte">
            Ver os dados em tabela
          </summary>
          <table className="mt-2.5 w-full border-collapse">
            <caption className="sr-only">
              Valor aprovado por semana e por obra, em milhares de reais
            </caption>
            <thead>
              <tr>
                <th scope="col" className="border-b border-neutro-100 bg-neutro-25 px-2.5 py-[7px] text-left text-[12px] font-semibold text-neutro-600">
                  Semana
                </th>
                {obras.map((obra) => (
                  <th
                    key={obra.id}
                    scope="col"
                    className="border-b border-neutro-100 bg-neutro-25 px-2.5 py-[7px] text-right text-[12px] font-semibold text-neutro-600"
                  >
                    {obra.nome} (R$ mil)
                  </th>
                ))}
                {obras.length === 0 && (
                  <th scope="col" className="border-b border-neutro-100 bg-neutro-25 px-2.5 py-[7px] text-right text-[12px] font-semibold text-neutro-600">
                    R$ mil
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {pontos.map((ponto) => (
                <tr key={ponto.rotulo}>
                  <th scope="row" className="border-b border-neutro-100 px-2.5 py-[7px] text-left text-[12px] font-normal text-neutro-700">
                    {ponto.rotulo}
                  </th>
                  {obras.map((obra) => (
                    <td key={obra.id} className="border-b border-neutro-100 px-2.5 py-[7px] text-right text-[12px] text-neutro-700 tabular-nums">
                      {milReais(ponto.porObra[obra.id] ?? 0)}
                    </td>
                  ))}
                  {obras.length === 0 && (
                    <td className="border-b border-neutro-100 px-2.5 py-[7px] text-right text-[12px] text-neutro-700">
                      0,0
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    </section>
  )
}

// --- barras horizontais compartilhadas -----------------------------------------------------------

/**
 * A linha de barra do artboard (`.hbar-row`): rótulo de 150px, trilho fino e o valor à direita.
 *
 * O artboard põe o detalhe longo — quantos pedidos, quanto em reais, tempo médio — num balão que
 * só aparece no `:hover`. Aqui ele aparece no **hover e no foco**, e a linha é focável pelo
 * teclado: um detalhe que só existe sob o ponteiro não existe para quem navega por tabulação.
 *
 * O mesmo detalhe vai também num `<span class="sr-only">`, porque balão com `opacity` continua
 * invisível para quem usa leitor de tela só quando o CSS decide — e o número não pode depender
 * disso. O rótulo curto, a contagem e o valor seguem sempre em texto, fora da barra.
 */
function Barra({
  rotulo,
  resumo,
  detalhe,
  fracao,
  valor,
  alerta = false,
}: {
  rotulo: string
  /** A linha curta sob o nome, como no artboard: "Aurora · 2 aprovadores". */
  resumo: string
  /** O que o artboard esconde no balão: "3 pedidos · R$ 71.680,00 · tempo médio 19h19min". */
  detalhe: string
  fracao: number
  valor: string
  alerta?: boolean
}) {
  return (
    <li className="group relative flex flex-wrap items-center gap-x-3 gap-y-1.5" tabIndex={0}>
      <span className="w-[150px] shrink-0 text-[12.5px] text-neutro-700 max-sm:w-auto">
        {rotulo}
        <small className="mt-0.5 block text-[11px] text-neutro-500">{resumo}</small>
        <span className="sr-only">. {detalhe}</span>
      </span>

      <span
        aria-hidden="true"
        className="order-last h-[18px] w-full rounded-[4px] bg-neutro-50 sm:order-none sm:w-auto sm:flex-1"
      >
        <span
          className={`block h-[18px] rounded-[4px] ${fracao > 0 ? 'min-w-[3px]' : ''} ${
            alerta ? 'bg-alerta-texto' : 'bg-neutro-700'
          }`}
          style={{ width: `${Math.round(fracao * 100)}%` }}
        />
      </span>

      <span className="ml-auto text-[13px] font-[650] text-forte tabular-nums sm:ml-0">
        {valor}
      </span>

      {/* O balão do artboard (`.hbar-tip`): some do fluxo, aparece no hover e no foco. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-1 left-[150px] z-10 rounded-md bg-neutro-900 px-2.5 py-[5px] text-[11px] whitespace-nowrap text-cartao opacity-0 transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100 max-sm:left-0"
      >
        {detalhe}
      </span>
    </li>
  )
}

// --- por faixa -----------------------------------------------------------------------------------

export function PorFaixa({ dados }: { dados: Painel }) {
  const linhas = dados.porFaixa
  const maior = Math.max(...linhas.map((l) => l.pedidos), 0)

  return (
    <section className={CARTAO}>
      <Cabeca
        titulo="Pedidos por faixa de alçada"
        sub="Onde o volume cai — a faixa é a do snapshot de cada pedido, não a alçada de hoje"
      />
      <div className="px-5 pb-5">
        {linhas.length === 0 ? (
          <p className={`${NOTA} border-neutro-200 bg-neutro-50 text-neutro-700`}>
            Nenhum pedido submetido no recorte: sem submissão não há faixa aplicada, porque é a
            submissão que resolve a faixa.
          </p>
        ) : (
          <ul className="flex flex-col gap-[13px]">
            {linhas.map((linha) => (
              <Barra
                key={linha.chave}
                rotulo={linha.rotulo}
                resumo={`${linha.obraNome} · ${linha.aprovadores} ${
                  linha.aprovadores === 1 ? 'aprovador' : 'aprovadores'
                }`}
                detalhe={`${linha.pedidos} ${linha.pedidos === 1 ? 'pedido' : 'pedidos'} · ${Dinheiro.formatar(
                  linha.valorCentavos as Centavos,
                )} · tempo médio ${duracao(linha.tempoMedioEmMs)}`}
                fracao={maior === 0 ? 0 : linha.pedidos / maior}
                valor={String(linha.pedidos)}
              />
            ))}
          </ul>
        )}

        {linhas.length > 0 && (
          <p className={`${NOTA} mt-4 border-neutro-200 bg-neutro-50 text-neutro-700`}>
            <strong>{dados.comUmaAssinatura}</strong> dos {dados.submetidos} pedidos submetidos
            passam por uma única assinatura.
          </p>
        )}
      </div>
    </section>
  )
}

// --- por aprovador -------------------------------------------------------------------------------

export function PorAprovador({ linhas }: { linhas: Painel['porAprovador'] }) {
  const maior = Math.max(...linhas.map((l) => l.tempoMedioEmMs), 0)

  return (
    <section className={CARTAO}>
      <Cabeca titulo="Tempo médio por aprovador" sub="Entre receber a vez e decidir" />
      <div className="px-5 pb-5">
        {linhas.length === 0 ? (
          <p className={`${NOTA} border-neutro-200 bg-neutro-50 text-neutro-700`}>
            Nenhuma decisão registrada no recorte. Uma etapa ainda pendente não tem duração — tem
            espera, e ela está na fila de atenção, abaixo.
          </p>
        ) : (
          <ul className="flex flex-col gap-[13px]">
            {linhas.map((linha, indice) => (
              <Barra
                key={linha.usuarioId}
                rotulo={linha.nome}
                resumo={`nível ${linha.nivelMaximo}`}
                detalhe={`${duracao(linha.tempoMedioEmMs)} · ${linha.decisoes} ${
                  linha.decisoes === 1 ? 'decisão' : 'decisões'
                }`}
                fracao={maior === 0 ? 0 : linha.tempoMedioEmMs / maior}
                valor={duracaoCurta(linha.tempoMedioEmMs)}
                // O mais lento é o gargalo — e a lista já vem ordenada por tempo decrescente.
                alerta={indice === 0 && linhas.length > 1}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

// --- fila de atenção -----------------------------------------------------------------------------

export function FilaDeAtencao({ linhas }: { linhas: Painel['fila'] }) {
  return (
    <section className={CARTAO}>
      <Cabeca
        titulo="Precisa de atenção agora"
        sub="Pendentes há mais de 24 h, do mais antigo para o mais novo"
        direita={
          <Link
            href="/pedidos?aba=todos&situacao=pendente"
            className="inline-flex min-h-[38px] items-center rounded-lg border border-neutro-300 bg-cartao px-[13px] text-[13px] font-semibold text-neutro-700 hover:bg-neutro-50"
          >
            Ver todos os pendentes
          </Link>
        }
      />

      {linhas.length === 0 ? (
        <p className={`${NOTA} mx-5 mb-5 border-sucesso-borda-forte bg-sucesso-fundo text-sucesso-texto`}>
          Nenhum pedido parado há mais de 24 h. A fila de atenção vazia é a boa notícia desta tela.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <caption className="sr-only">Pedidos parados há mais de 24 horas</caption>
            <thead>
              <tr>
                {['Pedido', 'Com quem está', 'Valor', 'Parado há', 'Situação'].map((titulo, i) => (
                  <th
                    key={titulo}
                    scope="col"
                    className={`border-t border-neutro-100 border-b border-b-neutro-200 bg-neutro-25 px-5 py-2.5 text-[11.5px] font-[650] whitespace-nowrap text-neutro-600 ${
                      i === 2 || i === 3 ? 'text-right' : 'text-left'
                    }`}
                  >
                    {titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.id} className="last:[&>td]:border-b-0">
                  <td className="border-b border-neutro-50 px-5 py-[13px] text-[13.5px]">
                    <div className="font-[650] text-forte">
                      #{linha.id} · {linha.obraNome}
                    </div>
                    <div className="mt-0.5 text-[12px] text-neutro-600">
                      {linha.fornecedorNome} · {linha.qtdItens}{' '}
                      {linha.qtdItens === 1 ? 'item' : 'itens'}
                    </div>
                  </td>
                  <td className="border-b border-neutro-50 px-5 py-[13px] text-[13.5px] text-neutro-700">
                    {linha.comQuem}{' '}
                    <span className="text-[12px] text-neutro-600">
                      nível {linha.nivel} de {linha.deQuantos}
                    </span>
                  </td>
                  <td className="border-b border-neutro-50 px-5 py-[13px] text-right text-[13.5px] text-forte tabular-nums">
                    {Dinheiro.formatar(linha.totalCentavos as Centavos)}
                  </td>
                  <td className="border-b border-neutro-50 px-5 py-[13px] text-right text-[13.5px] text-forte tabular-nums">
                    {duracao(linha.paradoHaEmMs)}
                  </td>
                  <td className="border-b border-neutro-50 px-5 py-[13px]">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11.5px] font-[650] whitespace-nowrap ${
                        linha.critico
                          ? 'border-erro-borda-forte bg-erro-fundo text-erro-texto'
                          : 'border-aviso-borda-forte bg-aviso-fundo text-aviso-texto'
                      }`}
                    >
                      {linha.critico ? 'Mais de 72 h' : 'Mais de 24 h'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
