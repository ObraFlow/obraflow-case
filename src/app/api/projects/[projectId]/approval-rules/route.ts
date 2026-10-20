import { getDatabase } from "@/lib/db";
import { apiJson, parseId, parseQuery, readJson, withApi } from "@/lib/http";
import { noQuery } from "@/modules/registry/service";
import { approvalRulesInput } from "@/modules/approval-rules/schema";
import { getApprovalRules, replaceApprovalRules } from "@/modules/approval-rules/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string }> };
export async function GET(request: Request, context: Context) {
  return withApi(request, async () => {
    parseQuery(request, noQuery);
    const projectId = parseId((await context.params).projectId);
    return apiJson({ data: await getApprovalRules(getDatabase(), projectId) });
  });
}
export async function PUT(request: Request, context: Context) {
  return withApi(request, async () => {
    parseQuery(request, noQuery);
    const projectId = parseId((await context.params).projectId);
    const input = await readJson(request, approvalRulesInput);
    return apiJson({ data: await replaceApprovalRules(getDatabase(), projectId, input) });
  });
}
