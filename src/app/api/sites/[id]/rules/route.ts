import { handle, json, parseId, readJson } from "@/lib/https";
import { rulesInput } from "@/lib/schemas";
import { listRules, replaceRules } from "@/server/services/rules";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req, { params }: Ctx) => json(await listRules(parseId((await params).id))));

export const PUT = handle(async (req, { params }: Ctx) => {
  const siteId = parseId((await params).id);
  return json(await replaceRules(siteId, rulesInput.parse(await readJson(req))));
});
