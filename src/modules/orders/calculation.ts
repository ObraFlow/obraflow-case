import { Prisma } from "@/generated/prisma/client";
import { ApiError } from "@/lib/http";
import type { CreateOrderInput } from "./schemas";

export function calculateOrder(items: CreateOrderInput["items"]) {
  let total = new Prisma.Decimal(0);
  const calculated = items.map((item, index) => {
    const lineTotal = new Prisma.Decimal(item.quantity).mul(item.unitPrice).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    if (lineTotal.gt("100000000")) throw new ApiError(400, "VALIDATION_ERROR", "O total do item excede o limite.", [{ path: `items.${index}`, message: "Máximo de R$ 100.000.000,00 por item." }]);
    total = total.add(lineTotal);
    return { ...item, position: index + 1, lineTotal: lineTotal.toFixed(2) };
  });
  if (total.gt("100000000")) throw new ApiError(400, "VALIDATION_ERROR", "O total do pedido excede o limite.", [{ path: "items", message: "Máximo de R$ 100.000.000,00 por pedido." }]);
  return { items: calculated, total };
}
