/**
 * As chamadas da tela de cadastro de pedido.
 *
 * O corpo do rascunho e o do `PUT` são o mesmo objeto, e os valores viajam como **texto** —
 * "42,90", "2,5" —, que é o que a pessoa digitou. O servidor os lê com o parser do domínio, o
 * mesmo que a tela usa para validar antes de enviar: um segundo parser aqui faria a tela e a
 * rota discordarem sobre o mesmo texto.
 *
 * `totalCentavos` não aparece em nenhum corpo. Ele é sempre a soma dos totais dos itens,
 * calculada pelo servidor — mandá-lo seria afirmar um número que o servidor ignora.
 */

import { corpoJson, pedir } from './api'
import type {
  DecisaoPublica,
  PaginaDePedidos,
  PedidoPublico,
  ResumoDePedidos,
  SubmissaoPublica,
} from './tipos'
import type { SituacaoDoPedido } from '@/src/domain'

/** Um item como o formulário o envia: texto cru, porque é o que foi digitado. */
export type ItemDoCorpo = {
  descricao?: string
  quantidade?: string
  unidade?: string
  precoUnitario?: string
}

export type CorpoDePedido = {
  obraId?: string
  fornecedorId?: string
  /** "AAAA-MM-DD": a data de emissão que quem compra declara. */
  dataPedido?: string
  observacoes?: string
  itens: ItemDoCorpo[]
}

export function criarRascunho(corpo: CorpoDePedido): Promise<PedidoPublico> {
  return pedir<PedidoPublico>('/api/pedidos', { method: 'POST', ...corpoJson(corpo) })
}

/** Substitui o rascunho inteiro — cabeçalho e itens. Campo ausente é campo em branco. */
export function salvarRascunho(id: number, corpo: CorpoDePedido): Promise<PedidoPublico> {
  return pedir<PedidoPublico>(`/api/pedidos/${id}`, { method: 'PUT', ...corpoJson(corpo) })
}

export function pegarPedido(id: number): Promise<PedidoPublico> {
  return pedir<PedidoPublico>(`/api/pedidos/${id}`)
}

export function apagarRascunho(id: number): Promise<{ removido: boolean }> {
  return pedir(`/api/pedidos/${id}`, { method: 'DELETE' })
}

/**
 * Submete. Não leva corpo: o que o servidor valida é o rascunho gravado, e é por isso que a tela
 * salva antes de submeter. A data do pedido vai no rascunho; o servidor carimba só `submetidoEm`.
 */
export function submeterPedido(id: number): Promise<SubmissaoPublica> {
  return pedir<SubmissaoPublica>(`/api/pedidos/${id}/submissao`, { method: 'POST' })
}

// --- lista e decisão (Sprint 6) ----------------------------------------------------------------

/**
 * A lista de pedidos, com os filtros da rota.
 *
 * `situacao` é repetível e vai como vários parâmetros com o mesmo nome — é o que o contrato
 * declara, e é o que permite "pendentes e aprovados" numa chamada só. A tela nunca pede
 * `situacao=rascunho` em nome de outra pessoa: o servidor devolve só os de quem está dentro, e
 * essa é a garantia, não o cuidado da tela.
 */
export function listarPedidos(filtros: {
  situacao?: readonly SituacaoDoPedido[]
  obraId?: string
  page?: number
  perPage?: number
}): Promise<PaginaDePedidos> {
  const busca = new URLSearchParams()
  for (const situacao of filtros.situacao ?? []) busca.append('situacao', situacao)
  if (filtros.obraId) busca.set('obraId', filtros.obraId)
  if (filtros.page) busca.set('page', String(filtros.page))
  if (filtros.perPage) busca.set('perPage', String(filtros.perPage))

  const query = busca.toString()
  return pedir<PaginaDePedidos>(`/api/pedidos${query ? `?${query}` : ''}`)
}

/**
 * Aprova ou rejeita a etapa da vez.
 *
 * O 409 que esta chamada pode receber não é defeito da tela: é o `UPDATE` condicional do
 * ADR 0004 dizendo que a premissa caiu entre a renderização e o clique. Quem chama trata a
 * `FalhaDaApi` mostrando a explicação e recarregando o pedido.
 */
export function decidirPedido(
  id: number,
  decisao: { tipo: 'aprovar' } | { tipo: 'rejeitar'; motivo: string },
): Promise<DecisaoPublica> {
  return pedir<DecisaoPublica>(`/api/pedidos/${id}/decisoes`, {
    method: 'POST',
    ...corpoJson(decisao),
  })
}

/**
 * A contagem por situação do painel da administração. Exige o papel que vê o resumo.
 *
 * `obraId` ausente é "todas as obras" — não é obra nenhuma, e por isso o parâmetro some da query
 * em vez de viajar vazio.
 */
export function pegarResumo(obraId?: string): Promise<ResumoDePedidos> {
  const query = obraId ? `?obraId=${encodeURIComponent(obraId)}` : ''
  return pedir<ResumoDePedidos>(`/api/pedidos/resumo${query}`)
}
