/**
 * O detalhe de um pedido — artboards `AprovacoesC` e `PedidoDetalhe`.
 *
 * A casca resolve a sessão; o pedido inteiro vem da rota, no cliente, porque é a mesma leitura
 * que a decisão precisa refazer depois de aprovar ou rejeitar. Ler o pedido aqui e passá-lo
 * adiante obrigaria a recarregar a página a cada decisão — e o critério pede justamente o
 * contrário.
 *
 * `podePapelDecidir` sai da matriz da Sprint 3, o mesmo lugar que a rota consulta. Vai para a
 * tela como **rótulo**, não como controle: quem chamar `POST /api/pedidos/[id]/decisoes` sem
 * passar por aqui recebe o mesmo 403.
 *
 * `params` é `Promise` nesta versão do Next e precisa de `await`.
 */

import { notFound, redirect } from 'next/navigation'

import { pode } from '@/src/server/permissao'
import { DetalheDoPedido } from '@/src/ui/componentes/DetalheDoPedido'
import { sessaoAtual } from '@/src/ui/sessao-no-servidor'

// Página por sessão: o conteúdo depende do cookie e não há casca estática a validar.
export const instant = false

export const metadata = { title: 'Pedido · ObraFlow' }

export default async function Pedido({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await sessaoAtual()
  if (!sessao) redirect('/entrar')

  const { id } = await params
  // Segmento que não é inteiro é pedido que não existe, como em `idDoCaminho` da borda: a mesma
  // pergunta não pode ter duas respostas conforme o palpite.
  if (!/^\d+$/.test(id)) notFound()

  return (
    <DetalheDoPedido
      pedidoId={Number(id)}
      sessao={{ id: sessao.usuarioId, nome: sessao.nome, papel: sessao.papel }}
      podePapelDecidir={pode(sessao.papel, 'decidir')}
    />
  )
}
