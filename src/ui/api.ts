/**
 * A chamada de API da interface, num lugar só.
 *
 * Responsabilidade única: fazer a requisição e desembrulhar o envelope de erro do serviço de aprovações —
 * `{ error: { code, message, fields? } }` —, que é o mesmo em toda recusa, de toda rota. Por ser
 * o mesmo, a leitura cabe numa função; espalhada por tela, ela divergiria na primeira rota nova.
 *
 * `FalhaDaApi` carrega o envelope inteiro, e não só a mensagem: é `fields` que permite ao
 * formulário ancorar o erro no input certo — em `itens.2.quantidade`, e não no topo da tela.
 *
 * Nasceu em `alcadas.ts`, na Sprint 4; a Sprint 5 precisou das mesmas quatro linhas e elas
 * subiram para cá em vez de serem copiadas.
 */

import type { CamposComErro } from '@/src/domain'

export class FalhaDaApi extends Error {
  readonly codigo: string
  readonly campos: CamposComErro

  constructor(codigo: string, mensagem: string, campos: CamposComErro = {}) {
    super(mensagem)
    this.name = 'FalhaDaApi'
    this.codigo = codigo
    this.campos = campos
  }
}

const ERRO_DE_REDE = 'Não foi possível falar com o servidor.'

/**
 * Faz a chamada e devolve o corpo, ou lança `FalhaDaApi`.
 *
 * Resposta de erro sem envelope — um 502 de proxy, por exemplo — vira uma falha com o código da
 * situação, porque a tela precisa de *algum* código para decidir o que mostrar.
 */
export async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  let resposta: Response
  try {
    resposta = await fetch(url, init)
  } catch {
    throw new FalhaDaApi('SEM_RESPOSTA', ERRO_DE_REDE)
  }

  const corpo: unknown = await resposta.json().catch(() => null)

  if (!resposta.ok) {
    const erro = (corpo as { error?: { code?: string; message?: string; fields?: CamposComErro } })
      ?.error
    throw new FalhaDaApi(
      erro?.code ?? String(resposta.status),
      erro?.message ?? 'O servidor recusou a operação.',
      erro?.fields ?? {},
    )
  }

  return corpo as T
}

/** O corpo JSON de uma escrita, com o cabeçalho que toda rota do serviço de aprovações espera. */
export function corpoJson(dados: unknown): RequestInit {
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) }
}
