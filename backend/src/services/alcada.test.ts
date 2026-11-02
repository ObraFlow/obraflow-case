import { describe, expect, it } from "vitest";
import { escolherFaixa, proximoEstado } from "./alcada";

// as mesmas faixas do Edifício Sol Nascente no seed. Deixei fora de ordem de propósito
const faixasSol = [
  { idRegra: 3, idObra: 1, valorMaximoCentavos: null },
  { idRegra: 1, idObra: 1, valorMaximoCentavos: 500000 },
  { idRegra: 2, idObra: 1, valorMaximoCentavos: 2000000 },
];

describe("escolherFaixa", () => {
  it("escolhe a menor faixa em que o valor cabe", () => {
    expect(escolherFaixa(faixasSol, 320000)?.idRegra).toBe(1);
    expect(escolherFaixa(faixasSol, 1250000)?.idRegra).toBe(2);
  });

  it("valor igual ao teto ainda cabe na faixa", () => {
    expect(escolherFaixa(faixasSol, 500000)?.idRegra).toBe(1);
  });

  it("acima de todos os tetos, cai na faixa sem teto", () => {
    expect(escolherFaixa(faixasSol, 5000000)?.idRegra).toBe(3);
  });

  it("sem faixa sem teto, valor alto demais não tem regra", () => {
    const soComTeto = faixasSol.filter((f) => f.valorMaximoCentavos !== null);
    expect(escolherFaixa(soComTeto, 5000000)).toBeNull();
  });

  it("obra sem nenhuma faixa não tem regra", () => {
    expect(escolherFaixa([], 10000)).toBeNull();
  });
});

describe("proximoEstado", () => {
  it("aprovação no meio da fila passa a vez para o próximo", () => {
    expect(proximoEstado(1, 2, "APROVADO")).toEqual({ status: "PENDENTE", etapaAtual: 2 });
  });

  it("aprovação do último da fila conclui o pedido", () => {
    expect(proximoEstado(2, 2, "APROVADO")).toEqual({ status: "APROVADO", etapaAtual: null });
  });

  it("pedido com um aprovador só é aprovado na primeira decisão", () => {
    expect(proximoEstado(1, 1, "APROVADO")).toEqual({ status: "APROVADO", etapaAtual: null });
  });

  it("rejeição encerra o pedido na hora, mesmo no começo da fila", () => {
    expect(proximoEstado(1, 3, "REJEITADO")).toEqual({ status: "REJEITADO", etapaAtual: null });
  });
});