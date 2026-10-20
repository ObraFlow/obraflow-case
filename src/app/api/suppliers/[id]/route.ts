import { getDatabase } from "@/lib/db";
import { apiJson, parseId, parseQuery, withApi } from "@/lib/http";
import { getRegistry, noQuery } from "@/modules/registry/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApi(request, async () => {
    parseQuery(request, noQuery);
    const id = parseId((await context.params).id);
    return apiJson({ data: await getRegistry(getDatabase(), "suppliers", id) });
  });
}
