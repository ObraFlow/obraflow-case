/**
 * Tela 3 — Regras da alçada (artboard `Alcadas`).
 *
 * O Server Component faz duas coisas e só elas: decide qual das duas telas mostrar — o painel de
 * faixas ou a explicação de acesso negado — e entrega a lista de usuários que podem virar
 * aprovadores. Tudo o que a tela lê e escreve depois disso passa por Route Handler (ADR 0003).
 *
 * A decisão de papel aqui **não** é o controle de acesso: o controle é o 403 de
 * `POST /api/obras/[id]/faixas` e de `PUT`/`DELETE /api/faixas/[id]`, que vale mesmo para quem
 * chamar a rota sem passar por esta página. Aqui a decisão é só sobre o que desenhar.
 */

import { Suspense } from 'react'

import { prisma } from '@/src/db/prisma'
import { ehPapel } from '@/src/domain'
import { pode } from '@/src/server/permissao'
import { AcessoNegado } from '@/src/ui/componentes/AcessoNegado'
import { RegrasDaAlcada } from '@/src/ui/componentes/RegrasDaAlcada'
import { ORDEM_DO_PAPEL } from '@/src/ui/componentes/rotulos'
import { sessaoAtual } from '@/src/ui/sessao-no-servidor'
import type { UsuarioPublico } from '@/src/ui/tipos'

// Página por sessão: o conteúdo depende do cookie e não há casca estática a validar.
export const instant = false

export const metadata = { title: 'Regras da alçada · ObraFlow' }

export default async function Alcadas() {
  const sessao = await sessaoAtual()

  if (!pode(sessao?.papel, 'gerir_alcada')) {
    return <AcessoNegado papel={sessao?.papel ?? null} />
  }

  // Qualquer usuário pode figurar como aprovador de uma faixa: ser aprovador num pedido é
  // consequência de estar na faixa, não um pré-requisito dela (GLOSSARY, verbete Usuário).
  const linhas = await prisma.usuario.findMany({ select: { id: true, nome: true, papel: true } })

  const usuarios: UsuarioPublico[] = linhas
    .filter((u): u is typeof u & { papel: UsuarioPublico['papel'] } => ehPapel(u.papel))
    .sort(
      (a, b) =>
        ORDEM_DO_PAPEL[a.papel] - ORDEM_DO_PAPEL[b.papel] || a.nome.localeCompare(b.nome, 'pt-BR'),
    )

  // `useSearchParams` lê dado de requisição: sem a fronteira, a casca da página deixaria de ser
  // prerrenderizável (Cache Components do Next 16).
  return (
    <Suspense>
      <RegrasDaAlcada usuarios={usuarios} />
    </Suspense>
  )
}
