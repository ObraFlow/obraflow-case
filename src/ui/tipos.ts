import type { Papel, SituacaoDaEtapa, SituacaoDoPedido } from '@/src/domain'

/** O que a borda devolve de um usuário. Nada além disso atravessa: sem e-mail, sem datas. */
export type UsuarioPublico = { id: string; nome: string; papel: Papel }

/** Uma obra como o painel da alçada a lê, com quantas faixas ela já tem. */
export type ObraPublica = { id: string; nome: string; cidade: string; faixas: number }

/** Um aprovador dentro de uma faixa. `ordem` é a posição na cadeia, começando em 0. */
export type AprovadorPublico = { usuarioId: string; nome: string; ordem: number }

/** Uma faixa como a borda a devolve. `semTeto` e o intervalo são derivados, nunca gravados. */
export type FaixaPublica = {
  id: string
  limiteCentavos: number | null
  semTeto: boolean
  aprovadores: AprovadorPublico[]
  pedidosEmAndamento: number
}

/** Uma obra como o formulário de pedido a lê. */
export type ObraDoPedido = { id: string; nome: string; cidade: string }

/** Um fornecedor como o formulário de pedido o lê. */
export type FornecedorPublico = { id: string; nome: string; documento: string | null }

/** Um item do pedido como a borda o devolve. `totalCentavos` é sempre do servidor. */
export type ItemPublico = {
  id: string
  descricao: string
  quantidadeMilesimos: number
  unidade: string
  /** `null` só no rascunho, enquanto o preço não foi informado. */
  precoUnitarioCentavos: number | null
  totalCentavos: number
  ordem: number
}

/**
 * Uma etapa da cadeia, como a borda a devolve.
 *
 * Vem das `Etapa` gravadas e nunca da alçada vigente (ADR 0001): é por isso que a tela não
 * precisa — nem pode — conhecer as faixas da obra para desenhar a cadeia.
 */
export type EtapaPublica = {
  ordem: number
  usuarioId: string
  nome: string
  situacao: SituacaoDaEtapa
  decididoEm: string | null
  motivo: string | null
}

/** Um pedido como a borda o devolve. */
export type PedidoPublico = {
  id: number
  obraId: string | null
  fornecedorId: string | null
  observacoes: string | null
  criadoPorId: string
  situacao: SituacaoDoPedido
  totalCentavos: number
  dataPedido: string | null
  submetidoEm: string | null
  faixa: { limiteCentavos: number | null; semTeto: boolean } | null
  itens: ItemPublico[]
  obra: ObraDoPedido | null
  fornecedor: FornecedorPublico | null
  criadoPor: { id: string; nome: string }
  cadeia: EtapaPublica[]
  historico: EtapaPublica[]
  etapaAtual: EtapaPublica | null
  podeDecidir: boolean
}

/** Um pedido como a **lista** o devolve: as nove colunas do enunciado, mais a cadeia da trilha. */
export type ResumoDePedido = {
  id: number
  obra: ObraDoPedido | null
  fornecedor: FornecedorPublico | null
  dataPedido: string | null
  qtdItens: number
  totalCentavos: number
  situacao: SituacaoDoPedido
  faixa: { limiteCentavos: number | null; semTeto: boolean } | null
  cadeia: EtapaPublica[]
  etapaAtual: EtapaPublica | null
  podeDecidir: boolean
}

/** A página da lista: os itens desta página e quantos existem ao todo sob o mesmo filtro. */
export type PaginaDePedidos = {
  itens: ResumoDePedido[]
  total: number
  page: number
  perPage: number
}

/** O que a decisão devolve: o pedido na situação nova e a etapa que acabou de ser decidida. */
export type DecisaoPublica = {
  pedido: { id: number; situacao: SituacaoDoPedido }
  etapa: { ordem: number; situacao: SituacaoDaEtapa; decididoEm: string }
}

/** O que a submissão devolve: a cadeia gravada e a faixa que a produziu. */
export type SubmissaoPublica = {
  id: number
  situacao: SituacaoDoPedido
  cadeia: Array<{ ordem: number; usuarioId: string; nome: string; situacao: string }>
  faixa: { limiteCentavos: number | null; semTeto: boolean }
}

/**
 * A contagem de pedidos por situação, como `GET /api/pedidos/resumo` a devolve.
 *
 * As quatro chaves existem sempre, inclusive em zero — ver a rota. `rascunho` é o rascunho
 * **desta** sessão: rascunho alheio não entra aqui, nem somado.
 */
export type ResumoDePedidos = {
  porSituacao: Record<SituacaoDoPedido, number>
}
