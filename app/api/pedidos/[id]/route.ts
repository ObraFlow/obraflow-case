/**
 * Um pedido: leitura, substituição e remoção do rascunho.
 *
 * As três começam por `pedidoDaSessao`, que concentra as duas recusas desta sprint — 409 para
 * quem escreve em pedido submetido, 404 para quem toca rascunho alheio. A ordem entre elas está
 * documentada lá e não é estilo: rascunho alheio **não existe**, e 403 contaria que existe.
 *
 * O `GET` devolve o pedido inteiro: cabeçalho, snapshot da faixa, itens, **a cadeia lida das
 * `Etapa` gravadas**, o histórico das já decididas e `podeDecidir` para esta sessão. A cadeia
 * nunca é recalculada a partir da alçada vigente (ADR 0001) — editar ou apagar a faixa da obra
 * não muda uma linha do que se lê aqui, e é por isso que `cadeiaDoBanco` não recebe alçada.
 */

import { prisma } from '@/src/db/prisma'
import { Pedido } from '@/src/domain'
import { exigirSessao, ok, rota } from '@/src/server/http'
import {
  COM_ITENS,
  corpoDeRascunho,
  idDoCaminho,
  itensParaGravar,
  pedidoDaSessao,
  publicar,
} from '@/src/server/pedido'

type Contexto = { params: Promise<{ id: string }> }

export const GET = rota<Contexto>(async (req, { params }) => {
  const sessao = await exigirSessao(req)
  const { id } = await params

  return ok(publicar(await pedidoDaSessao(idDoCaminho(id), sessao, 'ler'), sessao))
})

/**
 * Substitui o rascunho **inteiro** — cabeçalho e itens de uma vez.
 *
 * É substituição e não remendo pelo mesmo motivo do `PUT` da faixa: a lista nova pode ser a
 * antiga em outra ordem, e casar linha a linha esbarraria no índice único `(pedidoId, ordem)` no
 * meio do caminho. Campo ausente no corpo é campo em branco, não campo preservado — um verbo,
 * um significado.
 *
 * `totalCentavos` não é lido do corpo em lugar nenhum: ele é sempre a soma dos totais dos itens,
 * calculada aqui. É invariante do modelo e é o número que determina a alçada.
 */
export const PUT = rota<Contexto>(async (req, { params }) => {
  const sessao = await exigirSessao(req)
  const { id } = await params
  const pedido = await pedidoDaSessao(idDoCaminho(id), sessao, 'escrever')

  const { obraId, fornecedorId, dataPedido, observacoes, linhas } = await corpoDeRascunho(req)
  const totalCentavos = Pedido.totalDosItens(linhas)

  const atualizado = await prisma.$transaction(async (tx) => {
    await tx.itemPedido.deleteMany({ where: { pedidoId: pedido.id } })
    await tx.pedido.update({
      where: { id: pedido.id },
      data: { obraId, fornecedorId, dataPedido, observacoes, totalCentavos },
    })
    if (linhas.length > 0) {
      await tx.itemPedido.createMany({ data: itensParaGravar(pedido.id, linhas) })
    }
    return tx.pedido.findUniqueOrThrow({ where: { id: pedido.id }, include: COM_ITENS })
  })

  return ok(publicar(atualizado, sessao))
})

/** Os itens vão junto, por `onDelete: Cascade` — não há item órfão a limpar. */
export const DELETE = rota<Contexto>(async (req, { params }) => {
  const sessao = await exigirSessao(req)
  const { id } = await params
  const pedido = await pedidoDaSessao(idDoCaminho(id), sessao, 'escrever')

  await prisma.pedido.delete({ where: { id: pedido.id } })

  return ok({ removido: true })
})
