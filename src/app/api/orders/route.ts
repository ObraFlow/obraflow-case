import { handle, json, readJson } from "@/lib/https";
import { orderInput } from "@/lib/schemas";
import { createOrder, listOrders } from "@/server/services/orders";

export const dynamic = "force-dynamic";

export const GET = handle(async () => json(await listOrders()));

export const POST = handle(async (req) => {
  const input = orderInput.parse(await readJson(req));
  const order = await createOrder(input);
  return json({ id: order.id }, 201);
});
