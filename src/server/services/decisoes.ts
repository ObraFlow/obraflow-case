// Aprovar ou rejeitar um pedido. O domínio (aplicarDecisao) decide o próximo estado;
// este service só o persiste, dentro de uma transação, com um lock otimista.

import { aplicarDecisao } from "@/domain/alcada/aplicarDecisao";
import type { Decisao, EstadoAprovacao } from "@/domain/alcada/tipos";
import { ConflitoDeDecisao, ErroDominio, NaoEncontrado } from "@/domain/erros";
import type { PedidoDetalhe, ResultadoLoteDto } from "@/lib/dto";
import { includePedidoDetalhe, paraPedidoDetalhe } from "@/server/dto";
import { prisma } from "@/server/prisma";

/**
 * Fluxo (ARQUITETURA.md §5 e §9):
 * 1. dentro de `$transaction`, recarrega o pedido com a cadeia;
 * 2. `aplicarDecisao` valida vez/ordem/motivo e segregação (quem cadastrou não decide) e
 *    devolve o estado seguinte (ou lança DecisaoForaDeOrdem / MotivoObrigatorio /
 *    SegregacaoDeFuncoes);
 * 3. grava o step com `updateMany ... where status = PENDENTE`: se `count === 0`, outra
 *    decisão chegou entre o passo 1 e aqui → ConflitoDeDecisao (lock otimista, sem travar linha);
 * 4. em rejeição, cancela os níveis seguintes; por fim atualiza status e stepAtual do pedido.
 */
export async function registrarDecisao(
  pedidoId: number,
  decisao: Decisao,
  usuarioId: number,
): Promise<PedidoDetalhe> {
  return prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({
      where: { id: pedidoId },
      include: { aprovacoes: { orderBy: { ordem: "asc" } } },
    });
    if (!pedido) throw new NaoEncontrado("Pedido");

    const estadoAtual: EstadoAprovacao = {
      status: pedido.status,
      stepAtual: pedido.stepAtual,
      criadoPorId: pedido.criadoPorId,
      cadeia: pedido.aprovacoes.map((aprovacao) => ({
        ordem: aprovacao.ordem,
        aprovadorId: aprovacao.aprovadorId,
        status: aprovacao.status,
        motivo: aprovacao.motivo,
      })),
    };

    const proximo = aplicarDecisao(estadoAtual, decisao, usuarioId);
    const stepDecidido = proximo.cadeia.find((aprovacao) => aprovacao.ordem === pedido.stepAtual);
    if (!stepDecidido) throw new ConflitoDeDecisao();

    const gravados = await tx.aprovacaoPedido.updateMany({
      where: { pedidoId, ordem: pedido.stepAtual, status: "PENDENTE" },
      data: { status: stepDecidido.status, motivo: stepDecidido.motivo, decididoEm: new Date() },
    });
    if (gravados.count === 0) throw new ConflitoDeDecisao();

    if (proximo.status === "REJEITADO") {
      await tx.aprovacaoPedido.updateMany({
        where: { pedidoId, ordem: { gt: pedido.stepAtual }, status: "PENDENTE" },
        data: { status: "CANCELADA" },
      });
    }

    // Devolve o agregado gravado na própria transação: a leitura vê exatamente o que gravou.
    const atualizado = await tx.pedido.update({
      where: { id: pedidoId },
      data: { status: proximo.status, stepAtual: proximo.stepAtual },
      include: includePedidoDetalhe,
    });
    return paraPedidoDetalhe(atualizado);
  });
}

/**
 * Aprova vários pedidos de uma vez, um por um, cada um na própria transação de
 * `registrarDecisao`: o que foi aprovado fica aprovado, e o relatório diz o que não deu
 * (outra pessoa decidiu antes, não era a vez, quem cadastrou tentou aprovar).
 *
 * Aqui o erro de domínio de um item não é engolido: é traduzido para o resultado, que é o
 * contrato deste caso de uso. Erro de infraestrutura (banco fora) continua subindo e
 * interrompe o lote, como em qualquer outro service.
 */
export async function aprovarEmLote(
  pedidoIds: number[],
  usuarioId: number,
): Promise<ResultadoLoteDto> {
  const resultado: ResultadoLoteDto = { aprovados: [], falhas: [] };

  for (const pedidoId of new Set(pedidoIds)) {
    try {
      await registrarDecisao(pedidoId, { tipo: "APROVAR" }, usuarioId);
      resultado.aprovados.push(pedidoId);
    } catch (erro) {
      if (!(erro instanceof ErroDominio)) throw erro;
      resultado.falhas.push({ pedidoId, codigo: erro.codigo, mensagem: erro.message });
    }
  }

  return resultado;
}
