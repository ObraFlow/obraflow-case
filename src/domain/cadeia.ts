/**
 * A cadeia de aprovação: montagem na submissão e leitura do estado.
 *
 * Responsabilidade única: derivar a sequência de etapas a partir de uma faixa, e responder
 * perguntas sobre uma cadeia já gravada.
 *
 * A cadeia é um **snapshot**, não uma derivação contínua (ADR 0001). Nenhuma função daqui
 * recebe a alçada da obra: dar a este módulo acesso à regra vigente abriria a porta para
 * recalcular a cadeia a cada leitura, que é exatamente o que o ADR proíbe. Editar a alçada de
 * uma obra não altera pedidos em andamento, e um pedido submetido sob regra antiga continua
 * exibindo a cadeia antiga — isso é correto, não defeito.
 */

import type { Faixa } from './alcada'
import type { Ordem, SituacaoDaEtapa } from './tipos'

export type Etapa = {
  readonly ordem: Ordem
  readonly usuarioId: string
  readonly situacao: SituacaoDaEtapa
  readonly decididoEm: Date | null
  readonly motivo: string | null
}

export type Cadeia = readonly Etapa[]

/**
 * Monta a cadeia a partir da faixa resolvida, preservando a ordem dos aprovadores.
 *
 * Roda uma única vez, na submissão, e não quando o rascunho é criado: um rascunho tem total
 * provisório, e resolver a faixa ali gravaria uma cadeia derivada de um valor que ainda vai
 * mudar.
 */
export function montarCadeia(faixa: Faixa): Cadeia {
  return [...faixa.aprovadores]
    .sort((a, b) => a.ordem - b.ordem)
    .map((aprovador, indice) => ({
      ordem: indice as Ordem,
      usuarioId: aprovador.usuarioId,
      situacao: 'pendente' as SituacaoDaEtapa,
      decididoEm: null,
      motivo: null,
    }))
}

export function etapasEmOrdem(cadeia: Cadeia): Cadeia {
  return [...cadeia].sort((a, b) => a.ordem - b.ordem)
}

/**
 * O aprovador da vez é o usuário da primeira etapa ainda sem decisão. É o único que pode decidir;
 * qualquer outro é recusado pelo servidor.
 *
 * Devolve `null` quando a cadeia terminou — por aprovação de todas as etapas ou por rejeição.
 */
export function aprovadorDaVez(cadeia: Cadeia): Etapa | null {
  if (foiRejeitada(cadeia)) return null
  return etapasEmOrdem(cadeia).find((etapa) => etapa.situacao === 'pendente') ?? null
}

/** Rejeição encerra o pedido inteiro: uma etapa rejeitada basta. */
export function foiRejeitada(cadeia: Cadeia): boolean {
  return cadeia.some((etapa) => etapa.situacao === 'rejeitada')
}

export function foiAprovada(cadeia: Cadeia): boolean {
  return cadeia.length > 0 && cadeia.every((etapa) => etapa.situacao === 'aprovada')
}

export function estaConcluida(cadeia: Cadeia): boolean {
  return foiRejeitada(cadeia) || foiAprovada(cadeia)
}

/** Etapas já decididas, na ordem em que foram decididas. É o histórico que a tela mostra. */
export function historico(cadeia: Cadeia): Cadeia {
  return etapasEmOrdem(cadeia).filter((etapa) => etapa.situacao !== 'pendente')
}
