/**
 * A contagem de pedidos por situação — o que o painel da administração desenha.
 *
 * Uma consulta agregada, e não a lista paginada contada na tela: contar no cliente contaria só a
 * página carregada, e o número exibido passaria a depender de `perPage`.
 *
 * O ponto delicado desta rota é o **rascunho**. A regra de visibilidade do projeto é que ele é
 * privado de quem o criou (`GET /api/pedidos`), e ela vale igual na agregação: um rascunho alheio
 * não entra na contagem de ninguém — nem somado, nem para o admin. Agregação não é uma visão
 * privilegiada dos mesmos dados; é a mesma visão, contada.
 */

import { prisma } from '@/src/db/prisma'
import type { Prisma } from '@prisma/client'

import { exigirPermissao, ok, recusar, rota } from '@/src/server/http'
import { Schemas, SITUACOES_DO_PEDIDO, type SituacaoDoPedido } from '@/src/domain'

/** O filtro da lista sem a paginação: só a obra, que é a única query desta rota. */
const apenasObra = Schemas.filtroDePedidosSchema.pick({ obraId: true })

/** Zero em toda situação: é o que o painel recebe quando não há pedido visível nenhum. */
function nenhum(): Record<SituacaoDoPedido, number> {
  return Object.fromEntries(SITUACOES_DO_PEDIDO.map((s) => [s, 0])) as Record<
    SituacaoDoPedido,
    number
  >
}

/**
 * O mesmo `OR` da lista, pelo mesmo motivo: duas famílias de pedido com visibilidades
 * diferentes. Está escrito aqui, e não importado de `app/api/pedidos/route.ts`, porque arquivo
 * de rota exporta manipulador — não é lugar de onde outra rota puxa regra.
 */
function oQueEstaSessaoConta(obraId: string | undefined, usuarioId: string): Prisma.PedidoWhereInput {
  return {
    OR: [
      { situacao: { in: SITUACOES_DO_PEDIDO.filter((s) => s !== 'rascunho') } },
      { situacao: 'rascunho', criadoPorId: usuarioId },
    ],
    ...(obraId ? { obraId } : {}),
  }
}

export const GET = rota(async (req) => {
  // `ver_resumo` é só do admin na matriz. A recusa vem antes de qualquer consulta: quem não pode
  // não toca no banco, e o 403 não depende de existir pedido algum.
  const sessao = await exigirPermissao(req, 'ver_resumo')

  // A `obraId` é validada pelo **mesmo** schema da lista, recortado: mesmo formato de id, mesma
  // mensagem, mesmo 422 com `fields`. Um segundo validador aqui faria as duas rotas discordarem
  // do mesmo texto. O recorte existe porque esta rota não pagina — `page` e `perPage` não são
  // parâmetros dela, e herdá-los obrigaria o cliente a mandar o que a rota ignora.
  const analise = Schemas.validarCom(apenasObra, {
    obraId: new URL(req.url).searchParams.get('obraId') ?? undefined,
  })
  if (!analise.ok) recusar(analise.erro.codigo, analise.erro.mensagem, analise.erro.campos)

  const grupos = await prisma.pedido.groupBy({
    by: ['situacao'],
    where: oQueEstaSessaoConta(analise.valor.obraId, sessao.usuarioId),
    _count: { _all: true },
  })

  // As quatro chaves saem sempre, inclusive em zero: o contrato é um objeto de forma fixa, e uma
  // chave ausente obrigaria a tela a distinguir "nenhum" de "não sei".
  const porSituacao = nenhum()
  for (const grupo of grupos) {
    if ((SITUACOES_DO_PEDIDO as readonly string[]).includes(grupo.situacao)) {
      porSituacao[grupo.situacao as SituacaoDoPedido] = grupo._count._all
    }
  }

  return ok({ porSituacao })
})
