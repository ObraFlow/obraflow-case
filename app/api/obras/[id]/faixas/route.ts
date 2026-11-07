/**
 * As faixas da alçada de uma obra.
 *
 * `GET` lista; `POST` cria. A tela de regras da alçada consome as duas, e o contrato é o mesmo
 * que o `curl` enxerga — não há Server Action nenhuma no caminho (ADR 0003).
 */

import { prisma } from '@/src/db/prisma'
import {
  aprovadoresNaOrdem,
  corpoDeFaixa,
  exigirObra,
  faixaPublica,
  faixasDaObra,
} from '@/src/server/alcada'
import { exigirPermissao, exigirSessao, ok, rota } from '@/src/server/http'

type Contexto = { params: Promise<{ id: string }> }

/**
 * Ler a alçada exige sessão, não o papel admin: a faixa aplicável explica a cadeia de um pedido,
 * e quem acompanha pedidos precisa poder ver por que o pedido foi parar com aquelas pessoas.
 * Quem **edita** é outra pergunta, e é a do `POST`.
 */
export const GET = rota<Contexto>(async (req, { params }) => {
  await exigirSessao(req)
  const { id } = await params
  await exigirObra(id)

  return ok(await faixasDaObra(id))
})

export const POST = rota<Contexto>(async (req, { params }) => {
  // A recusa vem antes de qualquer consulta de negócio: quem não gere alçada não lê obra nenhuma.
  await exigirPermissao(req, 'gerir_alcada')

  const { id } = await params
  const obraId = await exigirObra(id)
  const { limiteCentavos, aprovadores } = await corpoDeFaixa(req, obraId)

  // Faixa e aprovadores numa transação só: uma faixa sem aprovador não produz cadeia, e uma
  // cadeia vazia aprovaria o pedido sem ninguém assinar. Esse estado não pode existir nem entre
  // duas escritas.
  const criada = await prisma.$transaction(async (tx) => {
    const faixa = await tx.faixa.create({
      data: { obraId, limiteCentavos },
      select: { id: true },
    })
    await tx.faixaAprovador.createMany({ data: aprovadoresNaOrdem(faixa.id, aprovadores) })
    return faixa
  })

  return ok(await faixaPublica(criada.id), 201)
})
