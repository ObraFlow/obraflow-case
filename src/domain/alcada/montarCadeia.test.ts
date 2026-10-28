import { describe, expect, it } from "vitest";
import { FaixaInvalida } from "../erros";
import { montarCadeia } from "./montarCadeia";
import type { FaixaAlcada } from "./tipos";

describe("montarCadeia", () => {
  it("faixa com um nível vira cadeia de uma aprovação pendente", () => {
    const faixa: FaixaAlcada = {
      id: 1,
      minCents: 0,
      maxCents: null,
      niveis: [{ ordem: 0, usuarioId: 7 }],
    };
    expect(montarCadeia(faixa)).toEqual([
      { ordem: 0, aprovadorId: 7, status: "PENDENTE", motivo: null },
    ]);
  });

  it("mantém a ordem dos níveis (João antes de Amanda)", () => {
    const faixa: FaixaAlcada = {
      id: 2,
      minCents: 0,
      maxCents: null,
      niveis: [
        { ordem: 0, usuarioId: 1 },
        { ordem: 1, usuarioId: 2 },
      ],
    };
    expect(montarCadeia(faixa).map((a) => a.aprovadorId)).toEqual([1, 2]);
  });

  it("ordena por `ordem` mesmo se os níveis chegarem embaralhados", () => {
    const faixa: FaixaAlcada = {
      id: 2,
      minCents: 0,
      maxCents: null,
      niveis: [
        { ordem: 2, usuarioId: 3 },
        { ordem: 0, usuarioId: 1 },
        { ordem: 1, usuarioId: 2 },
      ],
    };
    expect(montarCadeia(faixa).map((a) => a.aprovadorId)).toEqual([1, 2, 3]);
  });

  it("renumera de 0 a n-1 mesmo se a regra tiver ordens com buraco (0, 5, 9)", () => {
    const faixa: FaixaAlcada = {
      id: 2,
      minCents: 0,
      maxCents: null,
      niveis: [
        { ordem: 0, usuarioId: 1 },
        { ordem: 5, usuarioId: 2 },
        { ordem: 9, usuarioId: 3 },
      ],
    };
    expect(montarCadeia(faixa).map((a) => a.ordem)).toEqual([0, 1, 2]);
  });

  it("todas as aprovações nascem PENDENTE e sem motivo", () => {
    const faixa: FaixaAlcada = {
      id: 2,
      minCents: 0,
      maxCents: null,
      niveis: [
        { ordem: 0, usuarioId: 1 },
        { ordem: 1, usuarioId: 2 },
      ],
    };
    for (const aprovacao of montarCadeia(faixa)) {
      expect(aprovacao.status).toBe("PENDENTE");
      expect(aprovacao.motivo).toBeNull();
    }
  });

  it("não altera a faixa recebida", () => {
    const niveis = [
      { ordem: 1, usuarioId: 2 },
      { ordem: 0, usuarioId: 1 },
    ];
    const faixa: FaixaAlcada = { id: 2, minCents: 0, maxCents: null, niveis };
    montarCadeia(faixa);
    expect(faixa.niveis).toBe(niveis);
    expect(niveis[0].ordem).toBe(1);
  });

  it("faixa sem níveis é erro de domínio: pedido não pode nascer sem aprovador", () => {
    const faixa: FaixaAlcada = { id: 3, minCents: 0, maxCents: null, niveis: [] };
    expect(() => montarCadeia(faixa)).toThrow(FaixaInvalida);
  });
});
