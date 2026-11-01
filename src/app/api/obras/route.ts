import { ok, tratarErros } from "@/app/api/_http";
import { listarObras } from "@/server/services/cadastros";

/** GET /api/obras */
export function GET() {
  return tratarErros(async () => ok(await listarObras()));
}
