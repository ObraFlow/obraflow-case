import { describe, expect, it } from "vitest";
import { PrecoInvalido, QuantidadeInvalida, ValorExcedeLimite } from "../erros";
import {
  MAX_CENTS,
  calcularTotais,
  calcularTotalItemCents,
  quantidadeParaMilesimos,
} from "./calcularTotais";

describe("quantidadeParaMilesimos", () => {
  it("inteiro", () => {
    expect(quantidadeParaMilesimos("150")).toBe(150_000);
  });

  it("vírgula como separador decimal (teclado brasileiro)", () => {
    expect(quantidadeParaMilesimos("2,5")).toBe(2_500);
  });

  it("ponto como separador decimal (vem do banco como string)", () => {
    expect(quantidadeParaMilesimos("0.750")).toBe(750);
  });

  it("aceita espaços nas pontas", () => {
    expect(quantidadeParaMilesimos(" 12 ")).toBe(12_000);
  });

  it("aceita o máximo do Decimal(12,3): 999.999.999,999", () => {
    expect(quantidadeParaMilesimos("999999999,999")).toBe(999_999_999_999);
  });

  it("rejeita vazio, texto, negativo, zero, mais de 3 casas e mais de 9 dígitos inteiros", () => {
    for (const invalido of [
      "",
      "abc",
      "-1",
      "0",
      "0,000",
      "1.0005",
      "1,2,3",
      "1e3",
      "1000000000",
    ]) {
      expect(() => quantidadeParaMilesimos(invalido), invalido).toThrow(QuantidadeInvalida);
    }
  });
});

describe("calcularTotalItemCents", () => {
  it("150 sacos × R$ 34,90 = R$ 5.235,00", () => {
    expect(calcularTotalItemCents({ quantidade: "150", precoUnitarioCents: 3_490 })).toBe(523_500);
  });

  it("2,5 m³ × R$ 10,99 = R$ 27,48 (27,475 arredonda para cima)", () => {
    expect(calcularTotalItemCents({ quantidade: "2,5", precoUnitarioCents: 1_099 })).toBe(2_748);
  });

  it("1,005 × R$ 1,00 = R$ 1,01 (em float daria R$ 1,00)", () => {
    expect(calcularTotalItemCents({ quantidade: "1,005", precoUnitarioCents: 100 })).toBe(101);
  });

  it("0,333 × R$ 10,00 = R$ 3,33", () => {
    expect(calcularTotalItemCents({ quantidade: "0,333", precoUnitarioCents: 1_000 })).toBe(333);
  });

  it("preço zero é permitido (item bonificado) e dá total zero", () => {
    expect(calcularTotalItemCents({ quantidade: "10", precoUnitarioCents: 0 })).toBe(0);
  });

  it("preço negativo ou não inteiro é PrecoInvalido, não QuantidadeInvalida", () => {
    expect(() => calcularTotalItemCents({ quantidade: "1", precoUnitarioCents: -1 })).toThrow(
      PrecoInvalido,
    );
    expect(() => calcularTotalItemCents({ quantidade: "1", precoUnitarioCents: 10.5 })).toThrow(
      PrecoInvalido,
    );
  });

  it("valores grandes de obra continuam exatos (2.400 kg × R$ 8,90 = R$ 21.360,00)", () => {
    expect(calcularTotalItemCents({ quantidade: "2400", precoUnitarioCents: 890 })).toBe(2_136_000);
  });

  it("total do item no limite do Int (R$ 21.474.836,47) passa", () => {
    expect(calcularTotalItemCents({ quantidade: "1", precoUnitarioCents: MAX_CENTS })).toBe(
      MAX_CENTS,
    );
  });

  it("total do item acima do Int de 32 bits é erro de domínio, não erro do banco", () => {
    expect(() =>
      calcularTotalItemCents({ quantidade: "2", precoUnitarioCents: MAX_CENTS }),
    ).toThrow(ValorExcedeLimite);
    expect(() =>
      calcularTotalItemCents({ quantidade: "1", precoUnitarioCents: MAX_CENTS + 1 }),
    ).toThrow(ValorExcedeLimite);
  });
});

describe("calcularTotais", () => {
  it("soma os totais dos itens, já arredondados, sem arredondar de novo", () => {
    const totais = calcularTotais([
      { quantidade: "2,5", precoUnitarioCents: 1_099 }, // 2.748
      { quantidade: "2,5", precoUnitarioCents: 1_099 }, // 2.748
    ]);
    expect(totais.totaisItensCents).toEqual([2_748, 2_748]);
    // Se somasse antes de arredondar daria 5.495; a regra é arredondar por item.
    expect(totais.totalPedidoCents).toBe(5_496);
  });

  it("pedido do seed #1: cimento + areia + brita = R$ 7.800,00", () => {
    const totais = calcularTotais([
      { quantidade: "150", precoUnitarioCents: 3_490 },
      { quantidade: "12", precoUnitarioCents: 14_500 },
      { quantidade: "5", precoUnitarioCents: 16_500 },
    ]);
    expect(totais.totaisItensCents).toEqual([523_500, 174_000, 82_500]);
    expect(totais.totalPedidoCents).toBe(780_000);
  });

  it("lista vazia dá total zero (o schema Zod é quem exige ao menos um item)", () => {
    expect(calcularTotais([])).toEqual({ totaisItensCents: [], totalPedidoCents: 0 });
  });

  it("um item inválido derruba o cálculo inteiro", () => {
    expect(() =>
      calcularTotais([
        { quantidade: "1", precoUnitarioCents: 100 },
        { quantidade: "x", precoUnitarioCents: 100 },
      ]),
    ).toThrow(QuantidadeInvalida);
  });

  it("itens válidos cuja soma passa do Int de 32 bits é erro de domínio", () => {
    expect(() =>
      calcularTotais([
        { quantidade: "1", precoUnitarioCents: MAX_CENTS },
        { quantidade: "1", precoUnitarioCents: 1 },
      ]),
    ).toThrow(ValorExcedeLimite);
  });
});
