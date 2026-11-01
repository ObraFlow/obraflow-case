// Mappers Prisma → DTO. Única fronteira onde Decimal e Date viram string.
// Os `include` abaixo são a forma canônica de carregar cada agregado; os services usam
// estes mesmos objetos para o Prisma inferir o tipo que o mapper espera.

import type { Prisma } from "@/generated/prisma/client";
import { formatarFaixa } from "@/lib/money";
import type {
  AprovacaoDto,
  FornecedorDto,
  ItemPedidoDto,
  ObraDto,
  PedidoDetalhe,
  PedidoResumo,
  RegraDto,
  UsuarioDto,
} from "@/lib/dto";

export type {
  AprovacaoDto,
  FaixaAplicavelDto,
  FornecedorDto,
  ItemPedidoDto,
  NivelDto,
  ObraDto,
  PedidoDetalhe,
  PedidoResumo,
  RegraDto,
  UsuarioDto,
} from "@/lib/dto";

// --- Cadastros ---------------------------------------------------------------

export function paraObraDto(obra: { id: number; nome: string; orcamentoCents: number }): ObraDto {
  return { id: obra.id, nome: obra.nome, orcamentoCents: obra.orcamentoCents };
}

export function paraUsuarioDto(usuario: {
  id: number;
  nome: string;
  email: string;
  cargo: string | null;
}): UsuarioDto {
  return { id: usuario.id, nome: usuario.nome, email: usuario.email, cargo: usuario.cargo };
}

export function paraFornecedorDto(fornecedor: {
  id: number;
  nome: string;
  cnpj: string | null;
}): FornecedorDto {
  return { id: fornecedor.id, nome: fornecedor.nome, cnpj: fornecedor.cnpj };
}

// --- Regras ------------------------------------------------------------------

export const includeRegra = {
  niveis: { orderBy: { ordem: "asc" }, include: { usuario: { select: { nome: true } } } },
  // Quantos pedidos pendentes ainda apontam para a faixa: a tela avisa antes de editar/remover.
  _count: { select: { pedidos: { where: { status: "PENDENTE" } } } },
} satisfies Prisma.RegraAlcadaInclude;

type RegraCarregada = Prisma.RegraAlcadaGetPayload<{ include: typeof includeRegra }>;

export function paraRegraDto(regra: RegraCarregada): RegraDto {
  return {
    id: regra.id,
    obraId: regra.obraId,
    minCents: regra.minCents,
    maxCents: regra.maxCents,
    descricao: formatarFaixa(regra.minCents, regra.maxCents),
    pedidosPendentes: regra._count.pedidos,
    niveis: regra.niveis.map((nivel) => ({
      ordem: nivel.ordem,
      usuarioId: nivel.usuarioId,
      usuarioNome: nivel.usuario.nome,
    })),
  };
}

// --- Pedidos -----------------------------------------------------------------

export const includePedidoResumo = {
  obra: { select: { nome: true } },
  fornecedor: { select: { nome: true } },
  criadoPor: { select: { nome: true } },
  aprovacoes: { orderBy: { ordem: "asc" }, include: { aprovador: { select: { nome: true } } } },
  _count: { select: { itens: true } },
} satisfies Prisma.PedidoInclude;

export const includePedidoDetalhe = {
  ...includePedidoResumo,
  itens: { orderBy: { ordem: "asc" } },
  origem: { select: { id: true } },
  refeitoPor: { select: { id: true } },
} satisfies Prisma.PedidoInclude;

type PedidoResumoCarregado = Prisma.PedidoGetPayload<{ include: typeof includePedidoResumo }>;
type PedidoDetalheCarregado = Prisma.PedidoGetPayload<{ include: typeof includePedidoDetalhe }>;

/** `@db.Date` chega como Date à meia-noite UTC; devolvemos só "AAAA-MM-DD". */
function dataParaIso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function paraAprovacaoDto(aprovacao: PedidoResumoCarregado["aprovacoes"][number]): AprovacaoDto {
  return {
    ordem: aprovacao.ordem,
    aprovadorId: aprovacao.aprovadorId,
    aprovadorNome: aprovacao.aprovador.nome,
    status: aprovacao.status,
    motivo: aprovacao.motivo,
    decididoEm: aprovacao.decididoEm ? aprovacao.decididoEm.toISOString() : null,
  };
}

function paraItemDto(item: PedidoDetalheCarregado["itens"][number]): ItemPedidoDto {
  return {
    id: item.id,
    ordem: item.ordem,
    descricao: item.descricao,
    quantidade: item.quantidade.toString(),
    unidade: item.unidade,
    precoUnitarioCents: item.precoUnitarioCents,
    totalCents: item.totalCents,
  };
}

export function paraPedidoResumo(pedido: PedidoResumoCarregado): PedidoResumo {
  const aprovacaoAtual =
    pedido.status === "PENDENTE"
      ? pedido.aprovacoes.find((aprovacao) => aprovacao.ordem === pedido.stepAtual)
      : undefined;

  return {
    id: pedido.id,
    obraId: pedido.obraId,
    obraNome: pedido.obra.nome,
    fornecedorNome: pedido.fornecedor.nome,
    criadoPorNome: pedido.criadoPor.nome,
    dataPedido: dataParaIso(pedido.dataPedido),
    totalItens: pedido._count.itens,
    totalCents: pedido.totalCents,
    status: pedido.status,
    stepAtual: pedido.stepAtual,
    totalNiveis: pedido.aprovacoes.length,
    aprovadorAtualId: aprovacaoAtual?.aprovadorId ?? null,
    aprovadorAtualNome: aprovacaoAtual?.aprovador.nome ?? null,
    aprovacoes: pedido.aprovacoes.map(paraAprovacaoDto),
    criadoEm: pedido.criadoEm.toISOString(),
  };
}

export function paraPedidoDetalhe(pedido: PedidoDetalheCarregado): PedidoDetalhe {
  return {
    ...paraPedidoResumo(pedido),
    fornecedorId: pedido.fornecedorId,
    criadoPorId: pedido.criadoPorId,
    observacoes: pedido.observacoes,
    regraId: pedido.regraId,
    refeitoDe: pedido.origem ? { id: pedido.origem.id } : null,
    refeitoPor: pedido.refeitoPor ? { id: pedido.refeitoPor.id } : null,
    itens: pedido.itens.map(paraItemDto),
  };
}
