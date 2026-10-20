import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/db";
import { checkReadiness } from "@/lib/health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const result = await checkReadiness(async () => {
    // Uma leitura do schema detecta banco acessível sem migrações.
    await getDatabase().project.findFirst({ select: { id: true } });
  });
  if (!result.ready && process.env.LOG_LEVEL !== "silent") {
    console.error(
      JSON.stringify({
        level: "error",
        event: "readiness_failed",
        requestId,
        durationMs: Date.now() - startedAt,
      }),
    );
  }
  return Response.json(
    { status: result.ready ? "ready" : "unavailable" },
    {
      status: result.ready ? 200 : 503,
      headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
    },
  );
}
