// Pedidos de compra: criação (com snapshot da cadeia) e leitura.
// Quem decide (aprovar/rejeitar) está em decisoes.ts.

import { montarCadeia } from "@/domain/alcada/montarCadeia";
import { resolverRegra } from "@/domain/alcada/resolverRegra";
import type { FaixaAlcada } from "@/domain/alcada/tipos";
import { NaoEncontrado, SemFaixaAplicavel } from "@/domain/erros";
import { calcularTotais } from "@/domain/pedido/calcularTotais";
import type { Prisma } from "@/generated/prisma/client";
import type { PaginaDePedidos, PedidoDetalhe, PedidoResumo } from "@/lib/dto";
import { cache } from "react";
import { formatarCentavos } from "@/lib/money";
import { idSchema } from "@/lib/schemas/comum";
import type { CriarPedidoInput, FiltroPedidos, Paginacao } from "@/lib/schemas/pedido";
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

  // Cadeia acumulada: aprovadores das faixas abaixo, depois os da faixa aplicável (decisão 1).
  const cadeia = montarCadeia(faixas, faixa);

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
    where: wherePedidos(filtro),
    orderBy: ORDEM_PEDIDOS,
    include: includePedidoResumo,
  });
  return filtrarAprovadorDaVez(pedidos.map(paraPedidoResumo), filtro);
}

/**
 * Pendências do usuário atual. O header (contador) e a página de aprovações (número da aba)
 * perguntam isso na mesma request; `cache` do React faz a consulta rodar uma vez por request.
 */
export const listarPendentesPara = cache((usuarioId: number) =>
  listarPedidos({ pendentesPara: usuarioId }),
);

/**
 * Página da lista para a tela de aprovações. Filtra e pagina no banco (`skip`/`take` + `count`
 * na mesma transação). A exceção é `pendentesPara`: como o ajuste fino é em memória, os
 * candidatos são carregados inteiros e a página é recortada depois. São poucos por pessoa.
 */
export async function paginarPedidos(
  filtro: FiltroPedidos,
  paginacao: Paginacao,
): Promise<PaginaDePedidos> {
  const { porPagina } = paginacao;

  if (filtro.pendentesPara) {
    const todos = await listarPedidos(filtro);
    const totalPaginas = Math.max(1, Math.ceil(todos.length / porPagina));
    const pagina = Math.min(paginacao.pagina, totalPaginas);
    return {
      itens: todos.slice((pagina - 1) * porPagina, pagina * porPagina),
      total: todos.length,
      pagina,
      porPagina,
      totalPaginas,
    };
  }

  const where = wherePedidos(filtro);
  const total = await prisma.pedido.count({ where });
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const pagina = Math.min(paginacao.pagina, totalPaginas);
  const pedidos = await prisma.pedido.findMany({
    where,
    orderBy: ORDEM_LISTA,
    include: includePedidoResumo,
    skip: (pagina - 1) * porPagina,
    take: porPagina,
  });

  return { itens: pedidos.map(paraPedidoResumo), total, pagina, porPagina, totalPaginas };
}

/** API: do mais novo para o mais antigo. */
const ORDEM_PEDIDOS = [
  { criadoEm: "desc" },
  { id: "desc" },
] satisfies Prisma.PedidoOrderByWithRelationInput[];

/**
 * Tela: pendentes antes dos encerrados (a ordem do enum no Postgres é PENDENTE, APROVADO,
 * REJEITADO), e dentro de cada grupo do mais novo para o mais antigo. Assim a promessa
 * "o que precisa de decisão vem primeiro" vale entre páginas, não só dentro de uma.
 */
const ORDEM_LISTA = [
  { status: "asc" },
  ...ORDEM_PEDIDOS,
] satisfies Prisma.PedidoOrderByWithRelationInput[];

/**
 * `busca` aceita o número do pedido ("12" ou "#12") ou um trecho do nome da obra ou do
 * fornecedor, sem diferenciar maiúsculas. `pendentesPara` reduz no banco aos pedidos
 * pendentes em que a pessoa aparece pendente; `filtrarAprovadorDaVez` termina o serviço.
 */
function wherePedidos(filtro: FiltroPedidos): Prisma.PedidoWhereInput {
  const busca = filtro.busca?.replace(/^#/, "").trim();
  // Só vira filtro por id o que seria um id válido (inteiro positivo dentro do Int do banco).
  const numero = busca && /^\d+$/.test(busca) ? idSchema.safeParse(busca) : null;

  return {
    status: statusDoFiltro(filtro),
    obraId: filtro.obraId,
    aprovacoes: filtro.pendentesPara
      ? { some: { aprovadorId: filtro.pendentesPara, status: "PENDENTE" } }
      : undefined,
    OR: busca
      ? [
          ...(numero?.success ? [{ id: numero.data }] : []),
          { obra: { nome: { contains: busca, mode: "insensitive" } } },
          { fornecedor: { nome: { contains: busca, mode: "insensitive" } } },
        ]
      : undefined,
  };
}

/**
 * `pendentesPara` só faz sentido em pedidos pendentes. Se o chamador também pediu outro
 * status, a resposta certa é "nenhum" (`in: []`), não ignorar o que ele pediu.
 */
function statusDoFiltro(filtro: FiltroPedidos): Prisma.PedidoWhereInput["status"] {
  if (!filtro.pendentesPara) return filtro.status;
  if (filtro.status && filtro.status !== "PENDENTE") return { in: [] };
  return "PENDENTE";
}

/** O Prisma não compara `aprovacoes.ordem` com `pedido.stepAtual`; o ajuste fino é aqui. */
function filtrarAprovadorDaVez(resumos: PedidoResumo[], filtro: FiltroPedidos): PedidoResumo[] {
  if (!filtro.pendentesPara) return resumos;
  return resumos.filter((pedido) => pedido.aprovadorAtualId === filtro.pendentesPara);
}

export async function obterPedido(id: number): Promise<PedidoDetalhe> {
  const pedido = await prisma.pedido.findUnique({ where: { id }, include: includePedidoDetalhe });
  if (!pedido) throw new NaoEncontrado("Pedido");
  return paraPedidoDetalhe(pedido);
}
