import { getDatabase } from "@/lib/db";
import { apiJson, parseId, parseQuery, withApi } from "@/lib/http";
import { getRegistry, noQuery } from "@/modules/registry/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  return withApi(request, async () => {
    parseQuery(request, noQuery);
    const id = parseId((await context.params).projectId);
    return apiJson({ data: await getRegistry(getDatabase(), "projects", id) });
  });
}
