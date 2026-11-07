/**
 * As chamadas da tela de regras da alçada, num lugar só.
 *
 * Nenhuma delas toca estado de React: quem chama decide o que fazer com o sucesso e com a falha.
 * A recusa chega como `FalhaDaApi`, que carrega o envelope inteiro — código, mensagem e, quando
 * o servidor soube dizer onde, os campos. É o que permite ao formulário ancorar a mensagem no
 * input em vez de despejá-la no topo da tela.
 */

import type { FaixaPublica, ObraPublica } from './tipos'
import { pedir } from './api'

export { FalhaDaApi } from './api'

/** O corpo que cria e o que substitui são o mesmo: limite e lista ordenada de aprovadores. */
export type CorpoDeFaixa = {
  /** Texto do formulário; vazio é a faixa sem teto. O servidor interpreta com o mesmo parser. */
  limiteCentavos: string | null
  aprovadores: string[]
}

/** As obras e quantas faixas cada uma tem. Exige o papel que gere alçada. */
export function pegarObras(): Promise<ObraPublica[]> {
  return pedir<ObraPublica[]>('/api/alcada')
}

export function pegarFaixas(obraId: string): Promise<FaixaPublica[]> {
  return pedir<FaixaPublica[]>(`/api/obras/${encodeURIComponent(obraId)}/faixas`)
}

export function criarFaixa(obraId: string, corpo: CorpoDeFaixa): Promise<FaixaPublica> {
  return pedir<FaixaPublica>(`/api/obras/${encodeURIComponent(obraId)}/faixas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
}

/** Substitui a faixa inteira — limite e ordem — de uma vez. Não há rota de reordenação. */
export function salvarFaixa(faixaId: string, corpo: CorpoDeFaixa): Promise<FaixaPublica> {
  return pedir<FaixaPublica>(`/api/faixas/${encodeURIComponent(faixaId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
}

export function removerFaixa(
  faixaId: string,
): Promise<{ removida: boolean; pedidosAfetados: number }> {
  return pedir(`/api/faixas/${encodeURIComponent(faixaId)}`, { method: 'DELETE' })
}
