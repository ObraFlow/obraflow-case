/**
 * A política de decisão: quem pode decidir, quando, e o que cada decisão provoca.
 *
 * Responsabilidade única: validar uma decisão contra o estado da cadeia e dizer qual situação o
 * pedido assume em seguida.
 *
 * Este módulo valida; ele não escreve. A garantia contra corrida não está aqui e não pode estar:
 * entre esta validação e a escrita, outra requisição pode decidir a mesma etapa. A imposição
 * final é o UPDATE condicional do ADR 0004 — uma escrita condicionada ao estado que a autoriza,
 * em que zero linhas afetadas vira 409. Esta validação existe para produzir mensagem boa no caso
 * comum, não para ser a última palavra.
 */

import * as Cadeia from './cadeia'
import type { Cadeia as TipoCadeia, Etapa } from './cadeia'
import type { Resultado, SituacaoDoPedido } from './tipos'
import { falha, sucesso } from './tipos'
import { erro, type ErroDominio } from './erros'

export type TipoDeDecisao = 'aprovar' | 'rejeitar'

export type Decisao =
  | { readonly tipo: 'aprovar' }
  | { readonly tipo: 'rejeitar'; readonly motivo: string }

export const MOTIVO_MINIMO = 3

/**
 * Teto do motivo da rejeição, declarado no contrato de `POST /api/pedidos/{id}/decisoes`.
 *
 * Vive aqui porque é regra do motivo, não do transporte: o mesmo número é cobrado pelo schema
 * que a rota roda e pelo contador de caracteres que o diálogo mostra enquanto a pessoa escreve.
 */
export const MOTIVO_MAXIMO = 500

export function aprovar(): Decisao {
  return { tipo: 'aprovar' }
}

/**
 * Rejeição exige motivo. Não é formalidade: a rejeição encerra o pedido inteiro, e quem o
 * recebeu de volta precisa saber o que corrigir. Um campo vazio transformaria a trilha auditável
 * num registro de que algo deu errado, sem dizer o quê.
 */
export function rejeitar(motivo: string): Resultado<Decisao, ErroDominio> {
  const limpo = motivo.trim()
  if (limpo.length < MOTIVO_MINIMO) {
    return falha(
      erro('VALIDACAO', 'Informe o motivo da rejeição.', { motivo: 'Obrigatório ao rejeitar.' }),
    )
  }
  if (limpo.length > MOTIVO_MAXIMO) {
    return falha(
      erro('VALIDACAO', 'O motivo é longo demais.', {
        motivo: `O motivo não pode passar de ${MOTIVO_MAXIMO} caracteres.`,
      }),
    )
  }
  return sucesso({ tipo: 'rejeitar', motivo: limpo })
}

/**
 * Diz se este usuário é o aprovador da vez.
 *
 * Decisão fora de ordem, segunda decisão na mesma etapa e decisão por quem não está na cadeia são
 * o mesmo caso visto de ângulos diferentes: em todos, a etapa que este usuário poderia decidir
 * não é a primeira pendente.
 */
export function podeDecidir(cadeia: TipoCadeia, usuarioId: string): boolean {
  const vez = Cadeia.aprovadorDaVez(cadeia)
  return vez !== null && vez.usuarioId === usuarioId
}

/**
 * Valida a decisão e devolve a etapa que ela atinge.
 *
 * A etapa devolvida é o alvo do UPDATE condicional: quem chama usa `ordem` para condicionar a
 * escrita, em vez de reler o pedido.
 */
export function validar(
  cadeia: TipoCadeia,
  usuarioId: string,
): Resultado<Etapa, ErroDominio> {
  if (cadeia.length === 0) {
    return falha(erro('NAO_ENCONTRADO', 'Este pedido não tem cadeia de aprovação.'))
  }

  if (Cadeia.estaConcluida(cadeia)) {
    const mensagem = Cadeia.foiRejeitada(cadeia)
      ? 'Este pedido já foi rejeitado e não aceita novas decisões.'
      : 'Este pedido já percorreu toda a cadeia de aprovação.'
    return falha(erro('CADEIA_CONCLUIDA', mensagem))
  }

  const vez = Cadeia.aprovadorDaVez(cadeia)

  if (vez === null) {
    return falha(erro('CADEIA_CONCLUIDA', 'Não há etapa pendente neste pedido.'))
  }

  if (vez.usuarioId !== usuarioId) {
    const estaNaCadeia = cadeia.some((etapa) => etapa.usuarioId === usuarioId)
    return falha(
      erro(
        'NAO_E_SUA_VEZ',
        estaNaCadeia
          ? 'Ainda não é a sua vez: outra etapa da cadeia está em decisão.'
          : 'Você não faz parte da cadeia de aprovação deste pedido.',
      ),
    )
  }

  return sucesso(vez)
}

/**
 * A situação que o pedido assume depois desta decisão.
 *
 * Rejeição encerra o pedido inteiro; aprovação avança para a etapa seguinte, e só a aprovação da
 * última etapa aprova o pedido.
 */
export function situacaoApos(
  cadeia: TipoCadeia,
  etapaDecidida: Etapa,
  decisao: Decisao,
): SituacaoDoPedido {
  if (decisao.tipo === 'rejeitar') return 'rejeitado'

  const restantes = cadeia.filter(
    (etapa) => etapa.ordem !== etapaDecidida.ordem && etapa.situacao === 'pendente',
  )

  return restantes.length === 0 ? 'aprovado' : 'pendente'
}
