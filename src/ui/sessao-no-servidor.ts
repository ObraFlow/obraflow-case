/**
 * Ponte entre o contexto de requisição do Next e `lerSessao(req)`.
 *
 * Existe porque um Server Component não recebe `Request`: o que ele tem é `cookies()`. Em vez de
 * dar a `src/server/sessao.ts` uma segunda forma de ler a sessão — que divergiria da primeira —,
 * este módulo monta um `Request` com o header `Cookie` e chama a mesma função que a rota chama.
 *
 * O import de `next/headers` fica aqui, na camada de interface, e **não** em `src/server/`: lá
 * ele tornaria o módulo inchamável fora de uma requisição real do Next, que é justamente o que a
 * assinatura com `Request` existe para evitar.
 */

import { cookies } from 'next/headers'

import { permissoesDe } from '@/src/server/permissao'
import { lerSessao, type Sessao } from '@/src/server/sessao'
import type { Acao } from '@/src/server/permissao'

export async function sessaoAtual(): Promise<Sessao | null> {
  const armazem = await cookies()
  const cabecalho = armazem
    .getAll()
    .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
    .join('; ')

  return lerSessao(new Request('http://local/', { headers: { cookie: cabecalho } }))
}

export async function permissoesAtuais(): Promise<Record<Acao, boolean>> {
  const sessao = await sessaoAtual()
  return permissoesDe(sessao?.papel)
}
