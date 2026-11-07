/**
 * Uma faixa da alçada: substituição e remoção.
 *
 * `PUT` substitui a faixa **inteira** — limite e lista ordenada de aprovadores de uma vez. Não
 * existe rota de reordenação, e a ausência é deliberada: reordenar seria uma sequência de
 * escritas, e entre duas delas dois aprovadores ocupariam a mesma posição. Com a substituição,
 * arrastar é estado da tela até alguém salvar.
 */

import { prisma } from '@/src/db/prisma'
import {
  aprovadoresNaOrdem,
  corpoDeFaixa,
  exigirFaixa,
  faixaPublica,
} from '@/src/server/alcada'
import { exigirPermissao, ok, rota } from '@/src/server/http'

type Contexto = { params: Promise<{ id: string }> }

export const PUT = rota<Contexto>(async (req, { params }) => {
  await exigirPermissao(req, 'gerir_alcada')

  const { id } = await params
  const faixa = await exigirFaixa(id)
  const { limiteCentavos, aprovadores } = await corpoDeFaixa(req, faixa.obraId, faixa.id)

  // Apagar e recriar dentro da mesma transação, e não casar linha a linha: a lista nova pode ser
  // a antiga em outra ordem, e um `update` por posição esbarraria no índice único (faixaId,
  // ordem) no meio do caminho — com a faixa já meio reordenada se a transação não existisse.
  await prisma.$transaction(async (tx) => {
    await tx.faixaAprovador.deleteMany({ where: { faixaId: faixa.id } })
    await tx.faixa.update({ where: { id: faixa.id }, data: { limiteCentavos } })
    await tx.faixaAprovador.createMany({ data: aprovadoresNaOrdem(faixa.id, aprovadores) })
  })

  return ok(await faixaPublica(faixa.id))
})

/**
 * Remove a faixa. Os pedidos submetidos sob ela sobrevivem.
 *
 * `Pedido.faixaId` é `onDelete: SetNull` e o snapshot (`faixaLimiteCentavos`, `faixaSemTeto`) é
 * coluna do próprio pedido: a cadeia gravada na submissão continua intacta, porque ela é
 * histórico do pedido e não uma visão da regra atual (ADR 0001). `pedidosAfetados` conta quantos
 * pedidos perderam o vínculo — é o número que o aviso da tela precisa dizer antes de confirmar.
 */
export const DELETE = rota<Contexto>(async (req, { params }) => {
  await exigirPermissao(req, 'gerir_alcada')

  const { id } = await params
  const faixa = await exigirFaixa(id)

  const pedidosAfetados = await prisma.pedido.count({ where: { faixaId: faixa.id } })
  await prisma.faixa.delete({ where: { id: faixa.id } })

  return ok({ removida: true, pedidosAfetados })
})
