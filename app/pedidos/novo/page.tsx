/**
 * Tela 1 — Cadastro de pedido (artboard `Main`).
 *
 * O Server Component faz três coisas e só elas: decide entre a tela e a explicação de acesso
 * negado, entrega as listas de obras e fornecedores, e passa adiante o rascunho a retomar. Tudo
 * o que a tela escreve depois disso passa por Route Handler (ADR 0003).
 *
 * A decisão de papel aqui **não** é o controle de acesso: o controle é o 403 de
 * `POST /api/pedidos`, que vale para quem chamar a rota sem passar por esta página. Aqui a
 * decisão é só sobre o que desenhar.
 *
 * As listas chegam com a página, e não por `fetch`: não existe `GET /api/obras` nem
 * `GET /api/fornecedores` em sprint nenhuma, e inventar uma rota para que a tela buscasse o que
 * o servidor já tem em mãos seria custo sem contrapartida. É dado real lido do banco — o que a
 * sprint proíbe é a tela fingir ter servidor, não o servidor renderizar.
 */

import { Suspense } from 'react'

import { prisma } from '@/src/db/prisma'
import { pode } from '@/src/server/permissao'
import { AcessoNegado } from '@/src/ui/componentes/AcessoNegado'
import { FormularioDePedido } from '@/src/ui/componentes/FormularioDePedido'
import { sessaoAtual } from '@/src/ui/sessao-no-servidor'

// Página por sessão: o conteúdo depende do cookie e não há casca estática a validar.
export const instant = false

export const metadata = { title: 'Novo pedido · ObraFlow' }

type Props = { searchParams: Promise<{ rascunho?: string | string[] }> }

export default async function NovoPedido({ searchParams }: Props) {
  const sessao = await sessaoAtual()

  if (!pode(sessao?.papel, 'criar_pedido')) {
    return <AcessoNegado papel={sessao?.papel ?? null} acao="criar_pedido" />
  }

  const [obras, fornecedores] = await Promise.all([
    prisma.obra.findMany({ select: { id: true, nome: true, cidade: true }, orderBy: { nome: 'asc' } }),
    prisma.fornecedor.findMany({
      select: { id: true, nome: true, documento: true },
      orderBy: { nome: 'asc' },
    }),
  ])

  const bruto = (await searchParams).rascunho
  const texto = Array.isArray(bruto) ? bruto[0] : bruto
  // Parâmetro que não é um número de pedido é tratado como ausente: a tela abre um pedido novo,
  // e não um erro. Quem inventar um número que não é seu recebe 404 da rota, que é onde a
  // privacidade do rascunho é imposta.
  const rascunhoId = texto && /^\d+$/.test(texto) ? Number(texto) : null

  return (
    <Suspense>
      <FormularioDePedido obras={obras} fornecedores={fornecedores} rascunhoId={rascunhoId} />
    </Suspense>
  )
}
