import { z } from "zod";
import { getDatabase } from "@/lib/db";
import { ApiError, apiJson, parseQuery, readJson, withApi } from "@/lib/http";
import { createOrderSchema, orderQuerySchema } from "@/modules/orders/schemas";
import { createOrder, listOrders } from "@/modules/orders/service";

export function GET(request: Request) {
  return withApi(request, async (actorId) => apiJson(await listOrders(getDatabase(), actorId, parseQuery(request, orderQuerySchema))));
}

export function POST(request: Request) {
  return withApi(request, async (actorId) => {
    parseQuery(request, z.object({}).strict());
    const key = z.uuid().safeParse(request.headers.get("Idempotency-Key"));
    if (!key.success) throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Informe uma chave de idempotência UUID.");
    const input = await readJson(request, createOrderSchema);
    const result = await createOrder(getDatabase(), actorId, key.data, input);
    return apiJson(result.body, result.replayed ? 200 : 201, { Location: `/api/orders/${result.orderId}`, "Idempotency-Replayed": String(result.replayed) });
  });
}
