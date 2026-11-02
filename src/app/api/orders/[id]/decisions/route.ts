import { getDatabase } from "@/lib/db";
import { z } from "zod";
import { apiJson, parseId, parseQuery, readJson, withApi } from "@/lib/http";
import { decisionSchema } from "@/modules/orders/schemas";
import { decideOrder } from "@/modules/orders/service";

export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApi(request, async (actorId) => {
    parseQuery(request, z.object({}).strict());
    const id = parseId((await context.params).id);
    return apiJson(
      await decideOrder(getDatabase(), id, actorId, await readJson(request, decisionSchema)),
    );
  });
}
