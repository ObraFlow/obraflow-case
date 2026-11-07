/**
 * Sessão do serviço de aprovações.
 *
 * Responsabilidade única: dizer quem está dentro, a partir do cookie que veio no `Request`, e
 * produzir os cabeçalhos que abrem e encerram essa sessão.
 *
 * A assinatura `lerSessao(req: Request)` é deliberada. O `cookies()` do Next só funciona dentro
 * de uma requisição real do framework: usá-lo aqui tornaria este módulo impossível de exercitar
 * num teste que monta o `Request` à mão — que é exatamente o seam da suíte de rota (extra E2).
 * Nenhum import de `next/*` entra neste diretório.
 *
 * O cookie carrega só o id. O papel é resolvido no banco a cada leitura, porque um papel escrito
 * no cookie seria uma afirmação do cliente: forjar o cookie com outro id faz o servidor responder
 * como aquele outro usuário — com o papel *dele*, lido do banco — e nunca concede poder a mais
 * (ADR 0005).
 */

import { prisma } from '@/src/db/prisma'
import { ehPapel, type Papel } from '@/src/domain'

export const NOME_DO_COOKIE = 'obraflow_sessao'

/** Uma semana. Demonstração não precisa de renovação nem de refresh (fora de escopo). */
const DURACAO_EM_SEGUNDOS = 60 * 60 * 24 * 7

export type Sessao = {
  readonly usuarioId: string
  readonly nome: string
  readonly papel: Papel
}

/**
 * Lê um cookie do header `Cookie` do Request.
 *
 * Feito à mão porque a alternativa — `NextRequest.cookies` — amarraria o módulo ao Next e
 * devolveria o problema que a assinatura com `Request` existe para evitar.
 */
export function lerCookie(req: Request, nome: string): string | null {
  const cabecalho = req.headers.get('cookie')
  if (!cabecalho) return null

  for (const parte of cabecalho.split(';')) {
    const igual = parte.indexOf('=')
    if (igual < 0) continue
    if (parte.slice(0, igual).trim() !== nome) continue
    try {
      return decodeURIComponent(parte.slice(igual + 1).trim())
    } catch {
      // Cookie com percent-encoding quebrado: tratado como ausente, não como erro.
      return null
    }
  }
  return null
}

/**
 * Devolve a sessão ativa, ou `null`.
 *
 * `null` cobre todos os caminhos de ausência — cookie que não veio, cookie vazio, id que não
 * existe mais no banco, papel gravado fora do conjunto fechado. Nenhum deles lança: quem chama
 * decide o que fazer com a ausência, e em rota protegida isso é 403 SEM_PERMISSAO, não 401,
 * porque este case não tem autenticação (ADR 0005).
 */
export async function lerSessao(req: Request): Promise<Sessao | null> {
  const id = lerCookie(req, NOME_DO_COOKIE)
  if (!id) return null

  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, nome: true, papel: true },
  })
  if (!usuario) return null

  // SQLite não tem enum: `papel` é String e esta é a fronteira em que o texto vira domínio.
  // Papel fora do conjunto não é sessão válida — e cai no mesmo 403 da ausência.
  if (!ehPapel(usuario.papel)) return null

  return { usuarioId: usuario.id, nome: usuario.nome, papel: usuario.papel }
}

/** Valor de `Set-Cookie` que abre a sessão. Trocar de usuário é gravar outro id aqui. */
export function cookieDeEntrada(usuarioId: string): string {
  return montar(encodeURIComponent(usuarioId), DURACAO_EM_SEGUNDOS)
}

/** Valor de `Set-Cookie` que encerra a sessão: mesmo nome, vazio, `Max-Age=0`. */
export function cookieDeSaida(): string {
  return montar('', 0)
}

function montar(valor: string, maxAge: number): string {
  const atributos = [
    `${NOME_DO_COOKIE}=${valor}`,
    'Path=/',
    // HttpOnly é o que impede `document.cookie` de ler a identidade: sem ele, um XSS trocaria de
    // usuário sem passar pelo servidor. SameSite=Lax corta o POST vindo de outro site.
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ]
  // Em desenvolvimento o servidor é http://localhost; `Secure` faria o navegador descartar o
  // cookie e a demonstração não funcionaria.
  if (process.env.NODE_ENV === 'production') atributos.push('Secure')
  return atributos.join('; ')
}
