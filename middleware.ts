/**
 * Porteiro do modo demonstração para as **telas**.
 *
 * As rotas de API conferem a flag elas mesmas, em `exigirModoDemo()` — e é lá que a conferência
 * precisa estar, porque o teste de rota chama o handler direto, sem passar por aqui. A tela de
 * entrada, porém, é prerrenderizada em casca estática antes de o componente decidir: quando a
 * página chama `notFound()`, a casca já saiu com 200 e só o corpo vira a página de 404. Decidir
 * antes de renderizar é a única forma de a tela responder 404 de verdade.
 *
 * Um flag, dois pontos de imposição — nunca duas respostas diferentes.
 */

import { NextResponse, type NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.rewrite(new URL('/nao-encontrado', req.url), { status: 404 })
  }
  return NextResponse.next()
}

export const config = { matcher: ['/entrar'] }
