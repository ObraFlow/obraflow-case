export type Obra = { idObra: number; nome: string };
export type Fornecedor = { idFornecedor: number; nome: string; cnpj: string };
export type Usuario = { idUsuario: number; nome: string; email: string };

export type StatusPedido = "PENDENTE" | "APROVADO" | "REJEITADO";
export type StatusEtapa = "AGUARDANDO" | "APROVADO" | "REJEITADO";

export type Etapa = {
  idEtapaAprovacao: number;
  idUsuario: number;
  ordem: number;
  status: StatusEtapa;
  motivo: string | null;
  decididoEm: string | null;
  usuario: Usuario;
};

export type ItemPedido = {
  idItemPedido: number;
  descricao: string;
  quantidade: number;
  unidade: string;
  precoUnitarioCentavos: number;
  totalCentavos: number;
};

export type Pedido = {
  idPedido: number;
  dataPedido: string;
  observacoes: string | null;
  totalCentavos: number;
  status: StatusPedido;
  etapaAtual: number | null;
  obra: Obra;
  fornecedor: Fornecedor;
  etapas: Etapa[];
  itens?: ItemPedido[];
  _count?: { itens: number };
};

export type Regra = {
  idRegra: number;
  valorMaximoCentavos: number | null;
  aprovadores: { idRegraAprovador: number; idUsuario: number; ordem: number; usuario: Usuario }[];
};