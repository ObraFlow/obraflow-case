// Pedidos de compra: criação (com snapshot da cadeia) e leitura.
// Quem decide (aprovar/rejeitar) está em decisoes.ts.

import { instanteDeAprovacao } from "@/domain/acompanhamento/encerramento";
import { DIA_MS, DIAS_PARA_ATRASO, estaAtrasado } from "@/domain/acompanhamento/estaAtrasado";
import { montarCadeia } from "@/domain/alcada/montarCadeia";
import { resolverRegra } from "@/domain/alcada/resolverRegra";
import { posicaoNaCadeia } from "@/domain/alcada/segregacao";
import type { FaixaAlcada } from "@/domain/alcada/tipos";
import {
  NaoEncontrado,
  OrigemJaRefeita,
  OrigemNaoRejeitada,
  SegregacaoDeFuncoes,
  SemFaixaAplicavel,
} from "@/domain/erros";
import { calcularTotais } from "@/domain/pedido/calcularTotais";
import { Prisma } from "@/generated/prisma/client";
import { aguardandoDesde, paraPedidoAcompanhado } from "@/lib/cadeia";
import { chaveDoMes } from "@/lib/datas";
import type {
  ContagemDto,
  PaginaDePedidos,
  PedidoDetalhe,
  PedidoResumo,
  ResumoPedidosDto,
} from "@/lib/dto";
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
 * 3. snapshot da cadeia (montarCadeia) gravado em AprovacaoPedido, stepAtual = 0;
 * 4. quem cadastra não pode estar nessa cadeia (segregação de funções);
 * 5. se refaz um pedido rejeitado (`origemId`), a origem precisa estar rejeitada e sem nova
 *    versão; o pedido novo passa pela alçada do zero, nada é herdado.
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

  const posicao = posicaoNaCadeia(cadeia, criadoPorId);
  if (posicao !== null) {
    throw new SegregacaoDeFuncoes(
      `Um pedido de ${formatarCentavos(totais.totalPedidoCents)} na obra "${obra.nome}" seria aprovado por você (nível ${posicao + 1} de ${cadeia.length}). Peça a outra pessoa para cadastrá-lo.`,
    );
  }

  if (input.origemId !== undefined) await conferirOrigem(input.origemId);

  const criado = await prisma.pedido
    .create({
      data: {
        obraId: input.obraId,
        fornecedorId: input.fornecedorId,
        criadoPorId,
        dataPedido: new Date(`${input.dataPedido}T00:00:00.000Z`),
        observacoes: input.observacoes?.trim() || null,
        totalCents: totais.totalPedidoCents,
        regraId: faixa.id,
        origemId: input.origemId ?? null,
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
    })
    .catch(async (erro: unknown): Promise<never> => {
      // Corrida: outra nova versão do mesmo rejeitado entrou entre a conferência e o create.
      // O @unique de origemId segurou esta; conferir de novo lança OrigemJaRefeita com o id
      // da versão que ganhou (409), em vez de o erro do banco virar "Erro inesperado".
      if (input.origemId !== undefined && ehViolacaoDeUnico(erro)) {
        await conferirOrigem(input.origemId);
      }
      throw erro;
    });

  return paraPedidoDetalhe(criado);
}

/** P2002: o banco recusou por índice único. Em Pedido o único índice assim é `origemId`. */
function ehViolacaoDeUnico(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";
}

/**
 * Só um pedido rejeitado pode ser refeito, e só uma vez. A corrida entre duas versões ao
 * mesmo tempo é resolvida pelo `@unique` de `origemId` no banco.
 */
async function conferirOrigem(origemId: number): Promise<void> {
  const origem = await prisma.pedido.findUnique({
    where: { id: origemId },
    select: { id: true, status: true, refeitoPor: { select: { id: true } } },
  });
  if (!origem) throw new NaoEncontrado("Pedido de origem");
  if (origem.status !== "REJEITADO") throw new OrigemNaoRejeitada(origem.id, origem.status);
  if (origem.refeitoPor) throw new OrigemJaRefeita(origem.id, origem.refeitoPor.id);
}

/**
 * Lista para a tela de aprovações e para GET /api/pedidos.
 * `pendentesPara` filtra os pedidos em que o usuário é o aprovador da vez: o banco
 * reduz aos pedidos pendentes em que ele aparece pendente na cadeia e o ajuste fino
 * (ordem === stepAtual) é feito em memória, porque o Prisma não compara duas colunas.
 * `atrasadoHaDias` também termina em memória: "desde quando espera" é a chegada na mesa
 * do nível atual (domínio), não uma coluna.
 */
export async function listarPedidos(filtro: FiltroPedidos = {}): Promise<PedidoResumo[]> {
  const pedidos = await prisma.pedido.findMany({
    where: wherePedidos(filtro),
    orderBy: ORDEM_PEDIDOS,
    include: includePedidoResumo,
  });
  return filtrarEmMemoria(pedidos.map(paraPedidoResumo), filtro, Date.now());
}

/**
 * Os números do topo da lista de aprovações. Duas consultas pequenas: os pendentes (com a
 * cadeia, para saber de quem é a vez e desde quando) e os aprovados do último mês (o corte
 * fino "aprovação final neste mês" usa o fuso de Brasília, então o banco traz uma janela um
 * pouco maior e o recorte é feito aqui).
 */
export async function resumoPedidos(
  usuarioId: number | null,
  obraId?: number,
): Promise<ResumoPedidosDto> {
  const agora = Date.now();
  const mes = chaveDoMes(agora);
  const inicioDaJanela = new Date(agora - 32 * DIA_MS);

  const [pendentes, aprovadosRecentes] = await Promise.all([
    prisma.pedido.findMany({
      where: { status: "PENDENTE", obraId },
      include: includePedidoResumo,
    }),
    prisma.pedido.findMany({
      where: {
        status: "APROVADO",
        obraId,
        aprovacoes: { some: { decididoEm: { gte: inicioDaJanela } } },
      },
      include: includePedidoResumo,
    }),
  ]);

  const resumosPendentes = pendentes.map(paraPedidoResumo);
  const minha =
    usuarioId === null
      ? []
      : resumosPendentes.filter((pedido) => pedido.aprovadorAtualId === usuarioId);
  const atrasados = resumosPendentes.filter((pedido) =>
    estaAtrasado(paraPedidoAcompanhado(pedido), agora),
  );
  const aprovadosNoMes = aprovadosRecentes.map(paraPedidoResumo).filter((pedido) => {
    const aprovadoEm = instanteDeAprovacao(paraPedidoAcompanhado(pedido));
    return aprovadoEm !== null && chaveDoMes(aprovadoEm) === mes;
  });

  const esperas = atrasados
    .map(aguardandoDesde)
    .filter((desde): desde is string => desde !== null)
    .sort();

  return {
    mes,
    minhaDecisao: contagem(minha),
    pendentes: contagem(resumosPendentes),
    atrasados: { ...contagem(atrasados), maisAntigoDesde: esperas[0] ?? null },
    aprovadosNoMes: contagem(aprovadosNoMes),
  };
}

function contagem(pedidos: PedidoResumo[]): ContagemDto {
  return {
    quantidade: pedidos.length,
    totalCents: pedidos.reduce((soma, pedido) => soma + pedido.totalCents, 0),
  };
}

/**
 * Pendências do usuário atual. O header (contador) e a página de aprovações (número da aba)
 * perguntam isso na mesma request; `cache` do React faz a consulta rodar uma vez por request.
 */
export const listarPendentesPara = cache((usuarioId: number) =>
  listarPedidos({ pendentesPara: usuarioId }),
);

/**
 * Página da lista para a tela de aprovações. Filtra e pagina no banco (`skip`/`take` + `count`).
 * As exceções são `pendentesPara` e `atrasadoHaDias`: como o ajuste fino é em memória, os
 * candidatos (só pendentes) são carregados inteiros e a página é recortada depois.
 */
export async function paginarPedidos(
  filtro: FiltroPedidos,
  paginacao: Paginacao,
): Promise<PaginaDePedidos> {
  const { porPagina } = paginacao;

  if (filtro.pendentesPara || filtro.atrasadoHaDias) {
    // Sem outros filtros é a mesma consulta do contador do header e do número da aba:
    // `listarPendentesPara` (com `cache`) roda uma vez por request para os três.
    const soPendentes =
      filtro.pendentesPara &&
      !filtro.obraId &&
      !filtro.status &&
      !filtro.busca &&
      !filtro.atrasadoHaDias;
    const todos = soPendentes
      ? await listarPendentesPara(filtro.pendentesPara!)
      : await listarPedidos(filtro);
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
 * `pendentesPara` e `atrasadoHaDias` só fazem sentido em pedidos pendentes. Se o chamador
 * também pediu outro status, a resposta certa é "nenhum" (`in: []`), não ignorar o que ele pediu.
 */
function statusDoFiltro(filtro: FiltroPedidos): Prisma.PedidoWhereInput["status"] {
  if (!filtro.pendentesPara && !filtro.atrasadoHaDias) return filtro.status;
  if (filtro.status && filtro.status !== "PENDENTE") return { in: [] };
  return "PENDENTE";
}

/**
 * O que o banco não resolve: `aprovacoes.ordem === pedido.stepAtual` (o Prisma não compara
 * duas colunas) e "espera o nível atual há N dias" (a chegada na mesa é calculada pelo domínio).
 */
function filtrarEmMemoria(
  resumos: PedidoResumo[],
  filtro: FiltroPedidos,
  agoraMs: number,
): PedidoResumo[] {
  let lista = resumos;
  if (filtro.pendentesPara) {
    lista = lista.filter((pedido) => pedido.aprovadorAtualId === filtro.pendentesPara);
  }
  if (filtro.atrasadoHaDias) {
    const limiteMs = filtro.atrasadoHaDias * DIA_MS;
    lista = lista.filter((pedido) =>
      estaAtrasado(paraPedidoAcompanhado(pedido), agoraMs, limiteMs),
    );
  }
  return lista;
}

export { DIAS_PARA_ATRASO };

export async function obterPedido(id: number): Promise<PedidoDetalhe> {
  const pedido = await prisma.pedido.findUnique({ where: { id }, include: includePedidoDetalhe });
  if (!pedido) throw new NaoEncontrado("Pedido");
  return paraPedidoDetalhe(pedido);
}
