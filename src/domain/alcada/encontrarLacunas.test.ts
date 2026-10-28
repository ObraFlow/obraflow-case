import { describe, expect, it } from "vitest";
import { encontrarLacunas } from "./encontrarLacunas";

describe("encontrarLacunas", () => {
  it("sem faixas, não lista nada (a tela mostra o estado vazio)", () => {
    expect(encontrarLacunas([])).toEqual([]);
  });

  it("faixas contíguas cobrindo tudo não têm lacuna", () => {
    expect(
      encontrarLacunas([
        { minCents: 0, maxCents: 1_000_000 },
        { minCents: 1_000_001, maxCents: null },
      ]),
    ).toEqual([]);
  });

  it("uma faixa aberta começando em zero cobre qualquer valor", () => {
    expect(encontrarLacunas([{ minCents: 0, maxCents: null }])).toEqual([]);
  });

  it("aponta o buraco antes da primeira faixa", () => {
    expect(encontrarLacunas([{ minCents: 500_00, maxCents: null }])).toEqual([
      { deCents: 0, ateCents: 499_99 },
    ]);
  });

  it("aponta o buraco entre duas faixas", () => {
    expect(
      encontrarLacunas([
        { minCents: 0, maxCents: 1_000_000 },
        { minCents: 2_000_000, maxCents: null },
      ]),
    ).toEqual([{ deCents: 1_000_001, ateCents: 1_999_999 }]);
  });

  it("aponta o buraco depois da última faixa com teto", () => {
    expect(encontrarLacunas([{ minCents: 0, maxCents: 1_000_000 }])).toEqual([
      { deCents: 1_000_001, ateCents: null },
    ]);
  });

  it("não considera lacuna quando o teto encosta no próximo mínimo", () => {
    expect(
      encontrarLacunas([
        { minCents: 0, maxCents: 999 },
        { minCents: 1_000, maxCents: null },
      ]),
    ).toEqual([]);
  });

  it("aceita faixas fora de ordem e lista as lacunas em ordem crescente", () => {
    expect(
      encontrarLacunas([
        { minCents: 3_000_000, maxCents: 4_000_000 },
        { minCents: 100, maxCents: 1_000_000 },
      ]),
    ).toEqual([
      { deCents: 0, ateCents: 99 },
      { deCents: 1_000_001, ateCents: 2_999_999 },
      { deCents: 4_000_001, ateCents: null },
    ]);
  });
});
