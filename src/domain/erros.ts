/**
 * Códigos de erro do domínio.
 *
 * Responsabilidade única: ser a lista fechada de motivos pelos quais uma operação do serviço de aprovações
 * pode ser recusada, e o tipo que carrega um desses motivos até a borda.
 *
 * A interface decide o que mostrar pelo código, nunca pela mensagem. Mensagem é texto para
 * humano e muda; código é contrato e não muda.
 */

export const CODIGOS = [
  /** Entrada malformada ou incompleta. Acompanha `campos` quando dá para apontar onde. */
  'VALIDACAO',
  /** O total do pedido não cai em nenhuma faixa da obra. Bloqueia a submissão, não o rascunho. */
  'SEM_REGRA_APLICAVEL',
  /** Quem tentou decidir não é o aprovador da vez — ou a etapa já tinha decisão. */
  'NAO_E_SUA_VEZ',
  /** A cadeia já terminou: aprovada por inteiro ou encerrada por rejeição. */
  'CADEIA_CONCLUIDA',
  /** O recurso não existe, ou não é visível para esta sessão. */
  'NAO_ENCONTRADO',
  /** O papel da sessão não autoriza esta ação. */
  'SEM_PERMISSAO',
  /** O pedido já foi submetido, e cabeçalho e itens são imutáveis a partir daí. */
  'PEDIDO_IMUTAVEL',
] as const

export type Codigo = (typeof CODIGOS)[number]

/** Erros por campo, para a interface ancorar a mensagem no input certo. */
export type CamposComErro = Readonly<Record<string, string>>

export type ErroDominio = {
  readonly codigo: Codigo
  readonly mensagem: string
  readonly campos?: CamposComErro
}

export function erro(codigo: Codigo, mensagem: string, campos?: CamposComErro): ErroDominio {
  return campos ? { codigo, mensagem, campos } : { codigo, mensagem }
}

/**
 * Mapa de código para situação HTTP.
 *
 * Vive aqui, e não nas rotas, porque a correspondência é uma decisão só: espalhada pelos
 * handlers, ela diverge — e a mesma recusa passa a responder 400 numa rota e 409 em outra.
 */
export const SITUACAO_HTTP: Readonly<Record<Codigo, number>> = {
  VALIDACAO: 422,
  SEM_REGRA_APLICAVEL: 422,
  NAO_E_SUA_VEZ: 409,
  CADEIA_CONCLUIDA: 409,
  NAO_ENCONTRADO: 404,
  SEM_PERMISSAO: 403,
  PEDIDO_IMUTAVEL: 409,
}
