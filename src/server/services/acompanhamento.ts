// Acompanhamento: onde os pedidos estão e com quem. Só leitura. As contas (fila por
// aprovador, tempo até decidir) são do domínio; aqui carregamos, convertemos Date → ms,
// chamamos o domínio e montamos o DTO com nomes.
//
// Carregamos todos os pedidos com a cadeia: o volume da demo são dezenas de linhas. Em
// produção isso viraria consulta agregada ou view materializada; o domínio não mudaria.

import { filaPorAprovador } from "@/domain/acompanhamento/filaPorAprovador";
import { tempoPorAprovador, tempoPorObra } from "@/domain/acompanhamento/tempoDeDecisao";
import type { PedidoAcompanhado } from "@/domain/acompanhamento/tipos";
import type { AcompanhamentoDto, ContagemDto, ResumoObraDto } from "@/lib/dto";
import { prisma } from "@/server/prisma";
import { listarObras, listarUsuarios } from "@/server/services/cadastros";

const CONTAGEM_VAZIA: ContagemDto = { quantidade: 0, totalCents: 0 };

export async function obterAcompanhamento(): Promise<AcompanhamentoDto> {
  const [porStatus, pedidos, obras, usuarios] = await Promise.all([
    prisma.pedido.groupBy({
      by: ["obraId", "status"],
      _count: { _all: true },
      _sum: { totalCents: true },
    }),
    prisma.pedido.findMany({
      select: {
        id: true,
        obraId: true,
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
  ]);

  const nomeDaObra = new Map(obras.map((obra) => [obra.id, obra.nome]));
  const nomeDoUsuario = new Map(usuarios.map((usuario) => [usuario.id, usuario.nome]));
  const nome = (mapa: Map<number, string>, id: number, prefixo: string) =>
    mapa.get(id) ?? `${prefixo} ${id}`;

  // Bloco 1: agregado no banco, uma linha por obra (inclusive obras sem pedido).
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
    };
  });

  // Blocos 2 e 3: precisam da cadeia inteira de cada pedido, então vão pelo domínio.
  const acompanhados: PedidoAcompanhado[] = pedidos.map((pedido) => ({
    id: pedido.id,
    obraId: pedido.obraId,
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

  return {
    geradoEm: new Date().toISOString(),
    porObra,
    fila: filaPorAprovador(acompanhados).map((fila) => ({
      aprovadorId: fila.aprovadorId,
      aprovadorNome: nome(nomeDoUsuario, fila.aprovadorId, "Usuário"),
      quantidade: fila.quantidade,
      totalCents: fila.totalCents,
      maisAntigo: {
        pedidoId: fila.maisAntigo.pedidoId,
        desde: new Date(fila.maisAntigo.desde).toISOString(),
      },
    })),
    temposPorAprovador: tempoPorAprovador(acompanhados).map((tempo) => ({
      aprovadorId: tempo.aprovadorId,
      aprovadorNome: nome(nomeDoUsuario, tempo.aprovadorId, "Usuário"),
      decisoes: tempo.decisoes,
      mediaMs: tempo.mediaMs,
    })),
    temposPorObra: tempoPorObra(acompanhados).map((tempo) => ({
      obraId: tempo.obraId,
      obraNome: nome(nomeDaObra, tempo.obraId, "Obra"),
      pedidosEncerrados: tempo.pedidosEncerrados,
      mediaMs: tempo.mediaMs,
    })),
  };
}
