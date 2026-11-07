/**
 * As derivações do painel da administração.
 *
 * Responsabilidade única: transformar a lista de pedidos visíveis em números — KPIs, série por
 * semana, corte por faixa, corte por aprovador e fila de atenção. Tudo função pura sobre formas
 * simples: nada aqui conhece Prisma, HTTP nem React, e é por isso que cada número tem caso de
 * teste em vez de ser conferido por inspeção na tela.
 *
 * **O instante é sempre parâmetro.** Nenhuma função chama `Date.now()`: "parado há 26 h" e "nos
 * últimos 30 dias" dependem de quando se pergunta, e uma função que lê o relógio por dentro não
 * tem como ser testada. Quem chama passa o `agora`.
 *
 * **De onde sai cada tempo.** O modelo não guarda "quando esta etapa recebeu a vez" — e não
 * precisa, porque isso é derivável e, sendo derivado, não tem como divergir do que aconteceu: a
 * primeira etapa recebe a vez na submissão do pedido, e cada etapa seguinte recebe a vez no
 * instante em que a anterior foi decidida (ADR 0001 — a cadeia é gravada inteira na submissão).
 */

import * as Dinheiro from './dinheiro'
import type { Centavos, SituacaoDaEtapa, SituacaoDoPedido } from './tipos'

export const UMA_HORA_EM_MS = 3_600_000
export const UM_DIA_EM_MS = 24 * UMA_HORA_EM_MS

/** A partir de quantas horas paradas um pedido entra na fila de atenção. É o número do artboard. */
export const HORAS_DE_ATENCAO = 24

/** A partir de quantas horas a fila marca o caso como crítico. Também do artboard. */
export const HORAS_CRITICAS = 72

export type EtapaDoPainel = {
  readonly ordem: number
  readonly usuarioId: string
  readonly nome: string
  readonly situacao: SituacaoDaEtapa
  readonly decididoEm: Date | null
  /** Obrigatório na rejeição desde a Sprint 6. O painel conta quantas o têm, em vez de supor. */
  readonly motivo: string | null
}

/** Um pedido como o painel o lê. Só o que alguma derivação usa — nada de itens nem observações. */
export type PedidoDoPainel = {
  readonly id: number
  readonly obraId: string | null
  readonly obraNome: string | null
  readonly fornecedorNome: string | null
  readonly situacao: SituacaoDoPedido
  readonly totalCentavos: Centavos
  readonly qtdItens: number
  readonly submetidoEm: Date | null
  readonly faixaLimiteCentavos: number | null
  readonly faixaSemTeto: boolean
  /** Em ordem crescente de `ordem`. As derivações contam com isso. */
  readonly etapas: readonly EtapaDoPainel[]
}

// --- tempos ------------------------------------------------------------------------------------

/**
 * Quando a etapa de índice `ordem` recebeu a vez.
 *
 * A de ordem 0 recebe na submissão; as demais, quando a anterior foi decidida. `null` significa
 * "ainda não recebeu" — a anterior segue pendente —, e não "recebeu em instante desconhecido".
 */
export function recebeuAVezEm(pedido: PedidoDoPainel, ordem: number): Date | null {
  if (ordem === 0) return pedido.submetidoEm
  const anterior = pedido.etapas.find((e) => e.ordem === ordem - 1)
  return anterior?.decididoEm ?? null
}

/** A etapa que está com a vez agora. Só existe enquanto o pedido está pendente. */
export function etapaDaVez(pedido: PedidoDoPainel): EtapaDoPainel | null {
  if (pedido.situacao !== 'pendente') return null
  return pedido.etapas.find((e) => e.situacao === 'pendente') ?? null
}

/** Quando a cadeia terminou: a última decisão registrada. `null` se ainda não terminou. */
export function concluidoEm(pedido: PedidoDoPainel): Date | null {
  if (pedido.situacao !== 'aprovado' && pedido.situacao !== 'rejeitado') return null
  const decisoes = pedido.etapas
    .map((e) => e.decididoEm)
    .filter((d): d is Date => d !== null)
    .map((d) => d.getTime())
  if (decisoes.length === 0) return null
  return new Date(Math.max(...decisoes))
}

/** Da submissão à última assinatura, em milissegundos. `null` enquanto a cadeia não terminou. */
export function tempoAteDecisaoEmMs(pedido: PedidoDoPainel): number | null {
  const fim = concluidoEm(pedido)
  if (!fim || !pedido.submetidoEm) return null
  return fim.getTime() - pedido.submetidoEm.getTime()
}

/** Há quanto tempo o pedido está parado com quem tem a vez. `null` se não está parado com ninguém. */
export function paradoHaEmMs(pedido: PedidoDoPainel, agora: Date): number | null {
  const etapa = etapaDaVez(pedido)
  if (!etapa) return null
  const desde = recebeuAVezEm(pedido, etapa.ordem)
  if (!desde) return null
  return Math.max(0, agora.getTime() - desde.getTime())
}

// --- janela de tempo ---------------------------------------------------------------------------

export type Janela = { readonly de: Date; readonly ate: Date }

/** Os últimos `dias` dias terminando em `agora`. Intervalo fechado nos dois lados. */
export function janela(agora: Date, dias: number): Janela {
  return { de: new Date(agora.getTime() - dias * UM_DIA_EM_MS), ate: agora }
}

/** A janela imediatamente anterior, do mesmo tamanho — é contra ela que a variação compara. */
export function janelaAnterior(j: Janela): Janela {
  const tamanho = j.ate.getTime() - j.de.getTime()
  return { de: new Date(j.de.getTime() - tamanho), ate: j.de }
}

function dentro(quando: Date | null, j: Janela): boolean {
  if (!quando) return false
  const t = quando.getTime()
  return t >= j.de.getTime() && t <= j.ate.getTime()
}

/** Os pedidos **submetidos** dentro da janela. Rascunho nunca entra: ele não foi submetido. */
export function submetidosNa(pedidos: readonly PedidoDoPainel[], j: Janela): PedidoDoPainel[] {
  return pedidos.filter((p) => dentro(p.submetidoEm, j))
}

// --- KPIs --------------------------------------------------------------------------------------

/**
 * Um número com o seu par do período anterior.
 *
 * `variacao` é `null` — e não zero, nem infinito — quando o período anterior é zero. "Cresceu
 * 100%" sobre base zero é uma afirmação que o dado não sustenta, e a tela precisa saber a
 * diferença para escrever "sem base de comparação" em vez de inventar uma seta.
 */
export type Comparado = {
  readonly valor: number
  readonly anterior: number
  readonly variacao: number | null
}

function comparar(valor: number, anterior: number): Comparado {
  return { valor, anterior, variacao: anterior === 0 ? null : (valor - anterior) / anterior }
}

export type Kpis = {
  readonly pedidos: Comparado
  readonly valorAprovadoCentavos: Comparado
  /** Média em ms da submissão à última assinatura. `valor` é `null` quando nada foi concluído. */
  readonly tempoMedioEmMs: { readonly valor: number | null; readonly anterior: number | null }
  readonly rejeicao: {
    readonly rejeitados: number
    readonly total: number
    readonly comMotivo: number
    readonly taxa: number | null
  }
  /** "Agora", não "no período": um pedido parado há três dias está parado hoje. */
  readonly parados: {
    readonly quantidade: number
    readonly valorTravadoCentavos: Centavos
    readonly criticos: number
  }
}

function somaDeTotais(pedidos: readonly PedidoDoPainel[]): Centavos {
  return Dinheiro.somar(...pedidos.map((p) => p.totalCentavos))
}

function mediaDeTempos(pedidos: readonly PedidoDoPainel[]): number | null {
  const tempos = pedidos.map(tempoAteDecisaoEmMs).filter((t): t is number => t !== null)
  if (tempos.length === 0) return null
  return Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length)
}

/**
 * Os cinco indicadores do topo do artboard.
 *
 * Os quatro primeiros são **do período**; o quinto, "parados há mais de 24 h", é do **agora** —
 * um pedido travado há uma semana continua travado hoje, e recortá-lo pela janela o esconderia
 * justamente de quem precisa vê-lo.
 */
export function kpis(
  todos: readonly PedidoDoPainel[],
  j: Janela,
  agora: Date,
): Kpis {
  const periodo = submetidosNa(todos, j)
  const anterior = submetidosNa(todos, janelaAnterior(j))

  const aprovados = periodo.filter((p) => p.situacao === 'aprovado')
  const aprovadosAntes = anterior.filter((p) => p.situacao === 'aprovado')
  const rejeitados = periodo.filter((p) => p.situacao === 'rejeitado')

  const parados = todos.filter((p) => {
    const ms = paradoHaEmMs(p, agora)
    return ms !== null && ms >= HORAS_DE_ATENCAO * UMA_HORA_EM_MS
  })

  return {
    pedidos: comparar(periodo.length, anterior.length),
    valorAprovadoCentavos: comparar(somaDeTotais(aprovados), somaDeTotais(aprovadosAntes)),
    tempoMedioEmMs: { valor: mediaDeTempos(periodo), anterior: mediaDeTempos(anterior) },
    rejeicao: {
      rejeitados: rejeitados.length,
      total: periodo.length,
      // O motivo é obrigatório na rejeição desde a Sprint 6; o painel conta em vez de afirmar,
      // porque um pedido rejeitado sem motivo seria defeito, e defeito tem de aparecer.
      comMotivo: rejeitados.filter((p) =>
        p.etapas.some((e) => e.situacao === 'rejeitada' && (e.motivo ?? '') !== ''),
      ).length,
      taxa: periodo.length === 0 ? null : rejeitados.length / periodo.length,
    },
    parados: {
      quantidade: parados.length,
      valorTravadoCentavos: somaDeTotais(parados),
      criticos: parados.filter(
        (p) => (paradoHaEmMs(p, agora) ?? 0) >= HORAS_CRITICAS * UMA_HORA_EM_MS,
      ).length,
    },
  }
}

// --- série por semana ----------------------------------------------------------------------------

export type PontoDaSerie = { readonly rotulo: string; readonly porObra: Record<string, Centavos> }

export type Serie = {
  readonly obras: ReadonlyArray<{ readonly id: string; readonly nome: string }>
  readonly pontos: readonly PontoDaSerie[]
}

/**
 * Valor aprovado por semana e por obra, nas últimas `semanas` semanas.
 *
 * A semana é um bloco de sete dias contado **para trás a partir de `agora`**, e não a semana do
 * calendário: o artboard rotula `S1…S6` sem citar data, e blocos relativos evitam a discussão de
 * fuso e de "a semana começa no domingo?" — que mudaria o número conforme quem olha.
 *
 * O ponto entra na semana em que o pedido foi **concluído**, não em que foi submetido: o cartão
 * se chama "valor aprovado por semana", e um pedido submetido em S2 e aprovado em S4 virou
 * dinheiro aprovado em S4.
 */
export function serieSemanal(
  pedidos: readonly PedidoDoPainel[],
  agora: Date,
  semanas: number,
): Serie {
  const aprovados = pedidos.filter((p) => p.situacao === 'aprovado' && p.obraId)

  const obras = [...new Map(aprovados.map((p) => [p.obraId!, p.obraNome ?? p.obraId!])).entries()]
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

  const pontos: PontoDaSerie[] = []
  for (let i = semanas; i >= 1; i -= 1) {
    const fim = new Date(agora.getTime() - (i - 1) * 7 * UM_DIA_EM_MS)
    const inicio = new Date(fim.getTime() - 7 * UM_DIA_EM_MS)
    const porObra: Record<string, Centavos> = {}
    for (const obra of obras) {
      const naSemana = aprovados.filter((p) => {
        const quando = concluidoEm(p)
        return (
          p.obraId === obra.id &&
          quando !== null &&
          quando.getTime() > inicio.getTime() &&
          quando.getTime() <= fim.getTime()
        )
      })
      porObra[obra.id] = somaDeTotais(naSemana)
    }
    pontos.push({ rotulo: `S${semanas - i + 1}`, porObra })
  }

  return { obras, pontos }
}

// --- cortes --------------------------------------------------------------------------------------

export type CorteDeFaixa = {
  readonly chave: string
  readonly rotulo: string
  readonly obraNome: string
  readonly aprovadores: number
  readonly pedidos: number
  readonly valorCentavos: Centavos
  readonly tempoMedioEmMs: number | null
}

/**
 * Pedidos por faixa de alçada, lidos do **snapshot** de cada pedido e não da alçada vigente.
 *
 * É o que ADR 0001 exige: a faixa pode ter sido editada ou apagada depois da submissão, e o corte
 * tem de mostrar sob que regra cada pedido de fato correu. Agrupar pela alçada de hoje
 * reescreveria o passado a cada edição de faixa.
 *
 * `aprovadores` sai do tamanho da cadeia gravada, pelo mesmo motivo.
 */
export function porFaixa(pedidos: readonly PedidoDoPainel[]): CorteDeFaixa[] {
  const submetidos = pedidos.filter((p) => p.situacao !== 'rascunho')
  const grupos = new Map<string, PedidoDoPainel[]>()

  for (const pedido of submetidos) {
    const chave = `${pedido.obraId ?? '—'}|${pedido.faixaSemTeto ? 'aberta' : pedido.faixaLimiteCentavos ?? 'sem'}`
    const atual = grupos.get(chave)
    if (atual) atual.push(pedido)
    else grupos.set(chave, [pedido])
  }

  return [...grupos.entries()]
    .map(([chave, doGrupo]) => {
      const primeiro = doGrupo[0]
      return {
        chave,
        rotulo: rotuloDaFaixa(primeiro),
        obraNome: primeiro.obraNome ?? 'Sem obra',
        aprovadores: Math.max(...doGrupo.map((p) => p.etapas.length)),
        pedidos: doGrupo.length,
        valorCentavos: somaDeTotais(doGrupo),
        tempoMedioEmMs: mediaDeTempos(doGrupo),
      }
    })
    .sort((a, b) => b.pedidos - a.pedidos || a.rotulo.localeCompare(b.rotulo, 'pt-BR'))
}

function rotuloDaFaixa(pedido: PedidoDoPainel): string {
  if (pedido.faixaSemTeto || pedido.faixaLimiteCentavos === null) return 'Faixa sem teto'
  return `Até ${Dinheiro.formatar(pedido.faixaLimiteCentavos as Centavos)}`
}

export type CorteDeAprovador = {
  readonly usuarioId: string
  readonly nome: string
  readonly decisoes: number
  readonly tempoMedioEmMs: number
  readonly nivelMaximo: number
}

/**
 * Tempo médio entre receber a vez e decidir, por aprovador.
 *
 * Só entram etapas **decididas** e cujo início da vez é conhecido. Etapa ainda pendente não tem
 * duração — tem espera, que é o que a fila de atenção mostra, e misturar as duas inflaria a média
 * de quem simplesmente ainda não foi chamado.
 */
export function porAprovador(pedidos: readonly PedidoDoPainel[]): CorteDeAprovador[] {
  const porPessoa = new Map<string, { nome: string; tempos: number[]; niveis: number[] }>()

  for (const pedido of pedidos) {
    for (const etapa of pedido.etapas) {
      if (etapa.decididoEm === null) continue
      const inicio = recebeuAVezEm(pedido, etapa.ordem)
      if (!inicio) continue

      const atual = porPessoa.get(etapa.usuarioId) ?? { nome: etapa.nome, tempos: [], niveis: [] }
      atual.tempos.push(Math.max(0, etapa.decididoEm.getTime() - inicio.getTime()))
      atual.niveis.push(etapa.ordem + 1)
      porPessoa.set(etapa.usuarioId, atual)
    }
  }

  return [...porPessoa.entries()]
    .map(([usuarioId, dados]) => ({
      usuarioId,
      nome: dados.nome,
      decisoes: dados.tempos.length,
      tempoMedioEmMs: Math.round(dados.tempos.reduce((a, b) => a + b, 0) / dados.tempos.length),
      nivelMaximo: Math.max(...dados.niveis),
    }))
    .sort((a, b) => b.tempoMedioEmMs - a.tempoMedioEmMs)
}

export type LinhaDaFila = {
  readonly id: number
  readonly obraNome: string
  readonly fornecedorNome: string
  readonly qtdItens: number
  readonly comQuem: string
  readonly nivel: number
  readonly deQuantos: number
  readonly totalCentavos: Centavos
  readonly paradoHaEmMs: number
  readonly critico: boolean
}

/** Os pendentes parados há mais de `HORAS_DE_ATENCAO`, do mais antigo para o mais novo. */
export function filaDeAtencao(
  pedidos: readonly PedidoDoPainel[],
  agora: Date,
): LinhaDaFila[] {
  const linhas: LinhaDaFila[] = []

  for (const pedido of pedidos) {
    const etapa = etapaDaVez(pedido)
    const ms = paradoHaEmMs(pedido, agora)
    if (!etapa || ms === null || ms < HORAS_DE_ATENCAO * UMA_HORA_EM_MS) continue

    linhas.push({
      id: pedido.id,
      obraNome: pedido.obraNome ?? 'Sem obra',
      fornecedorNome: pedido.fornecedorNome ?? 'Sem fornecedor',
      qtdItens: pedido.qtdItens,
      comQuem: etapa.nome,
      nivel: etapa.ordem + 1,
      deQuantos: pedido.etapas.length,
      totalCentavos: pedido.totalCentavos,
      paradoHaEmMs: ms,
      critico: ms >= HORAS_CRITICAS * UMA_HORA_EM_MS,
    })
  }

  return linhas.sort((a, b) => b.paradoHaEmMs - a.paradoHaEmMs)
}

/** Quantos pedidos passam por uma assinatura só — o número que a leitura do artboard cita. */
export function comUmaAssinatura(pedidos: readonly PedidoDoPainel[]): number {
  return pedidos.filter((p) => p.situacao !== 'rascunho' && p.etapas.length === 1).length
}
