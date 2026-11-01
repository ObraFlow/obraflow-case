import { handle, json, parseId, requireUserId } from "@/lib/https";
import { decideOrder } from "@/server/services/orders";


export const POST = handle(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const id = parseId((await params).id);
  return json(await decideOrder(id, requireUserId(req), "APPROVED"));
});
