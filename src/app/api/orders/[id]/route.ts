import { getDatabase } from "@/lib/db";
import { z } from "zod";
import { apiJson, parseId, parseQuery, withApi } from "@/lib/http";
import { getOrder } from "@/modules/orders/service";

export function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApi(request, async (actorId) => {
    parseQuery(request, z.object({}).strict());
    return apiJson(await getOrder(getDatabase(), parseId((await context.params).id), actorId));
  });
}
