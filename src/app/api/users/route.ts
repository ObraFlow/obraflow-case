import { getDatabase } from "@/lib/db";
import { apiJson, parseQuery, readJson, withApi } from "@/lib/http";
import {
  createRegistry,
  listRegistry,
  noQuery,
  paginationQuery,
  registryInput,
} from "@/modules/registry/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return withApi(request, async () =>
    apiJson(await listRegistry(getDatabase(), "users", parseQuery(request, paginationQuery))),
  );
}
export async function POST(request: Request) {
  return withApi(request, async () => {
    parseQuery(request, noQuery);
    const data = await createRegistry(
      getDatabase(),
      "users",
      await readJson(request, registryInput),
    );
    return apiJson({ data }, 201, { Location: `/api/users/${data.id}` });
  });
}
