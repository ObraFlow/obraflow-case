import { describe, expect, it } from "vitest";
import { orderInput, rejectInput, rulesInput } from "./schemas";

const validOrder = {
  siteId: 1,
  supplierId: 2,
  orderDate: "2026-10-31",
  items: [{ description: "Cimento", quantity: 2, unit: "un", unitPriceCents: 1_000 }],
};

describe("orderInput", () => {
  it("rejeita pedido sem itens", () => {
    expect(orderInput.safeParse({ ...validOrder, items: [] }).success).toBe(false);
  });

  it("rejeita quantidade menor ou igual a zero", () => {
    expect(orderInput.safeParse({
      ...validOrder,
      items: [{ ...validOrder.items[0], quantity: 0 }],
    }).success).toBe(false);
    expect(orderInput.safeParse({
      ...validOrder,
      items: [{ ...validOrder.items[0], quantity: -1 }],
    }).success).toBe(false);
  });

  it("rejeita preço negativo", () => {
    expect(orderInput.safeParse({
      ...validOrder,
      items: [{ ...validOrder.items[0], unitPriceCents: -1 }],
    }).success).toBe(false);
  });

  it("rejeita datas que sofrem rollover", () => {
    expect(orderInput.safeParse({ ...validOrder, orderDate: "2026-02-31" }).success).toBe(false);
  });

  it("rejeita valores monetários e quantidades fora do limite", () => {
    expect(orderInput.safeParse({
      ...validOrder,
      items: [{ ...validOrder.items[0], quantity: 1_000_001 }],
    }).success).toBe(false);
    expect(orderInput.safeParse({
      ...validOrder,
      items: [{ ...validOrder.items[0], unitPriceCents: 2_000_000_001 }],
    }).success).toBe(false);
  });
});

describe("rejectInput", () => {
  it("rejeita motivo ausente ou em branco", () => {
    expect(rejectInput.safeParse({}).success).toBe(false);
    expect(rejectInput.safeParse({ reason: "   " }).success).toBe(false);
  });
});

describe("rulesInput", () => {
  it("rejeita limites duplicados", () => {
    expect(rulesInput.safeParse([
      { upTo: 10_000, approvers: [1] },
      { upTo: 10_000, approvers: [2] },
    ]).success).toBe(false);
  });

  it("rejeita mais de uma faixa sem limite", () => {
    expect(rulesInput.safeParse([
      { upTo: null, approvers: [1] },
      { upTo: null, approvers: [2] },
    ]).success).toBe(false);
  });

  it("rejeita aprovador repetido na mesma faixa", () => {
    expect(rulesInput.safeParse([
      { upTo: null, approvers: [1, 1] },
    ]).success).toBe(false);
  });

  it("rejeita limite acima do máximo monetário", () => {
    expect(rulesInput.safeParse([
      { upTo: 2_000_000_001, approvers: [1] },
    ]).success).toBe(false);
  });
});
