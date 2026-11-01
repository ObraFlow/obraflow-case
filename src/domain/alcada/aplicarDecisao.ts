import {
  ConflitoDeDecisao,
  DecisaoForaDeOrdem,
  MotivoObrigatorio,
  SegregacaoDeFuncoes,
} from "../erros";
import type { AprovacaoSnapshot, Decisao, EstadoAprovacao } from "./tipos";

/**
 * Aplica uma decisão (aprovar ou rejeitar) ao estado de aprovação de um pedido.
 *
 * Função pura: recebe o estado atual, devolve o estado seguinte, não altera o recebido.
 * O service chama isto dentro da transação e persiste o resultado.
 *
 * Regras (decisões de produto 4, 5 e 6):
 * - só o aprovador do step atual decide, e só enquanto o step está PENDENTE;
 * - aprovar avança `stepAtual`; quando passa do último nível, o pedido fica APROVADO;
 * - rejeitar exige motivo, marca o step como REJEITADA, cancela os seguintes e encerra o pedido;
 * - quem cadastrou o pedido não decide sobre ele, mesmo que esteja na cadeia (segregação de funções).
 */
export function aplicarDecisao(
  estado: EstadoAprovacao,
  decisao: Decisao,
  usuarioId: number,
): EstadoAprovacao {
  if (estado.status !== "PENDENTE") {
    throw new DecisaoForaDeOrdem(
      estado.status === "APROVADO"
        ? "A cadeia de aprovação deste pedido já foi concluída."
        : "Este pedido já foi rejeitado e não aceita novas decisões.",
    );
  }

  const stepAtual = estado.cadeia.find((aprovacao) => aprovacao.ordem === estado.stepAtual);
  if (!stepAtual) {
    throw new DecisaoForaDeOrdem("A cadeia de aprovação deste pedido já foi concluída.");
  }

  if (stepAtual.status !== "PENDENTE") {
    // O estado diz que o step é a vez, mas ele já foi decidido: outra decisão chegou antes.
    throw new ConflitoDeDecisao();
  }

  if (estado.criadoPorId === usuarioId) {
    throw new SegregacaoDeFuncoes(
      "O pedido foi cadastrado por você; a decisão cabe a outra pessoa.",
    );
  }

  if (stepAtual.aprovadorId !== usuarioId) {
    throw new DecisaoForaDeOrdem(
      "Não é a sua vez de decidir este pedido. Aguarde o aprovador do nível atual.",
    );
  }

  if (decisao.tipo === "APROVAR") {
    return aprovar(estado, stepAtual);
  }
  return rejeitar(estado, stepAtual, decisao.motivo);
}

function aprovar(estado: EstadoAprovacao, step: AprovacaoSnapshot): EstadoAprovacao {
  const cadeia = estado.cadeia.map((aprovacao) =>
    aprovacao.ordem === step.ordem ? { ...aprovacao, status: "APROVADA" as const } : aprovacao,
  );
  const proximoStep = estado.stepAtual + 1;
  const terminou = proximoStep >= cadeia.length;

  return {
    status: terminou ? "APROVADO" : "PENDENTE",
    stepAtual: proximoStep,
    cadeia,
    criadoPorId: estado.criadoPorId,
  };
}

function rejeitar(
  estado: EstadoAprovacao,
  step: AprovacaoSnapshot,
  motivo: string,
): EstadoAprovacao {
  const motivoLimpo = motivo.trim();
  if (motivoLimpo === "") {
    throw new MotivoObrigatorio();
  }

  const cadeia = estado.cadeia.map((aprovacao): AprovacaoSnapshot => {
    if (aprovacao.ordem === step.ordem) {
      return { ...aprovacao, status: "REJEITADA", motivo: motivoLimpo };
    }
    if (aprovacao.ordem > step.ordem) {
      // Níveis seguintes nunca chegaram a decidir.
      return { ...aprovacao, status: "CANCELADA" };
    }
    return aprovacao;
  });

  return {
    status: "REJEITADO",
    stepAtual: estado.stepAtual,
    cadeia,
    criadoPorId: estado.criadoPorId,
  };
}
