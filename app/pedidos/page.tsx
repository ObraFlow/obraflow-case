/**
 * Tela 2 — a lista de aprovação (artboard `Aprovacoes`).
 *
 * O Server Component faz duas coisas e só elas: resolve a sessão e entrega a lista de obras do
 * filtro. Os pedidos **não** vêm daqui: eles vêm de `GET /api/pedidos`, no cliente, porque a
 * lista tem filtros, paginação e os três estados que a SPEC exige — e porque é a mesma rota que
 * um `curl` chama (ADR 0003).
 *
 * As obras chegam com a página pelo mesmo motivo da tela 1: não existe `GET /api/obras` em
 * sprint nenhuma, e inventá-la aqui seria antecipar contrato que a SPEC não descreve. É dado
 * real lido do banco — o que a sprint proíbe é a tela fingir ter servidor.
 *
 * A lista de rascunhos que a Sprint 5 desenhou nesta página sumiu: ela virou a aba
 * **Meus rascunhos**, servida pela mesma rota, com a mesma garantia de privacidade — o `where`
 * do servidor, e não um filtro da tela.
 */

import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { prisma } from '@/src/db/prisma'
import { pode } from '@/src/server/permissao'
import { ListaDePedidos } from '@/src/ui/componentes/ListaDePedidos'
import { sessaoAtual } from '@/src/ui/sessao-no-servidor'

// Página por sessão: o conteúdo depende do cookie e não há casca estática a validar.
export const instant = false

export const metadata = { title: 'Pedidos · ObraFlow' }

export default async function Pedidos() {
  const sessao = await sessaoAtual()
  if (!sessao) redirect('/entrar')

  const obras = await prisma.obra.findMany({
    select: { id: true, nome: true, cidade: true },
    orderBy: { nome: 'asc' },
  })

  // `useSearchParams` lê dado de requisição: sem a fronteira, a casca da página deixaria de ser
  // prerrenderizável (Cache Components do Next 16).
  return (
    <Suspense>
      <ListaDePedidos
        sessao={{ id: sessao.usuarioId, nome: sessao.nome, papel: sessao.papel }}
        decide={pode(sessao.papel, 'decidir')}
        podeCriar={pode(sessao.papel, 'criar_pedido')}
        obras={obras}
      />
    </Suspense>
  )
}
