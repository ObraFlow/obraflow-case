// Tipos de saída (DTOs): o que services, actions e API devolvem e o que a UI consome.
// Só tipos serializáveis: nada de Decimal nem Date (quantidade é string, datas são ISO).
// Fica em lib/ porque client components também precisam destes tipos; os mappers
// Prisma → DTO ficam em server/dto.ts.

import type { StatusAprovacao, StatusPedido } from "@/domain/alcada/tipos";

export type ObraDto = { id: number; nome: string };

export type UsuarioDto = { id: number; nome: string; email: string; cargo: string | null };

export type FornecedorDto = { id: number; nome: string; cnpj: string | null };

/** Um aprovador em uma posição da faixa, já com o nome para a tela. */
export type NivelDto = { ordem: number; usuarioId: number; usuarioNome: string };

/** Faixa de alçada de uma obra. `maxCents` null = sem teto. */
export type RegraDto = {
  id: number;
  obraId: number;
  minCents: number;
  maxCents: number | null;
  /** Texto pronto: "R$ 0,00 a R$ 10.000,00" ou "acima de R$ 10.000,00". */
  descricao: string;
  /**
   * Pedidos ainda pendentes criados nesta faixa. Eles mantêm a cadeia que copiaram
   * (snapshot), então editar ou remover a faixa não os altera; a tela só avisa.
   */
  pedidosPendentes: number;
  niveis: NivelDto[];
};

/** Resposta do preview na tela de novo pedido (GET /api/regras/aplicavel). */
export type FaixaAplicavelDto = {
  obraId: number;
  obraNome: string;
  /** Valor consultado. Não é o total de um pedido: é só o número digitado no preview. */
  valorCents: number;
  /** null quando nenhuma faixa da obra cobre o valor (decisão de produto 2). */
  faixa: RegraDto | null;
  /**
   * Cadeia acumulada: quem aprovaria um pedido nesse valor, na ordem (faixas abaixo
   * primeiro, depois a aplicável). Vazia quando `faixa` é null.
   */
  cadeia: Array<NivelDto & { herdado: boolean }>;
};

export type ItemPedidoDto = {
  id: number;
  ordem: number;
  descricao: string;
  /** Decimal do banco como texto ("150", "2.5"). */
  quantidade: string;
  unidade: string;
  precoUnitarioCents: number;
  totalCents: number;
};

/** Uma posição da cadeia do pedido (snapshot) com o resultado da decisão. */
export type AprovacaoDto = {
  ordem: number;
  aprovadorId: number;
  aprovadorNome: string;
  status: StatusAprovacao;
  motivo: string | null;
  /** ISO 8601 ou null enquanto pendente/cancelada. */
  decididoEm: string | null;
};

/**
 * Linha da lista de pedidos. Leva a cadeia inteira (com nomes) porque a coluna "Alçada"
 * mostra concluídos, atual e próximos; os itens ficam só no detalhe, aqui vai a contagem.
 */
export type PedidoResumo = {
  id: number;
  obraId: number;
  obraNome: string;
  fornecedorNome: string;
  criadoPorNome: string;
  /** "AAAA-MM-DD" */
  dataPedido: string;
  totalItens: number;
  totalCents: number;
  status: StatusPedido;
  stepAtual: number;
  totalNiveis: number;
  /** Quem precisa decidir agora; null quando a cadeia terminou. */
  aprovadorAtualId: number | null;
  aprovadorAtualNome: string | null;
  /** Snapshot da cadeia, em ordem. */
  aprovacoes: AprovacaoDto[];
  /** ISO 8601 */
  criadoEm: string;
};

/** Uma página da lista de pedidos, com o total para desenhar a paginação. */
export type PaginaDePedidos = {
  itens: PedidoResumo[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
};

// --- Acompanhamento ------------------------------------------------------------

/** Quantidade e soma de uma situação dentro de uma obra. */
export type ContagemDto = { quantidade: number; totalCents: number };

export type ResumoObraDto = {
  obraId: number;
  obraNome: string;
  pendentes: ContagemDto;
  aprovados: ContagemDto;
  rejeitados: ContagemDto;
  /** Soma das três situações. */
  totalCents: number;
};

/** Quanto está parado com uma pessoa agora. */
export type FilaAprovadorDto = {
  aprovadorId: number;
  aprovadorNome: string;
  quantidade: number;
  totalCents: number;
  /** O pedido que está há mais tempo na mesa dela; `desde` em ISO 8601. */
  maisAntigo: { pedidoId: number; desde: string };
};

export type TempoAprovadorDto = {
  aprovadorId: number;
  aprovadorNome: string;
  decisoes: number;
  /** Média da chegada na mesa até a decisão. */
  mediaMs: number;
};

export type TempoObraDto = {
  obraId: number;
  obraNome: string;
  pedidosEncerrados: number;
  /** Média da criação ao encerramento. */
  mediaMs: number;
};

/** Tela de acompanhamento e GET /api/acompanhamento. */
export type AcompanhamentoDto = {
  /** Instante em que foi calculado (ISO 8601): referência para "há N dias". */
  geradoEm: string;
  porObra: ResumoObraDto[];
  fila: FilaAprovadorDto[];
  temposPorAprovador: TempoAprovadorDto[];
  temposPorObra: TempoObraDto[];
};

/** Pedido completo para a tela de detalhe e para a API. */
export type PedidoDetalhe = PedidoResumo & {
  fornecedorId: number;
  criadoPorId: number;
  observacoes: string | null;
  regraId: number | null;
  itens: ItemPedidoDto[];
};
