import { describe, expect, it } from "vitest";
import { DomainError } from "./errors";
import { resolveRule } from "@/shared/approval";
import { buildChain, nextState } from "./approval-chain";

describe("resolveRule", () => {
  const rules = [
    { name: "até 100", upTo: 10_000 },
    { name: "até 500", upTo: 50_000 },
    { name: "sem teto", upTo: null },
  ];

  it("inclui o limite exato", () => {
    expect(resolveRule(rules, 10_000)?.name).toBe("até 100");
  });

  it("envia um centavo acima para a faixa seguinte", () => {
    expect(resolveRule(rules, 10_001)?.name).toBe("até 500");
  });

  it("usa a faixa sem teto quando aplicável", () => {
    expect(resolveRule(rules, 50_001)?.name).toBe("sem teto");
  });

  it("retorna undefined quando nenhuma faixa é aplicável", () => {
    expect(resolveRule([{ upTo: 10_000 }], 10_001)).toBeUndefined();
  });

  it("ordena as faixas sem modificar a entrada", () => {
    const unordered = [rules[2], rules[0], rules[1]];

    expect(resolveRule(unordered, 10_001)?.name).toBe("até 500");
    expect(unordered).toEqual([rules[2], rules[0], rules[1]]);
  });
});

describe("buildChain", () => {
  it("marca o primeiro passo como PENDING e os demais como WAITING", () => {
    expect(buildChain([10, 20, 30])).toEqual([
      { stepOrder: 1, approverId: 10, status: "PENDING" },
      { stepOrder: 2, approverId: 20, status: "WAITING" },
      { stepOrder: 3, approverId: 30, status: "WAITING" },
    ]);
  });
});

describe("nextState", () => {
  const steps = buildChain([10, 20, 30]);

  it("ativa o próximo passo após uma aprovação intermediária", () => {
    expect(nextState(steps, 10, "APPROVED")).toEqual({
      current: steps[0],
      orderStatus: "PENDING",
      currentStep: 2,
      skip: [],
      activate: 2,
    });
  });

  it("conclui o pedido após a aprovação final", () => {
    const finalStep = [
      { stepOrder: 1, approverId: 10, status: "APPROVED" as const },
      { stepOrder: 2, approverId: 20, status: "PENDING" as const },
    ];

    expect(nextState(finalStep, 20, "APPROVED")).toEqual({
      current: finalStep[1],
      orderStatus: "APPROVED",
      currentStep: null,
      skip: [],
      activate: null,
    });
  });

  it("rejeita e marca os passos restantes para skip", () => {
    expect(nextState(steps, 10, "REJECTED")).toEqual({
      current: steps[0],
      orderStatus: "REJECTED",
      currentStep: null,
      skip: [2, 3],
      activate: null,
    });
  });

  it("lança DomainError 403 para usuário fora da vez", () => {
    expect(() => nextState(steps, 20, "APPROVED")).toThrowError(
      new DomainError(403, "Não é a sua vez de decidir este pedido."),
    );
  });

  it("lança DomainError 409 sem passo pendente", () => {
    const completed = steps.map((step) => ({ ...step, status: "APPROVED" as const }));

    expect(() => nextState(completed, 10, "APPROVED")).toThrowError(
      new DomainError(409, "Este pedido não está mais aguardando decisão."),
    );
  });
});
