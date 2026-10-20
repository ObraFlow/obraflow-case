import { describe, expect, it } from "vitest";
import { calculateOrder } from "@/modules/orders/calculation";
import { createOrderSchema, decisionSchema, orderQuerySchema } from "@/modules/orders/schemas";

const input = {
  projectId: "11111111-1111-4111-8111-111111111111", supplierId: "22222222-2222-4222-8222-222222222222", orderDate: "2026-10-20",
  items: [{ description: " Item ", quantity: "0.005", unit: " un ", unitPrice: "1" }],
};

describe("contrato de pedidos", () => {
  it("normaliza textos, notas e decimais antes do hash", () => {
    const parsed = createOrderSchema.parse({ ...input, notes: "  " });
    expect(parsed.notes).toBeNull();
    expect(parsed.items[0]).toEqual({ description: "Item", quantity: "0.005", unit: "un", unitPrice: "1.00" });
    expect(createOrderSchema.parse({ ...input, items: [{ ...input.items[0], quantity: "0001.1", unitPrice: "0001.1" }] }).items[0]).toMatchObject({ quantity: "1.100", unitPrice: "1.10" });
  });
  it.each(["2026-02-29", "2026-04-31", "2026-13-01", "2026-1-01", "0000-01-01"])("recusa data civil inválida %s", (orderDate) => {
    expect(createOrderSchema.safeParse({ ...input, orderDate }).success).toBe(false);
  });
  it("aceita data de ano bissexto", () => {
    expect(createOrderSchema.safeParse({ ...input, orderDate: "2028-02-29" }).success).toBe(true);
  });
  it.each(["0", "0.000", "0.0001", "1e3", "1,5", "-1", "1000000.001"])("recusa quantidade %s", (quantity) => {
    expect(createOrderSchema.safeParse({ ...input, items: [{ ...input.items[0], quantity }] }).success).toBe(false);
  });
  it("recusa números exageradamente longos antes da conversão", () => {
    expect(createOrderSchema.safeParse({ ...input, items: [{ ...input.items[0], quantity: "1".repeat(20000) }] }).success).toBe(false);
  });
  it("recusa campos calculados e pedidos vazios", () => {
    expect(createOrderSchema.safeParse({ ...input, total: "1.00" }).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...input, items: [] }).success).toBe(false);
  });
  it("rejeição exige motivo e aprovação não aceita motivo", () => {
    expect(decisionSchema.safeParse({ expectedVersion: 1, outcome: "REJECT", reason: " " }).success).toBe(false);
    expect(decisionSchema.safeParse({ expectedVersion: 1, outcome: "APPROVE", reason: "qualquer" }).success).toBe(false);
    expect(decisionSchema.parse({ expectedVersion: 1, outcome: "REJECT", reason: "  Excesso  " })).toMatchObject({ reason: "Excesso" });
  });
  it("valida paginação, filtros e busca antes de executar SQL", () => {
    expect(orderQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20, mine: false });
    expect(orderQuerySchema.parse({ mine: "true", search: "aB12-" }).mine).toBe(true);
    expect(orderQuerySchema.safeParse({ search: "%" }).success).toBe(false);
    expect(orderQuerySchema.safeParse({ pageSize: "101" }).success).toBe(false);
    expect(orderQuerySchema.safeParse({ unknown: "value" }).success).toBe(false);
  });
});

describe("aritmética monetária", () => {
  it("arredonda cada item HALF_UP antes de somar", () => {
    const item = createOrderSchema.parse(input).items[0];
    const result = calculateOrder([item, item]);
    expect(result.total.toFixed(2)).toBe("0.02");
    expect(result.items.map((entry) => entry.lineTotal)).toEqual(["0.01", "0.01"]);
  });
  it("aceita total zero e não usa ponto flutuante na multiplicação", () => {
    const parsed = createOrderSchema.parse(input);
    expect(calculateOrder([{ ...parsed.items[0], quantity: "0.333", unitPrice: "10.00" }]).total.toFixed(2)).toBe("3.33");
    expect(calculateOrder([{ ...parsed.items[0], unitPrice: "0.00" }]).total.toFixed(2)).toBe("0.00");
  });
  it("recusa overflow de item e da soma, aceita limite exato", () => {
    const item = createOrderSchema.parse(input).items[0];
    const limit = { ...item, quantity: "100.000", unitPrice: "1000000.00" };
    expect(calculateOrder([limit]).total.toFixed(2)).toBe("100000000.00");
    expect(() => calculateOrder([limit, item])).toThrow("total do pedido");
    expect(() => calculateOrder([{ ...limit, quantity: "100.001" }])).toThrow("total do item");
  });
});
