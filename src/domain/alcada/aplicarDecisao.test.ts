import { describe, expect, it } from "vitest";
import { ConflitoDeDecisao, DecisaoForaDeOrdem, MotivoObrigatorio } from "../erros";
import { aplicarDecisao } from "./aplicarDecisao";
import type { AprovacaoSnapshot, EstadoAprovacao } from "./tipos";

const JOAO = 1;
const AMANDA = 2;
const CARLA = 3;

function pendente(ordem: number, aprovadorId: number): AprovacaoSnapshot {
  return { ordem, aprovadorId, status: "PENDENTE", motivo: null };
}

/** Pedido recém-criado na faixa alta do enunciado: João → Amanda. */
function pedidoNovo(): EstadoAprovacao {
  return { status: "PENDENTE", stepAtual: 0, cadeia: [pendente(0, JOAO), pendente(1, AMANDA)] };
}

const APROVAR = { tipo: "APROVAR" } as const;
const REJEITAR = { tipo: "REJEITAR", motivo: "Fora do orçamento da etapa." } as const;

describe("aplicarDecisao — aprovar", () => {
  it("primeiro aprovador aprova: step avança e pedido continua pendente", () => {
    const depois = aplicarDecisao(pedidoNovo(), APROVAR, JOAO);
    expect(depois.status).toBe("PENDENTE");
    expect(depois.stepAtual).toBe(1);
    expect(depois.cadeia[0].status).toBe("APROVADA");
    expect(depois.cadeia[1].status).toBe("PENDENTE");
  });

  it("último aprovador aprova: pedido fica APROVADO e stepAtual = tamanho da cadeia", () => {
    const aposJoao = aplicarDecisao(pedidoNovo(), APROVAR, JOAO);
    const final = aplicarDecisao(aposJoao, APROVAR, AMANDA);
    expect(final.status).toBe("APROVADO");
    expect(final.stepAtual).toBe(2);
    expect(final.cadeia.map((a) => a.status)).toEqual(["APROVADA", "APROVADA"]);
  });

  it("cadeia de um único nível: uma aprovação conclui o pedido", () => {
    const estado: EstadoAprovacao = {
      status: "PENDENTE",
      stepAtual: 0,
      cadeia: [pendente(0, JOAO)],
    };
    const depois = aplicarDecisao(estado, APROVAR, JOAO);
    expect(depois.status).toBe("APROVADO");
    expect(depois.stepAtual).toBe(1);
  });

  it("não altera o estado recebido (função pura)", () => {
    const antes = pedidoNovo();
    aplicarDecisao(antes, APROVAR, JOAO);
    expect(antes.stepAtual).toBe(0);
    expect(antes.status).toBe("PENDENTE");
    expect(antes.cadeia[0].status).toBe("PENDENTE");
  });
});

describe("aplicarDecisao — rejeitar", () => {
  it("rejeição no primeiro nível encerra o pedido e cancela os níveis seguintes", () => {
    const depois = aplicarDecisao(pedidoNovo(), REJEITAR, JOAO);
    expect(depois.status).toBe("REJEITADO");
    expect(depois.cadeia[0].status).toBe("REJEITADA");
    expect(depois.cadeia[0].motivo).toBe("Fora do orçamento da etapa.");
    expect(depois.cadeia[1].status).toBe("CANCELADA");
  });

  it("rejeição no segundo nível preserva a aprovação do primeiro no histórico", () => {
    const aposJoao = aplicarDecisao(pedidoNovo(), APROVAR, JOAO);
    const depois = aplicarDecisao(aposJoao, REJEITAR, AMANDA);
    expect(depois.status).toBe("REJEITADO");
    expect(depois.cadeia[0].status).toBe("APROVADA");
    expect(depois.cadeia[1].status).toBe("REJEITADA");
    expect(depois.cadeia[1].motivo).toBe("Fora do orçamento da etapa.");
  });

  it("stepAtual não avança na rejeição: continua apontando para quem rejeitou", () => {
    const depois = aplicarDecisao(pedidoNovo(), REJEITAR, JOAO);
    expect(depois.stepAtual).toBe(0);
  });

  it("motivo é guardado sem espaços nas pontas", () => {
    const depois = aplicarDecisao(
      pedidoNovo(),
      { tipo: "REJEITAR", motivo: "  Preço acima do mercado.  " },
      JOAO,
    );
    expect(depois.cadeia[0].motivo).toBe("Preço acima do mercado.");
  });

  it("rejeitar sem motivo é erro, e nada muda", () => {
    expect(() => aplicarDecisao(pedidoNovo(), { tipo: "REJEITAR", motivo: "" }, JOAO)).toThrow(
      MotivoObrigatorio,
    );
    expect(() => aplicarDecisao(pedidoNovo(), { tipo: "REJEITAR", motivo: "   " }, JOAO)).toThrow(
      MotivoObrigatorio,
    );
  });
});

describe("aplicarDecisao — fora de ordem", () => {
  it("segundo aprovador tenta decidir antes do primeiro", () => {
    expect(() => aplicarDecisao(pedidoNovo(), APROVAR, AMANDA)).toThrow(DecisaoForaDeOrdem);
  });

  it("quem não está na cadeia não decide", () => {
    expect(() => aplicarDecisao(pedidoNovo(), APROVAR, CARLA)).toThrow(DecisaoForaDeOrdem);
  });

  it("primeiro aprovador tenta decidir de novo depois que já aprovou", () => {
    const aposJoao = aplicarDecisao(pedidoNovo(), APROVAR, JOAO);
    expect(() => aplicarDecisao(aposJoao, APROVAR, JOAO)).toThrow(DecisaoForaDeOrdem);
  });

  it("pedido já APROVADO não aceita mais decisões (cadeia concluída)", () => {
    const aposJoao = aplicarDecisao(pedidoNovo(), APROVAR, JOAO);
    const concluido = aplicarDecisao(aposJoao, APROVAR, AMANDA);
    expect(() => aplicarDecisao(concluido, APROVAR, AMANDA)).toThrow(DecisaoForaDeOrdem);
    expect(() => aplicarDecisao(concluido, REJEITAR, AMANDA)).toThrow(DecisaoForaDeOrdem);
  });

  it("pedido já REJEITADO não aceita mais decisões", () => {
    const rejeitado = aplicarDecisao(pedidoNovo(), REJEITAR, JOAO);
    expect(() => aplicarDecisao(rejeitado, APROVAR, AMANDA)).toThrow(DecisaoForaDeOrdem);
  });

  it("rejeitar fora da vez também é bloqueado", () => {
    expect(() => aplicarDecisao(pedidoNovo(), REJEITAR, AMANDA)).toThrow(DecisaoForaDeOrdem);
  });
});

describe("aplicarDecisao — conflito (duas decisões ao mesmo tempo)", () => {
  it("step atual já decidido mas stepAtual não avançou: outra decisão chegou antes", () => {
    const estadoVelho: EstadoAprovacao = {
      status: "PENDENTE",
      stepAtual: 0,
      cadeia: [{ ...pendente(0, JOAO), status: "APROVADA" }, pendente(1, AMANDA)],
    };
    expect(() => aplicarDecisao(estadoVelho, APROVAR, JOAO)).toThrow(ConflitoDeDecisao);
  });
});
