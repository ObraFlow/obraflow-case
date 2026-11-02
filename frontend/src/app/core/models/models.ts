export type PedidoStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO';
export type AprovacaoStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO';
export type HistoricoAcao = 'CRIADO' | 'APROVADO' | 'REJEITADO';

export interface Obra {
  id: string;
  nome: string;
  endereco?: string;
  _count?: {
    pedidos: number;
    regrasAlcada: number;
  };
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
}

export interface Fornecedor {
  id: string;
  razaoSocial: string;
  cnpj: string;
  email?: string;
  telefone?: string;
}

export interface RegraAlcadaAprovador {
  id?: string;
  regraAlcadaId?: string;
  usuarioId: string;
  ordem: number;
  usuario?: Usuario;
}

export interface RegraAlcada {
  id: string;
  obraId: string;
  descricao?: string;
  valorMinimo: number;
  valorMaximo?: number | null;
  aprovadores: RegraAlcadaAprovador[];
}

export interface PedidoItem {
  id?: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  totalItem?: number;
}

export interface PedidoAprovacao {
  id: string;
  ordem: number;
  status: AprovacaoStatus;
  decididoEm?: string | null;
  motivo?: string | null;
  usuarioId: string;
  usuario: Usuario;
}

export interface PedidoHistorico {
  id: string;
  acao: HistoricoAcao;
  descricao: string;
  criadoEm: string;
  usuario?: Usuario | null;
}

export interface PedidoResumo {
  id: string;
  numero: string;
  obra: { id: string; nome: string };
  fornecedor: { id: string; razaoSocial: string; cnpj: string };
  dataPedido: string;
  quantidadeItens: number;
  valorTotal: number;
  status: PedidoStatus;
  nivelAtualOrdem: number | null;
  totalEtapas: number;
  motivoRejeicao?: string | null;
  aprovadorAtual?: Usuario | null;
  aprovadoresConcluidos: string[];
  proximosAprovadores: string[];
  createdAt: string;
}

export interface PedidoDetalhes {
  id: string;
  numero: string;
  obraId: string;
  obra: Obra;
  fornecedorId: string;
  fornecedor: Fornecedor;
  dataPedido: string;
  observacoes?: string | null;
  valorTotal: number;
  status: PedidoStatus;
  regraAlcadaId?: string | null;
  regraAlcada?: RegraAlcada | null;
  nivelAtualOrdem: number | null;
  motivoRejeicao?: string | null;
  itens: PedidoItem[];
  aprovacoes: PedidoAprovacao[];
  historico: PedidoHistorico[];
  aprovadorAtual?: Usuario | null;
  createdAt: string;
}

