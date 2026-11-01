import { describe, expect, it } from "vitest";
import { impactoNoOrcamento, resumoOrcamento } from "./resumoOrcamento";

describe("resumoOrcamento", () => {
  it("soma aprovado e pendente e calcula o que sobra", () => {
    const resumo = resumoOrcamento({
      orcamentoCents: 10_000_000,
      aprovadoCents: 4_000_000,
      pendenteCents: 1_000_000,
    });
    expect(resumo.comprometidoCents).toBe(5_000_000);
    expect(resumo.disponivelCents).toBe(5_000_000);
    expect(resumo.percentualComprometido).toBe(50);
    expect(resumo.quaseNoLimite).toBe(false);
  });

  it("percentual arredonda para baixo: 99,97% não vira 100%", () => {
    const resumo = resumoOrcamento({
      orcamentoCents: 15_000_000,
      aprovadoCents: 14_995_200,
      pendenteCents: 0,
    });
    expect(resumo.percentualComprometido).toBe(99);
    expect(resumo.disponivelCents).toBe(4_800);
  });

  it("avisa a partir de 90% comprometido, comparando em inteiros", () => {
    const base = { orcamentoCents: 1_000_000, aprovadoCents: 0 };
    expect(resumoOrcamento({ ...base, pendenteCents: 899_999 }).quaseNoLimite).toBe(false);
    expect(resumoOrcamento({ ...base, pendenteCents: 900_000 }).quaseNoLimite).toBe(true);
  });

  it("acima do orçamento o disponível fica negativo e o percentual passa de 100", () => {
    const resumo = resumoOrcamento({
      orcamentoCents: 1_000_000,
      aprovadoCents: 1_200_000,
      pendenteCents: 0,
    });
    expect(resumo.disponivelCents).toBe(-200_000);
    expect(resumo.percentualComprometido).toBe(120);
    expect(resumo.quaseNoLimite).toBe(true);
  });

  it("sem orçamento não há disponível, percentual nem alerta", () => {
    const resumo = resumoOrcamento({ orcamentoCents: 0, aprovadoCents: 500, pendenteCents: 500 });
    expect(resumo.comprometidoCents).toBe(1000);
    expect(resumo.disponivelCents).toBeNull();
    expect(resumo.percentualComprometido).toBeNull();
    expect(resumo.quaseNoLimite).toBe(false);
  });
});

describe("impactoNoOrcamento", () => {
  const resumo = resumoOrcamento({
    orcamentoCents: 1_000_000,
    aprovadoCents: 600_000,
    pendenteCents: 200_000,
  });

  it("pedido que cabe: mostra o total com ele e nenhum excedente", () => {
    const impacto = impactoNoOrcamento(resumo, 100_000);
    expect(impacto.comprometidoAntesCents).toBe(800_000);
    expect(impacto.comEsteCents).toBe(900_000);
    expect(impacto.percentualComEste).toBe(90);
    expect(impacto.excedenteCents).toBe(0);
    expect(impacto.ultrapassa).toBe(false);
  });

  it("pedido que passa do orçamento: diz por quanto", () => {
    const impacto = impactoNoOrcamento(resumo, 350_000);
    expect(impacto.comEsteCents).toBe(1_150_000);
    expect(impacto.excedenteCents).toBe(150_000);
    expect(impacto.ultrapassa).toBe(true);
  });

  it("sem orçamento nunca ultrapassa", () => {
    const semOrcamento = resumoOrcamento({ orcamentoCents: 0, aprovadoCents: 0, pendenteCents: 0 });
    const impacto = impactoNoOrcamento(semOrcamento, 999_999);
    expect(impacto.percentualComEste).toBeNull();
    expect(impacto.ultrapassa).toBe(false);
  });
});
