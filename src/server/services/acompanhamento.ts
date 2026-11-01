// Acompanhamento: orçamento das obras, onde os pedidos estão e com quem, o que foi
// comprado por mês e de quem. Só leitura. As contas são do domínio; aqui carregamos,
// convertemos Date → ms, chamamos o domínio e montamos o DTO com nomes.
//
// Carregamos todos os pedidos com a cadeia: o volume da demo são dezenas de linhas. Em
// produção isso viraria consulta agregada ou view materializada; o domínio não mudaria.

import { comprasAprovadasPorMes } from "@/domain/acompanhamento/comprasPorMes";
import { filaPorAprovador } from "@/domain/acompanhamento/filaPorAprovador";
import { fornecedoresMaisComprados } from "@/domain/acompanhamento/fornecedoresMaisComprados";
import { tempoPorAprovador, tempoPorObra } from "@/domain/acompanhamento/tempoDeDecisao";
import type { PedidoAcompanhadoCompleto } from "@/domain/acompanhamento/tipos";
import { ultimasMovimentacoes } from "@/domain/acompanhamento/ultimasMovimentacoes";
import { NaoEncontrado } from "@/domain/erros";
import { resumoOrcamento } from "@/domain/orcamento/resumoOrcamento";
import { chaveDoMes, ultimosMeses } from "@/lib/datas";
import type { AcompanhamentoDto, ContagemDto, ResumoObraDto } from "@/lib/dto";
import { prisma } from "@/server/prisma";
import { listarFornecedores, listarObras, listarUsuarios } from "@/server/services/cadastros";

const CONTAGEM_VAZIA: ContagemDto = { quantidade: 0, totalCents: 0 };
const MESES_NA_SERIE = 6;
const MOVIMENTACOES_NA_LISTA = 8;

export type FiltroAcompanhamento = { obraId?: number };

/**
 * `obraId` recorta fila, tempos, série mensal, fornecedores e movimentações. O bloco por
 * obra vem sempre inteiro: ele existe para comparar uma obra com a outra.
 */
export async function obterAcompanhamento(
  filtro: FiltroAcompanhamento = {},
): Promise<AcompanhamentoDto> {
  const [porStatus, pedidos, obras, usuarios, fornecedores] = await Promise.all([
    prisma.pedido.groupBy({
      by: ["obraId", "status"],
      _count: { _all: true },
      _sum: { totalCents: true },
    }),
    prisma.pedido.findMany({
      select: {
        id: true,
        obraId: true,
        fornecedorId: true,
        criadoPorId: true,
        origemId: true,
        totalCents: true,
        status: true,
        stepAtual: true,
        criadoEm: true,
        aprovacoes: {
          select: { ordem: true, aprovadorId: true, status: true, decididoEm: true },
        },
      },
    }),
    listarObras(),
    listarUsuarios(),
    listarFornecedores(),
  ]);

  const obraSelecionada = filtro.obraId
    ? (obras.find((obra) => obra.id === filtro.obraId) ?? null)
    : null;
  if (filtro.obraId && !obraSelecionada) throw new NaoEncontrado("Obra", "f");

  const nomeDaObra = new Map(obras.map((obra) => [obra.id, obra.nome]));
  const nomeDoUsuario = new Map(usuarios.map((usuario) => [usuario.id, usuario.nome]));
  const nomeDoFornecedor = new Map(fornecedores.map((f) => [f.id, f.nome]));
  const nome = (mapa: Map<number, string>, id: number, prefixo: string) =>
    mapa.get(id) ?? `${prefixo} ${id}`;

  // Bloco por obra: agregado no banco, uma linha por obra (inclusive obras sem pedido).
  const contagem = (obraId: number, status: "PENDENTE" | "APROVADO" | "REJEITADO") => {
    const grupo = porStatus.find((g) => g.obraId === obraId && g.status === status);
    return grupo
      ? { quantidade: grupo._count._all, totalCents: grupo._sum.totalCents ?? 0 }
      : CONTAGEM_VAZIA;
  };
  const porObra: ResumoObraDto[] = obras.map((obra) => {
    const pendentes = contagem(obra.id, "PENDENTE");
    const aprovados = contagem(obra.id, "APROVADO");
    const rejeitados = contagem(obra.id, "REJEITADO");
    return {
      obraId: obra.id,
      obraNome: obra.nome,
      pendentes,
      aprovados,
      rejeitados,
      totalCents: pendentes.totalCents + aprovados.totalCents + rejeitados.totalCents,
      orcamento: resumoOrcamento({
        orcamentoCents: obra.orcamentoCents,
        aprovadoCents: aprovados.totalCents,
        pendenteCents: pendentes.totalCents,
      }),
    };
  });

  // Os demais blocos precisam da cadeia inteira de cada pedido, então vão pelo domínio.
  const acompanhados: PedidoAcompanhadoCompleto[] = pedidos.map((pedido) => ({
    id: pedido.id,
    obraId: pedido.obraId,
    fornecedorId: pedido.fornecedorId,
    criadoPorId: pedido.criadoPorId,
    origemId: pedido.origemId,
    totalCents: pedido.totalCents,
    status: pedido.status,
    stepAtual: pedido.stepAtual,
    criadoEm: pedido.criadoEm.getTime(),
    aprovacoes: pedido.aprovacoes.map((aprovacao) => ({
      ordem: aprovacao.ordem,
      aprovadorId: aprovacao.aprovadorId,
      status: aprovacao.status,
      decididoEm: aprovacao.decididoEm?.getTime() ?? null,
    })),
  }));
  const recorte = obraSelecionada
    ? acompanhados.filter((pedido) => pedido.obraId === obraSelecionada.id)
    : acompanhados;

  const agora = Date.now();

  return {
    geradoEm: new Date(agora).toISOString(),
    obraSelecionada: obraSelecionada
      ? { id: obraSelecionada.id, nome: obraSelecionada.nome }
      : null,
    porObra,
    fila: filaPorAprovador(recorte).map((fila) => ({
      aprovadorId: fila.aprovadorId,
      aprovadorNome: nome(nomeDoUsuario, fila.aprovadorId, "Usuário"),
      quantidade: fila.quantidade,
      totalCents: fila.totalCents,
      maisAntigo: {
        pedidoId: fila.maisAntigo.pedidoId,
        desde: new Date(fila.maisAntigo.desde).toISOString(),
      },
    })),
    temposPorAprovador: tempoPorAprovador(recorte).map((tempo) => ({
      aprovadorId: tempo.aprovadorId,
      aprovadorNome: nome(nomeDoUsuario, tempo.aprovadorId, "Usuário"),
      decisoes: tempo.decisoes,
      mediaMs: tempo.mediaMs,
    })),
    temposPorObra: tempoPorObra(recorte).map((tempo) => ({
      obraId: tempo.obraId,
      obraNome: nome(nomeDaObra, tempo.obraId, "Obra"),
      pedidosEncerrados: tempo.pedidosEncerrados,
      mediaMs: tempo.mediaMs,
    })),
    comprasPorMes: comprasAprovadasPorMes(recorte, ultimosMeses(agora, MESES_NA_SERIE), chaveDoMes),
    fornecedores: fornecedoresMaisComprados(recorte).map((fornecedor) => ({
      ...fornecedor,
      fornecedorNome: nome(nomeDoFornecedor, fornecedor.fornecedorId, "Fornecedor"),
    })),
    movimentacoes: ultimasMovimentacoes(recorte, MOVIMENTACOES_NA_LISTA).map((movimentacao) => ({
      tipo: movimentacao.tipo,
      em: new Date(movimentacao.em).toISOString(),
      pedidoId: movimentacao.pedidoId,
      obraId: movimentacao.obraId,
      obraNome: nome(nomeDaObra, movimentacao.obraId, "Obra"),
      usuarioId: movimentacao.usuarioId,
      usuarioNome: nome(nomeDoUsuario, movimentacao.usuarioId, "Usuário"),
      totalCents: movimentacao.totalCents,
    })),
  };
}
