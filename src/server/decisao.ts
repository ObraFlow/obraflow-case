/**
 * A escrita de uma decisão.
 *
 * Responsabilidade única: transformar uma decisão já validada pelo domínio numa **única escrita
 * condicionada ao estado que a autoriza** (ADR 0004), e traduzir zero linhas afetadas em 409.
 *
 * O `where` do `updateMany` é o contrato inteiro, e cada condição responde a um caminho de
 * recusa:
 *
 * - `ordem` e `usuarioId` — é esta etapa, e é desta pessoa;
 * - `situacao: 'pendente'` — a etapa ainda não foi decidida (duplo clique, corrida);
 * - `pedido.situacao: 'pendente'` — o pedido não terminou nem foi rejeitado no meio-tempo;
 * - `pedido.etapas.none(ordem < alvo, pendente)` — nenhuma etapa anterior ficou para trás.
 *
 * O que `Decisao.validar` faz antes disso **não** é a garantia: entre a validação e a escrita
 * outra requisição pode decidir a mesma etapa. A validação existe para produzir a mensagem boa
 * no caso comum; a última palavra é a contagem de linhas.
 */

import type { Prisma } from '@prisma/client'

import { prisma } from '@/src/db/prisma'
import {
  Decisao,
  Pedido,
  erro,
  type Ordem,
  type SituacaoDaEtapa,
  type SituacaoDoPedido,
} from '@/src/domain'
import { FalhaDominio, recusar } from './http'
import { COM_ITENS, cadeiaDoBanco, situacaoDe } from './pedido'
import type { Sessao } from './sessao'

export type ResultadoDaDecisao = {
  readonly pedido: { readonly id: number; readonly situacao: SituacaoDoPedido }
  readonly etapa: {
    readonly ordem: number
    readonly situacao: SituacaoDaEtapa
    readonly decididoEm: string
  }
}

const SITUACAO_DA_ETAPA: Readonly<Record<Decisao.TipoDeDecisao, SituacaoDaEtapa>> = {
  aprovar: 'aprovada',
  rejeitar: 'rejeitada',
}

/**
 * Decide uma etapa, ou recusa.
 *
 * Tudo acontece numa transação: a etapa e a situação do pedido mudam juntas ou não mudam. Uma
 * falha no meio volta atrás — não existe pedido aprovado com a etapa ainda pendente, nem o
 * contrário.
 */
export async function decidir(
  pedidoId: number,
  sessao: Sessao,
  decisao: Decisao.Decisao,
): Promise<ResultadoDaDecisao> {
  const agora = new Date()

  return prisma.$transaction(async (tx) => {
    const linha = await tx.pedido.findUnique({ where: { id: pedidoId }, include: COM_ITENS })
    if (!linha) throw new FalhaDominio(erro('NAO_ENCONTRADO', 'Pedido não encontrado.'))

    const situacao = situacaoDe(linha.situacao)

    // Rascunho alheio não existe para quem não o criou — a mesma regra que `pedidoDaSessao`
    // impõe na leitura, pelo mesmo motivo: 403 contaria que ele existe.
    if (Pedido.ehRascunho(situacao) && linha.criadoPorId !== sessao.usuarioId) {
      throw new FalhaDominio(erro('NAO_ENCONTRADO', 'Pedido não encontrado.'))
    }

    // Rascunho próprio não tem cadeia: 409 `CADEIA_CONCLUIDA`, porque o pedido existe e o que
    // falta é a submissão.
    const semCadeia = Pedido.conflitoParaDecidir(situacao)
    if (semCadeia) throw new FalhaDominio(semCadeia)

    const cadeia = cadeiaDoBanco(linha.etapas)

    // Valida para a mensagem: fora de ordem, fora da cadeia e cadeia concluída saem daqui com
    // texto próprio. A recusa definitiva continua sendo a contagem de linhas, abaixo.
    const alvo = Decisao.validar(cadeia, sessao.usuarioId)
    if (!alvo.ok) throw new FalhaDominio(alvo.erro)

    const nova = SITUACAO_DA_ETAPA[decisao.tipo]
    const alterados = await tx.etapa.updateMany({
      where: condicaoQueAutoriza(pedidoId, sessao.usuarioId, alvo.valor.ordem),
      data: {
        situacao: nova,
        decididoEm: agora,
        motivo: decisao.tipo === 'rejeitar' ? decisao.motivo : null,
      },
    })

    // Zero linhas é a premissa caída — não um erro a investigar. Outra requisição decidiu esta
    // etapa entre a validação e a escrita, e quem perdeu a corrida recebe exatamente o 409 que
    // receberia se tivesse chegado depois.
    if (alterados.count === 0) {
      throw new FalhaDominio(
        erro(
          'NAO_E_SUA_VEZ',
          'Esta etapa já foi decidida ou deixou de ser a sua: recarregue o pedido.',
        ),
      )
    }

    const situacaoDoPedido = Decisao.situacaoApos(cadeia, alvo.valor, decisao)

    // Também condicionado: o pedido só sai de `pendente` por esta decisão. Se já tivesse saído,
    // o `updateMany` da etapa acima não teria afetado linha nenhuma.
    await tx.pedido.updateMany({
      where: { id: pedidoId, situacao: 'pendente' },
      data: { situacao: situacaoDoPedido },
    })

    return {
      pedido: { id: pedidoId, situacao: situacaoDoPedido },
      etapa: { ordem: alvo.valor.ordem, situacao: nova, decididoEm: agora.toISOString() },
    }
  })
}

/**
 * O estado que autoriza a escrita, escrito como filtro.
 *
 * Está numa função à parte para ser lido de uma vez: é esta expressão, e não uma checagem em
 * memória, que impede decisão fora de ordem e decisão concorrente.
 */
function condicaoQueAutoriza(
  pedidoId: number,
  usuarioId: string,
  ordem: Ordem,
): Prisma.EtapaWhereInput {
  return {
    pedidoId,
    ordem,
    usuarioId,
    situacao: 'pendente',
    pedido: {
      situacao: 'pendente',
      // Nenhuma etapa anterior pendente. Redundante com a leitura logo acima no caso comum, e é
      // justamente no caso incomum — duas requisições lendo o mesmo estado — que ela vale.
      etapas: { none: { ordem: { lt: ordem }, situacao: 'pendente' } },
    },
  }
}

/** Lê o corpo e devolve a decisão do domínio, ou recusa com 422 ancorado no campo. */
export function decisaoDoCorpo(entrada: {
  tipo: Decisao.TipoDeDecisao
  motivo?: string
}): Decisao.Decisao {
  if (entrada.tipo === 'aprovar') return Decisao.aprovar()

  const rejeicao = Decisao.rejeitar(entrada.motivo ?? '')
  if (!rejeicao.ok) recusar(rejeicao.erro.codigo, rejeicao.erro.mensagem, rejeicao.erro.campos)
  return rejeicao.valor
}
