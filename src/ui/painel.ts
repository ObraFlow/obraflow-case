/**
 * A chamada do painel da administração e a forma do que ela devolve.
 *
 * Uma chamada só para a tela inteira: os cinco KPIs, os quatro cartões e a fila saem do mesmo
 * conjunto de pedidos, lido num instante só. Ver o comentário de `app/api/pedidos/painel/route.ts`
 * — números de cartões diferentes que se contradizem são pior defeito do que uma espera a mais.
 */

import { pedir } from './api'

/** Um número com o seu par do período anterior. `variacao` nula = período anterior em zero. */
export type Comparado = { valor: number; anterior: number; variacao: number | null }

export type PontoDaSerie = { rotulo: string; porObra: Record<string, number> }

export type Painel = {
  agora: string
  dias: number
  obraId: string | null
  obras: Array<{ id: string; nome: string }>
  kpis: {
    pedidos: Comparado
    valorAprovadoCentavos: Comparado
    tempoMedioEmMs: { valor: number | null; anterior: number | null }
    rejeicao: { rejeitados: number; total: number; comMotivo: number; taxa: number | null }
    parados: { quantidade: number; valorTravadoCentavos: number; criticos: number }
  }
  serie: { obras: Array<{ id: string; nome: string }>; pontos: PontoDaSerie[] }
  porFaixa: Array<{
    chave: string
    rotulo: string
    obraNome: string
    aprovadores: number
    pedidos: number
    valorCentavos: number
    tempoMedioEmMs: number | null
  }>
  porAprovador: Array<{
    usuarioId: string
    nome: string
    decisoes: number
    tempoMedioEmMs: number
    nivelMaximo: number
  }>
  fila: Array<{
    id: number
    obraNome: string
    fornecedorNome: string
    qtdItens: number
    comQuem: string
    nivel: number
    deQuantos: number
    totalCentavos: number
    paradoHaEmMs: number
    critico: boolean
  }>
  comUmaAssinatura: number
  submetidos: number
}

/** Os três períodos do artboard. A rota recusa qualquer outro — não é filtro livre. */
export const PERIODOS = [7, 30, 90] as const
export type Periodo = (typeof PERIODOS)[number]

export function pegarPainel(dias: Periodo, obraId: string | null): Promise<Painel> {
  const query = new URLSearchParams({ dias: String(dias) })
  if (obraId) query.set('obraId', obraId)
  return pedir<Painel>(`/api/pedidos/painel?${query}`)
}
