/**
 * O que as rotas de pedido compartilham.
 *
 * Responsabilidade única: achar o pedido que a sessão pode tocar, traduzir entre as linhas do
 * Prisma e o vocabulário do domínio, e cobrar as regras que dependem do banco — a obra existir,
 * o fornecedor existir, a alçada da obra comportar o total. A aritmética e a regra ficam em
 * `src/domain/pedido.ts`; a rota lê sessão, chama daqui e traduz o resultado.
 *
 * As duas recusas que mais importam estão em `pedidoDaSessao`, e a ordem entre elas é a regra:
 * **imutabilidade antes de propriedade**. Um pedido submetido é visível a qualquer sessão, e
 * escrever nele é 409 para todo mundo, inclusive para quem não o criou; um rascunho alheio, ao
 * contrário, não existe — 404, nunca 403, porque 403 contaria que ele existe.
 */

import type { Prisma } from '@prisma/client'

import { prisma } from '@/src/db/prisma'
import {
  Alcada,
  Cadeia,
  Decisao,
  Pedido,
  Schemas,
  ehSituacaoDaEtapa,
  ehSituacaoDoPedido,
  type Centavos,
  type Milesimos,
  type Ordem,
  type SituacaoDaEtapa,
  type SituacaoDoPedido,
} from '@/src/domain'
import { lerCorpoJson, recusar } from './http'
import { pode } from './permissao'
import type { Sessao } from './sessao'

/** Um item como a borda o devolve. `totalCentavos` é sempre do servidor. */
export type ItemPublico = {
  readonly id: string
  readonly descricao: string
  readonly quantidadeMilesimos: number
  readonly unidade: string
  readonly precoUnitarioCentavos: number | null
  readonly totalCentavos: number
  readonly ordem: number
}

/** Uma obra e um fornecedor como o pedido os carrega: só o que a tela escreve na linha. */
export type ObraDoPedido = { readonly id: string; readonly nome: string; readonly cidade: string }
export type FornecedorDoPedido = {
  readonly id: string
  readonly nome: string
  readonly documento: string | null
}

/**
 * Uma etapa da cadeia como a borda a devolve.
 *
 * Sai das `Etapa` gravadas e de mais lugar nenhum (ADR 0001): a alçada vigente não participa
 * desta serialização, e é por isso que editar ou apagar a faixa depois não muda o que se lê aqui.
 */
export type EtapaPublica = {
  readonly ordem: number
  readonly usuarioId: string
  readonly nome: string
  readonly situacao: SituacaoDaEtapa
  readonly decididoEm: string | null
  readonly motivo: string | null
}

/** Um pedido como a borda o devolve. */
export type PedidoPublico = {
  readonly id: number
  readonly obraId: string | null
  readonly fornecedorId: string | null
  readonly observacoes: string | null
  /** Quem criou. Enquanto rascunho, é também a única sessão que o enxerga. */
  readonly criadoPorId: string
  readonly situacao: SituacaoDoPedido
  readonly totalCentavos: number
  readonly dataPedido: string | null
  readonly submetidoEm: string | null
  readonly faixa: { readonly limiteCentavos: number | null; readonly semTeto: boolean } | null
  readonly itens: readonly ItemPublico[]
  readonly obra: ObraDoPedido | null
  readonly fornecedor: FornecedorDoPedido | null
  readonly criadoPor: { readonly id: string; readonly nome: string }
  /** A cadeia gravada, em ordem. Vazia enquanto o pedido é rascunho. */
  readonly cadeia: readonly EtapaPublica[]
  /** As etapas já decididas, em ordem — é o histórico que a tela mostra. */
  readonly historico: readonly EtapaPublica[]
  /** A etapa que decide agora, ou `null` quando a cadeia terminou (ou nem começou). */
  readonly etapaAtual: EtapaPublica | null
  /** Verdadeiro só para quem tem o papel que decide **e** é o aprovador da vez. */
  readonly podeDecidir: boolean
}

/**
 * O que toda leitura de um pedido traz junto.
 *
 * As etapas entram aqui, e não só no `GET` do detalhe, porque a cadeia gravada é o que diz se
 * esta sessão pode decidir — e essa pergunta é feita tanto no detalhe quanto na lista. Ler a
 * etapa com o nome do usuário é o que dispensa uma segunda consulta por pedido na tela, que é
 * justamente onde a cadeia precisa aparecer desenhada.
 */
export const COM_ITENS = {
  itens: { orderBy: { ordem: 'asc' } },
  etapas: { orderBy: { ordem: 'asc' }, include: { usuario: { select: { id: true, nome: true } } } },
  obra: { select: { id: true, nome: true, cidade: true } },
  fornecedor: { select: { id: true, nome: true, documento: true } },
  criadoPor: { select: { id: true, nome: true } },
} satisfies Prisma.PedidoInclude

type LinhaDePedido = Prisma.PedidoGetPayload<{ include: typeof COM_ITENS }>

type LinhaDeEtapa = LinhaDePedido['etapas'][number]

/**
 * O id do pedido é `Int` porque ele é citado por humanos como "#1002". Um segmento que não é
 * inteiro não é "id inválido": é um pedido que não existe, e responde 404 como qualquer outro —
 * a mesma pergunta não pode ter duas respostas conforme o palpite.
 */
export function idDoCaminho(bruto: string): number {
  if (!/^\d+$/.test(bruto)) recusar('NAO_ENCONTRADO', 'Pedido não encontrado.')
  return Number(bruto)
}

export type Modo = 'ler' | 'escrever'

/**
 * O pedido que esta sessão pode tocar, ou a recusa certa.
 *
 * - inexistente → 404;
 * - submetido e `modo` é `escrever` → 409 `PEDIDO_IMUTAVEL`, para qualquer sessão;
 * - rascunho de outra pessoa → 404 `NAO_ENCONTRADO`, nunca 403. Rascunho é privado do criador, e
 *   o que é privado não existe para quem não o criou. É o que elimina edição concorrente por
 *   construção: não há duas pessoas com acesso de escrita ao mesmo rascunho.
 */
export async function pedidoDaSessao(
  id: number,
  sessao: Sessao,
  modo: Modo,
): Promise<LinhaDePedido> {
  const linha = await prisma.pedido.findUnique({ where: { id }, include: COM_ITENS })
  if (!linha) recusar('NAO_ENCONTRADO', 'Pedido não encontrado.')

  const situacao = situacaoDe(linha.situacao)

  if (modo === 'escrever') {
    const conflito = Pedido.conflitoDeImutabilidade(situacao)
    if (conflito) recusar(conflito.codigo, conflito.mensagem, conflito.campos)
  }

  if (Pedido.ehRascunho(situacao) && linha.criadoPorId !== sessao.usuarioId) {
    recusar('NAO_ENCONTRADO', 'Pedido não encontrado.')
  }

  return linha
}

/** SQLite não tem enum: esta é a fronteira em que o texto gravado vira situação do domínio. */
export function situacaoDe(bruto: string): SituacaoDoPedido {
  if (!ehSituacaoDoPedido(bruto)) {
    // Situação fora do conjunto fechado é banco corrompido, não entrada do cliente: 500 com
    // mensagem genérica é mais honesto do que fingir uma recusa de regra.
    throw new Error(`Situação de pedido desconhecida no banco: ${bruto}`)
  }
  return bruto
}

/** SQLite não tem enum: esta é a fronteira em que o texto gravado vira situação de etapa. */
export function situacaoDaEtapaDe(bruto: string): SituacaoDaEtapa {
  if (!ehSituacaoDaEtapa(bruto)) {
    throw new Error(`Situação de etapa desconhecida no banco: ${bruto}`)
  }
  return bruto
}

/**
 * As `Etapa` gravadas, no vocabulário do domínio.
 *
 * Esta função é o único caminho pelo qual uma cadeia entra no domínio depois da submissão, e ela
 * lê **linhas do banco** — nunca a alçada da obra. É aqui que o ADR 0001 fica verificável: não há
 * parâmetro de alçada a passar, então não há como recalcular a cadeia por engano.
 */
export function cadeiaDoBanco(etapas: readonly LinhaDeEtapa[]): Cadeia.Cadeia {
  return Cadeia.etapasEmOrdem(
    etapas.map((etapa) => ({
      ordem: etapa.ordem as Ordem,
      usuarioId: etapa.usuarioId,
      situacao: situacaoDaEtapaDe(etapa.situacao),
      decididoEm: etapa.decididoEm,
      motivo: etapa.motivo,
    })),
  )
}

function publicarEtapa(etapa: LinhaDeEtapa): EtapaPublica {
  return {
    ordem: etapa.ordem,
    usuarioId: etapa.usuarioId,
    nome: etapa.usuario.nome,
    situacao: situacaoDaEtapaDe(etapa.situacao),
    decididoEm: etapa.decididoEm?.toISOString() ?? null,
    motivo: etapa.motivo,
  }
}

/**
 * Quem pode decidir **este** pedido, agora.
 *
 * Duas perguntas, e as duas precisam ser sim: o papel autoriza decidir (matriz da Sprint 3) e a
 * sessão é o aprovador da vez da cadeia gravada (`Decisao.podeDecidir`). Separá-las é o que faz
 * o admin — que gere a alçada e não assina — aparecer com `podeDecidir: false` mesmo quando por
 * acaso estiver numa faixa.
 *
 * O valor é conforto da tela, não controle: a imposição é o UPDATE condicional do ADR 0004, e
 * `curl` encontra a mesma recusa que o botão desabilitado anuncia.
 */
export function podeDecidirAgora(cadeia: Cadeia.Cadeia, sessao: Sessao): boolean {
  return pode(sessao.papel, 'decidir') && Decisao.podeDecidir(cadeia, sessao.usuarioId)
}

export function publicar(linha: LinhaDePedido, sessao: Sessao): PedidoPublico {
  const cadeia = cadeiaDoBanco(linha.etapas)
  const vez = Cadeia.aprovadorDaVez(cadeia)
  const porOrdem = new Map(linha.etapas.map((etapa) => [etapa.ordem, etapa]))
  const publicada = (ordem: number): EtapaPublica => publicarEtapa(porOrdem.get(ordem)!)

  return {
    id: linha.id,
    obraId: linha.obraId,
    fornecedorId: linha.fornecedorId,
    observacoes: linha.observacoes,
    criadoPorId: linha.criadoPorId,
    situacao: situacaoDe(linha.situacao),
    totalCentavos: linha.totalCentavos,
    dataPedido: linha.dataPedido?.toISOString() ?? null,
    submetidoEm: linha.submetidoEm?.toISOString() ?? null,
    faixa:
      linha.faixaId === null && linha.faixaLimiteCentavos === null && !linha.faixaSemTeto
        ? null
        : { limiteCentavos: linha.faixaLimiteCentavos, semTeto: linha.faixaSemTeto },
    itens: linha.itens.map((item) => ({
      id: item.id,
      descricao: item.descricao,
      quantidadeMilesimos: item.quantidadeMilesimos,
      unidade: item.unidade,
      precoUnitarioCentavos: item.precoUnitarioCentavos,
      totalCentavos: item.totalCentavos,
      ordem: item.ordem,
    })),
    obra: linha.obra,
    fornecedor: linha.fornecedor,
    criadoPor: linha.criadoPor,
    cadeia: Cadeia.etapasEmOrdem(cadeia).map((etapa) => publicada(etapa.ordem)),
    historico: Cadeia.historico(cadeia).map((etapa) => publicada(etapa.ordem)),
    etapaAtual: vez ? publicada(vez.ordem) : null,
    podeDecidir: podeDecidirAgora(cadeia, sessao),
  }
}

/**
 * Um pedido como a **lista** o devolve: as nove colunas do enunciado, e a cadeia que a linha
 * desenha em forma de trilha.
 *
 * A contagem de itens vem como número e não como a lista inteira — a lista traz até cem pedidos,
 * e carregar os itens de todos para contá-los seria pagar o detalhe inteiro para escrever "3
 * itens".
 */
export type ResumoDePedido = {
  readonly id: number
  readonly obra: ObraDoPedido | null
  readonly fornecedor: FornecedorDoPedido | null
  readonly dataPedido: string | null
  readonly qtdItens: number
  readonly totalCentavos: number
  readonly situacao: SituacaoDoPedido
  readonly faixa: { readonly limiteCentavos: number | null; readonly semTeto: boolean } | null
  readonly cadeia: readonly EtapaPublica[]
  readonly etapaAtual: EtapaPublica | null
  readonly podeDecidir: boolean
}

type LinhaDeResumo = Prisma.PedidoGetPayload<{ include: typeof PARA_LISTA }>

export const PARA_LISTA = {
  obra: { select: { id: true, nome: true, cidade: true } },
  fornecedor: { select: { id: true, nome: true, documento: true } },
  etapas: { orderBy: { ordem: 'asc' }, include: { usuario: { select: { id: true, nome: true } } } },
  _count: { select: { itens: true } },
} satisfies Prisma.PedidoInclude

export function resumir(linha: LinhaDeResumo, sessao: Sessao): ResumoDePedido {
  const cadeia = cadeiaDoBanco(linha.etapas)
  const vez = Cadeia.aprovadorDaVez(cadeia)
  const porOrdem = new Map(linha.etapas.map((etapa) => [etapa.ordem, etapa]))

  return {
    id: linha.id,
    obra: linha.obra,
    fornecedor: linha.fornecedor,
    dataPedido: linha.dataPedido?.toISOString() ?? null,
    qtdItens: linha._count.itens,
    totalCentavos: linha.totalCentavos,
    situacao: situacaoDe(linha.situacao),
    faixa:
      linha.faixaId === null && linha.faixaLimiteCentavos === null && !linha.faixaSemTeto
        ? null
        : { limiteCentavos: linha.faixaLimiteCentavos, semTeto: linha.faixaSemTeto },
    cadeia: Cadeia.etapasEmOrdem(cadeia).map((etapa) => publicarEtapa(porOrdem.get(etapa.ordem)!)),
    etapaAtual: vez ? publicarEtapa(porOrdem.get(vez.ordem)!) : null,
    podeDecidir: podeDecidirAgora(cadeia, sessao),
  }
}

/**
 * Lê o corpo de um rascunho e cobra o que depende do banco.
 *
 * O corpo inteiro pode faltar — `POST /api/pedidos` sem corpo nenhum cria um rascunho vazio, que
 * é o que o critério "aceita corpo com todos os campos ausentes" pede. Daí o `{}` em vez da
 * recusa por JSON inválido: um corpo que não existe não é um corpo malformado.
 */
export async function corpoDeRascunho(req: Request): Promise<{
  obraId: string | null
  fornecedorId: string | null
  dataPedido: Date | null
  observacoes: string | null
  linhas: readonly Pedido.LinhaDeItem[]
}> {
  const bruto = (await lerCorpoJson(req)) ?? {}

  const analise = Schemas.validarRascunho(bruto)
  if (!analise.ok) recusar(analise.erro.codigo, analise.erro.mensagem, analise.erro.campos)

  const { obraId, fornecedorId, dataPedido, observacoes, itens } = analise.valor

  if (obraId) await exigirObraDoCorpo(obraId)
  if (fornecedorId) await exigirFornecedorDoCorpo(fornecedorId)

  return {
    obraId: obraId ?? null,
    fornecedorId: fornecedorId ?? null,
    dataPedido: dataPedido ?? null,
    observacoes: observacoes ?? null,
    // `itens` ausente é lista vazia, e não "não mexa nos itens": o `PUT` substitui o rascunho
    // inteiro, como o `PUT` da faixa substitui a faixa inteira. Um verbo, um significado.
    linhas: Pedido.linhasDeItens(itens ?? []),
  }
}

/**
 * Obra inexistente citada no corpo é 422, não 404: o recurso do caminho — o pedido — existe; o
 * que está errado é um valor do corpo, e a tela precisa saber qual campo destacar. Sem esta
 * checagem o erro viria do banco como violação de chave estrangeira e chegaria como 500.
 */
async function exigirObraDoCorpo(obraId: string): Promise<void> {
  const obra = await prisma.obra.findUnique({ where: { id: obraId }, select: { id: true } })
  if (!obra) {
    recusar('VALIDACAO', 'Esta obra não existe mais.', { obraId: 'Escolha uma obra da lista.' })
  }
}

async function exigirFornecedorDoCorpo(fornecedorId: string): Promise<void> {
  const fornecedor = await prisma.fornecedor.findUnique({
    where: { id: fornecedorId },
    select: { id: true },
  })
  if (!fornecedor) {
    recusar('VALIDACAO', 'Este fornecedor não existe mais.', {
      fornecedorId: 'Escolha um fornecedor da lista.',
    })
  }
}

/** As linhas a gravar, já com a ordem reindexada pela posição. */
export function itensParaGravar(
  pedidoId: number,
  linhas: readonly Pedido.LinhaDeItem[],
): Prisma.ItemPedidoCreateManyInput[] {
  return linhas.map((linha) => ({
    pedidoId,
    descricao: linha.descricao,
    quantidadeMilesimos: linha.quantidadeMilesimos,
    unidade: linha.unidade,
    precoUnitarioCentavos: linha.precoUnitarioCentavos,
    totalCentavos: linha.totalCentavos,
    ordem: linha.ordem,
  }))
}

/** As linhas gravadas, de volta no vocabulário do domínio. */
export function linhasDoBanco(
  itens: readonly LinhaDePedido['itens'][number][],
): readonly Pedido.LinhaDeItem[] {
  return itens.map((item) => ({
    descricao: item.descricao,
    quantidadeMilesimos: item.quantidadeMilesimos as Milesimos,
    unidade: unidadeDe(item.unidade),
    precoUnitarioCentavos: item.precoUnitarioCentavos as Centavos | null,
    totalCentavos: item.totalCentavos as Centavos,
    ordem: item.ordem as Ordem,
  }))
}

function unidadeDe(bruto: string): Schemas.Unidade {
  return (Schemas.UNIDADES as readonly string[]).includes(bruto)
    ? (bruto as Schemas.Unidade)
    : Pedido.UNIDADE_PADRAO
}

/**
 * A alçada da obra no formato do domínio, com os aprovadores na ordem gravada.
 *
 * Diferente da leitura de `src/server/alcada.ts`, esta traz os aprovadores: é deles que a cadeia
 * é montada na submissão. Fica aqui, e não lá, porque é a submissão que precisa dela — e porque
 * a leitura acontece **dentro** da transação, para que a faixa apagada entre a leitura e a
 * escrita vire `SEM_REGRA_APLICAVEL` em vez de uma cadeia gravada a partir de regra que sumiu.
 */
export async function alcadaComAprovadores(
  tx: Prisma.TransactionClient,
  obraId: string,
): Promise<Alcada.Alcada> {
  const linhas = await tx.faixa.findMany({
    where: { obraId },
    select: {
      id: true,
      limiteCentavos: true,
      aprovadores: { orderBy: { ordem: 'asc' }, select: { usuarioId: true, ordem: true } },
    },
  })

  return {
    obraId,
    faixas: linhas.map((faixa) => ({
      id: faixa.id,
      limiteCentavos: faixa.limiteCentavos as Centavos | null,
      aprovadores: faixa.aprovadores.map((a) => ({
        usuarioId: a.usuarioId,
        ordem: a.ordem as Ordem,
      })),
    })),
  }
}
