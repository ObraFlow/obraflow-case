/**
 * Tela 9 — Empresa (artboard `Empresa`): o cadastro de obras e de fornecedores.
 *
 * O Server Component decide o que desenhar — a tela ou a explicação de acesso negado — e lê as
 * duas listas, com as contagens que as colunas mostram. Toda escrita passa por Route Handler
 * (`POST /api/obras`, `POST /api/fornecedores`, ADR 0003), e o 403 dessas rotas é o controle de
 * acesso de verdade; a decisão de papel aqui é só sobre o que desenhar.
 *
 * A aba Usuários do artboard não entra: usuário continua vindo do seed, e a entrada sem senha é a
 * do modo demonstração (ADR 0005).
 */

import { Suspense } from 'react'

import { prisma } from '@/src/db/prisma'
import { pode } from '@/src/server/permissao'
import { AcessoNegado } from '@/src/ui/componentes/AcessoNegado'
import { Empresa } from '@/src/ui/componentes/Empresa'
import { sessaoAtual } from '@/src/ui/sessao-no-servidor'

// Página por sessão: o conteúdo depende do cookie e não há casca estática a validar.
export const instant = false

export const metadata = { title: 'Empresa · ObraFlow' }

export default async function PaginaDaEmpresa() {
  const sessao = await sessaoAtual()

  if (!pode(sessao?.papel, 'gerir_cadastros')) {
    return <AcessoNegado papel={sessao?.papel ?? null} acao="gerir_cadastros" />
  }

  const [obras, fornecedores] = await Promise.all([
    prisma.obra.findMany({
      select: {
        id: true,
        nome: true,
        cidade: true,
        _count: { select: { faixas: true, pedidos: { where: { situacao: { not: 'rascunho' } } } } },
      },
      orderBy: { nome: 'asc' },
    }),
    prisma.fornecedor.findMany({
      select: {
        id: true,
        nome: true,
        documento: true,
        _count: { select: { pedidos: { where: { situacao: { not: 'rascunho' } } } } },
      },
      orderBy: { nome: 'asc' },
    }),
  ])

  // `useSearchParams` lê a aba da URL: sem a fronteira, a casca deixaria de ser prerrenderizável.
  return (
    <Suspense>
      <Empresa
        obras={obras.map((o) => ({
          id: o.id,
          nome: o.nome,
          cidade: o.cidade,
          faixas: o._count.faixas,
          pedidos: o._count.pedidos,
        }))}
        fornecedores={fornecedores.map((f) => ({
          id: f.id,
          nome: f.nome,
          documento: f.documento,
          pedidos: f._count.pedidos,
        }))}
      />
    </Suspense>
  )
}
