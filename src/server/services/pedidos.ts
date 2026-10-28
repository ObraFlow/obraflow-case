// Pedidos de compra: criação (com snapshot da cadeia) e leitura.
// Quem decide (aprovar/rejeitar) está em decisoes.ts.

import { montarCadeia } from "@/domain/alcada/montarCadeia";
import { resolverRegra } from "@/domain/alcada/resolverRegra";
import type { FaixaAlcada } from "@/domain/alcada/tipos";
import { NaoEncontrado, SemFaixaAplicavel } from "@/domain/erros";
import { calcularTotais } from "@/domain/pedido/calcularTotais";
import type { PedidoDetalhe, PedidoResumo } from "@/lib/dto";
import { formatarCentavos } from "@/lib/money";
import type { CriarPedidoInput, FiltroPedidos } from "@/lib/schemas/pedido";
import {
  includePedidoDetalhe,
  includePedidoResumo,
  paraPedidoDetalhe,
  paraPedidoResumo,
} from "@/server/dto";
import { prisma } from "@/server/prisma";

/**
 * Cria um pedido (fluxo narrado em ARQUITETURA.md §5):
 * 1. totais em centavos pelo domínio (nunca confiamos no total vindo do browser);
 * 2. faixa da obra pelo total; sem faixa → SemFaixaAplicavel com obra e valor (decisão 2);
 * 3. snapshot da cadeia (montarCadeia) gravado em AprovacaoPedido, stepAtual = 0.
 * O `create` aninhado grava pedido, itens e cadeia de uma vez (atômico).
 */
export async function criarPedido(
  input: CriarPedidoInput,
  criadoPorId: number,
): Promise<PedidoDetalhe> {
  const [obra, fornecedor, criador] = await Promise.all([
    prisma.obra.findUnique({
      where: { id: input.obraId },
      include: { regras: { include: { niveis: true } } },
    }),
    prisma.fornecedor.findUnique({ where: { id: input.fornecedorId }, select: { id: true } }),
    prisma.usuario.findUnique({ where: { id: criadoPorId }, select: { id: true } }),
  ]);
  if (!obra) throw new NaoEncontrado("Obra", "f");
  if (!fornecedor) throw new NaoEncontrado("Fornecedor");
  if (!criador) throw new NaoEncontrado("Usuário");

  const totais = calcularTotais(input.itens);

  const faixas: FaixaAlcada[] = obra.regras.map((regra) => ({
    id: regra.id,
    minCents: regra.minCents,
    maxCents: regra.maxCents,
    niveis: regra.niveis.map((nivel) => ({ ordem: nivel.ordem, usuarioId: nivel.usuarioId })),
  }));
  const faixa = resolverRegra(faixas, totais.totalPedidoCents);
  if (!faixa) {
    throw new SemFaixaAplicavel(obra.nome, formatarCentavos(totais.totalPedidoCents));
  }

  const cadeia = montarCadeia(faixa);

  const criado = await prisma.pedido.create({
    data: {
      obraId: input.obraId,
      fornecedorId: input.fornecedorId,
      criadoPorId,
      dataPedido: new Date(`${input.dataPedido}T00:00:00.000Z`),
      observacoes: input.observacoes?.trim() || null,
      totalCents: totais.totalPedidoCents,
      regraId: faixa.id,
      stepAtual: 0,
      itens: {
        create: input.itens.map((item, indice) => ({
          ordem: indice,
          descricao: item.descricao,
          quantidade: item.quantidade.replace(",", "."),
          unidade: item.unidade,
          precoUnitarioCents: item.precoUnitarioCents,
          totalCents: totais.totaisItensCents[indice],
        })),
      },
      aprovacoes: {
        create: cadeia.map((aprovacao) => ({
          ordem: aprovacao.ordem,
          aprovadorId: aprovacao.aprovadorId,
          status: aprovacao.status,
        })),
      },
    },
    include: includePedidoDetalhe,
  });

  return paraPedidoDetalhe(criado);
}

/**
 * Lista para a tela de aprovações e para GET /api/pedidos.
 * `pendentesPara` filtra os pedidos em que o usuário é o aprovador da vez: o banco
 * reduz aos pedidos pendentes em que ele aparece pendente na cadeia e o ajuste fino
 * (ordem === stepAtual) é feito em memória, porque o Prisma não compara duas colunas.
 */
export async function listarPedidos(filtro: FiltroPedidos = {}): Promise<PedidoResumo[]> {
  const pedidos = await prisma.pedido.findMany({
    where: {
      status: filtro.pendentesPara ? "PENDENTE" : filtro.status,
      obraId: filtro.obraId,
      aprovacoes: filtro.pendentesPara
        ? { some: { aprovadorId: filtro.pendentesPara, status: "PENDENTE" } }
        : undefined,
    },
    orderBy: [{ criadoEm: "desc" }, { id: "desc" }],
    include: includePedidoResumo,
  });

  const resumos = pedidos.map(paraPedidoResumo);
  if (!filtro.pendentesPara) return resumos;
  return resumos.filter((pedido) => pedido.aprovadorAtualId === filtro.pendentesPara);
}

export async function obterPedido(id: number): Promise<PedidoDetalhe> {
  const pedido = await prisma.pedido.findUnique({ where: { id }, include: includePedidoDetalhe });
  if (!pedido) throw new NaoEncontrado("Pedido");
  return paraPedidoDetalhe(pedido);
}
