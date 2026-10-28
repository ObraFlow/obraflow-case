import { describe, expect, it } from "vitest";
import { FaixaInvalida, FaixaSobreposta } from "../erros";
import type { NivelAlcada } from "./tipos";
import { validarFaixas, validarLimites, type FaixaParaValidar } from "./validarFaixas";

const UM_NIVEL: NivelAlcada[] = [{ ordem: 0, usuarioId: 1 }];

function faixa(
  minCents: number,
  maxCents: number | null,
  id: number | null = null,
  rotulo?: string,
): FaixaParaValidar {
  return { id, minCents, maxCents, niveis: UM_NIVEL, rotulo };
}

describe("validarLimites", () => {
  it("aceita faixa fechada com mínimo zero", () => {
    expect(() => validarLimites(faixa(0, 1_000_000))).not.toThrow();
  });

  it("aceita faixa aberta (sem teto)", () => {
    expect(() => validarLimites(faixa(1_000_001, null))).not.toThrow();
  });

  it("aceita mínimo igual ao máximo (faixa de um único valor)", () => {
    expect(() => validarLimites(faixa(500, 500))).not.toThrow();
  });

  it("rejeita mínimo negativo", () => {
    expect(() => validarLimites(faixa(-1, 100))).toThrow(FaixaInvalida);
  });

  it("rejeita teto abaixo do mínimo", () => {
    expect(() => validarLimites(faixa(1_000, 999))).toThrow(FaixaInvalida);
  });

  it("rejeita centavos não inteiros", () => {
    expect(() => validarLimites(faixa(10.5, 100))).toThrow(FaixaInvalida);
  });

  it("rejeita faixa sem aprovadores", () => {
    expect(() => validarLimites({ ...faixa(0, 100), niveis: [] })).toThrow(FaixaInvalida);
  });

  it("rejeita o mesmo aprovador duas vezes na faixa", () => {
    const niveis = [
      { ordem: 0, usuarioId: 1 },
      { ordem: 1, usuarioId: 1 },
    ];
    expect(() => validarLimites({ ...faixa(0, 100), niveis })).toThrow(/mesmo aprovador/);
  });

  it("rejeita dois aprovadores na mesma posição", () => {
    const niveis = [
      { ordem: 0, usuarioId: 1 },
      { ordem: 0, usuarioId: 2 },
    ];
    expect(() => validarLimites({ ...faixa(0, 100), niveis })).toThrow(/mesma posição/);
  });

  it("aceita vários aprovadores distintos em posições distintas", () => {
    const niveis = [
      { ordem: 0, usuarioId: 1 },
      { ordem: 1, usuarioId: 2 },
      { ordem: 2, usuarioId: 3 },
    ];
    expect(() => validarLimites({ ...faixa(0, null), niveis })).not.toThrow();
  });
});

describe("validarFaixas (sobreposição)", () => {
  it("aceita as duas faixas do enunciado, encostadas (teto 10.000,00 e mínimo 10.000,01)", () => {
    expect(() => validarFaixas([faixa(0, 1_000_000, 1), faixa(1_000_001, null, 2)])).not.toThrow();
  });

  it("aceita uma única faixa aberta cobrindo tudo", () => {
    expect(() => validarFaixas([faixa(0, null, 1)])).not.toThrow();
  });

  it("aceita buraco entre faixas (valor sem faixa é tratado na criação do pedido)", () => {
    expect(() => validarFaixas([faixa(0, 500_000, 1), faixa(1_000_001, null, 2)])).not.toThrow();
  });

  it("aceita lista vazia", () => {
    expect(() => validarFaixas([])).not.toThrow();
  });

  it("rejeita teto igual ao mínimo da seguinte: o valor exato cairia nas duas", () => {
    expect(() => validarFaixas([faixa(0, 1_000_000, 1), faixa(1_000_000, null, 2)])).toThrow(
      FaixaSobreposta,
    );
  });

  it("rejeita faixa nova dentro de uma faixa existente", () => {
    expect(() => validarFaixas([faixa(0, 1_000_000, 1), faixa(200_000, 300_000, null)])).toThrow(
      FaixaSobreposta,
    );
  });

  it("rejeita duas faixas abertas", () => {
    expect(() => validarFaixas([faixa(0, null, 1), faixa(5_000_000, null, 2)])).toThrow(
      FaixaSobreposta,
    );
  });

  it("rejeita faixa aberta que começa antes do teto de uma fechada", () => {
    expect(() => validarFaixas([faixa(0, 1_000_000, 1), faixa(900_000, null, 2)])).toThrow(
      FaixaSobreposta,
    );
  });

  it("não depende da ordem em que as faixas chegam", () => {
    expect(() => validarFaixas([faixa(1_000_001, null, 2), faixa(0, 1_000_000, 1)])).not.toThrow();
    expect(() => validarFaixas([faixa(900_000, null, 2), faixa(0, 1_000_000, 1)])).toThrow(
      FaixaSobreposta,
    );
  });

  it("valida limites de cada faixa antes de olhar sobreposição", () => {
    expect(() => validarFaixas([faixa(0, 100, 1), faixa(500, 400, 2)])).toThrow(FaixaInvalida);
  });

  it("a mensagem cita a faixa já cadastrada com que a nova conflita", () => {
    const existente = faixa(0, 1_000_000, 1, "até R$ 10.000,00");
    const nova = faixa(500_000, null, null);
    expect(() => validarFaixas([existente, nova])).toThrow("sobrepõe à faixa até R$ 10.000,00");
  });

  it("sem rótulo, a mensagem ainda é compreensível", () => {
    expect(() => validarFaixas([faixa(0, 1_000_000, 1), faixa(500_000, null, null)])).toThrow(
      "outra faixa já cadastrada",
    );
  });
});
