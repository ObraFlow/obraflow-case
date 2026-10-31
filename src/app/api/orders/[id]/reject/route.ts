import { handle, json, parseId, readJson, requireUserId } from "@/lib/https";
import { rejectInput } from "@/lib/schemas";
import { decideOrder } from "@/server/services/orders";


export const POST = handle(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const id = parseId((await params).id);
  const { reason } = rejectInput.parse(await readJson(req));
  return json(await decideOrder(id, requireUserId(req), "REJECTED", reason));
});
