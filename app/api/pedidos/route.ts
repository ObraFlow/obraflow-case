/**
 * Os pedidos de compra.
 *
 * `POST` cria o rascunho e só isso: a linha nasce vazia, com `situacao` rascunho, total zero e o
 * criador vindo da sessão — nunca do corpo. Resolver faixa e montar cadeia é da submissão
 * (ADR 0001), e tentar antecipá-las aqui gravaria uma cadeia derivada de um total que ainda vai
 * mudar.
 *
 * `GET` é a lista: todos veem todos os pedidos **submetidos**, e o rascunho só aparece para
 * quem o criou — nunca para mais ninguém, em filtro nenhum, para papel nenhum. A privacidade do
 * rascunho não é um filtro a mais na tela: é parte do `where`, e é o que a torna impossível de
 * esquecer.
 */

import { prisma } from '@/src/db/prisma'
import type { Prisma } from '@prisma/client'

import {
  COM_ITENS,
  PARA_LISTA,
  corpoDeRascunho,
  itensParaGravar,
  publicar,
  resumir,
} from '@/src/server/pedido'
import { exigirPermissao, ok, recusar, rota } from '@/src/server/http'
import { Pedido, Schemas, SITUACOES_DO_PEDIDO, type SituacaoDoPedido } from '@/src/domain'

/** Tudo que não é rascunho. É o que "sem filtro" significa: a lista dos pedidos submetidos. */
const SUBMETIDAS = SITUACOES_DO_PEDIDO.filter((s) => s !== 'rascunho')

export const GET = rota(async (req) => {
  const sessao = await exigirPermissao(req, 'ver_pedidos')

  const parametros = new URL(req.url).searchParams
  const situacao = parametros.getAll('situacao')
  const analise = Schemas.validarFiltroDePedidos({
    // `situacao` é repetível: `?situacao=pendente&situacao=aprovado`. Ausente é `undefined` e
    // não lista vazia — lista vazia significaria "nenhuma situação", que não é o que "sem
    // filtro" quer dizer.
    situacao: situacao.length > 0 ? situacao : undefined,
    obraId: parametros.get('obraId') ?? undefined,
    page: parametros.get('page') ?? undefined,
    perPage: parametros.get('perPage') ?? undefined,
  })
  if (!analise.ok) recusar(analise.erro.codigo, analise.erro.mensagem, analise.erro.campos)

  const filtro = analise.valor
  const where = aListaQueEstaSessaoVe(filtro.situacao ?? SUBMETIDAS, filtro.obraId, sessao.usuarioId)

  // Obra inexistente não é 404: o recurso do caminho é a lista, e ela existe. O filtro apenas
  // não casa com pedido nenhum, e lista vazia é a resposta honesta.
  const [total, linhas] = await prisma.$transaction([
    prisma.pedido.count({ where }),
    prisma.pedido.findMany({
      where,
      include: PARA_LISTA,
      orderBy: [{ dataPedido: 'desc' }, { id: 'desc' }],
      skip: (filtro.page - 1) * filtro.perPage,
      take: filtro.perPage,
    }),
  ])

  return ok({
    itens: linhas.map((linha) => resumir(linha, sessao)),
    total,
    page: filtro.page,
    perPage: filtro.perPage,
  })
})

/**
 * O `where` da lista, e a razão de ele existir como função.
 *
 * Duas famílias de pedido, com visibilidades diferentes, numa consulta só: o submetido, que
 * qualquer sessão vê, e o rascunho, que só o criador vê. O `OR` entre as duas é o que impede
 * que um filtro de situação alargue a visibilidade — pedir `situacao=rascunho` como Amanda
 * devolve os rascunhos **de Amanda**, nunca os de Caio.
 */
function aListaQueEstaSessaoVe(
  situacoes: readonly SituacaoDoPedido[],
  obraId: string | undefined,
  usuarioId: string,
): Prisma.PedidoWhereInput {
  const submetidas = situacoes.filter((s) => s !== 'rascunho')
  const visiveis: Prisma.PedidoWhereInput[] = []

  if (submetidas.length > 0) visiveis.push({ situacao: { in: [...submetidas] } })
  if (situacoes.includes('rascunho')) {
    visiveis.push({ situacao: 'rascunho', criadoPorId: usuarioId })
  }

  return { OR: visiveis, ...(obraId ? { obraId } : {}) }
}

export const POST = rota(async (req) => {
  // A recusa vem antes de qualquer consulta de negócio: aprovador e visualizador não leem obra
  // nenhuma. `criar_pedido` é da matriz da Sprint 3 e é o único lugar onde a resposta existe.
  const sessao = await exigirPermissao(req, 'criar_pedido')

  const { obraId, fornecedorId, dataPedido, observacoes, linhas } = await corpoDeRascunho(req)
  const totalCentavos = Pedido.totalDosItens(linhas)

  // Cabeçalho e itens numa transação só, pelo mesmo motivo da faixa com os seus aprovadores: um
  // rascunho com metade dos itens não é um estado que valha a pena poder observar.
  const criado = await prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.create({
      data: {
        obraId,
        fornecedorId,
        dataPedido,
        observacoes,
        totalCentavos,
        criadoPorId: sessao.usuarioId,
      },
      select: { id: true },
    })
    if (linhas.length > 0) {
      await tx.itemPedido.createMany({ data: itensParaGravar(pedido.id, linhas) })
    }
    return tx.pedido.findUniqueOrThrow({ where: { id: pedido.id }, include: COM_ITENS })
  })

  return ok(publicar(criado, sessao), 201)
})
