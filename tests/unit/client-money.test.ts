import { expect, it } from "vitest";
import { decimal, fixed, lineCents, money } from "@/lib/ui-types";
import { calculateOrder } from "@/modules/orders/calculation";

it.each([
  ["0.005", "1.00"],
  ["0.333", "10.00"],
  ["0.125", "0.04"],
  ["1000000.000", "0.01"],
  ["2.000", "0.00"],
  ["1.001", "99.99"],
])("mantém a prévia decimal alinhada ao servidor: %s × %s", (quantity, unitPrice) => {
  const server = calculateOrder([{ description: "Item", unit: "un", quantity, unitPrice }]);
  expect(lineCents(quantity, unitPrice)).toBe(decimal(server.items[0].lineTotal, 2));
});

it("aceita vírgula local e apresenta moeda sem ponto flutuante", () => {
  expect(fixed(decimal("12,500", 3)!, 3)).toBe("12.500");
  expect(money(1250050n)).toBe("R$ 12.500,50");
  expect(lineCents("-1", "1")).toBeNull();
  expect(lineCents("1", "0,001")).toBeNull();
});
