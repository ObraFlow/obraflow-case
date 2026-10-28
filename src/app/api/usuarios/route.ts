import { ok, tratarErros } from "@/app/api/_http";
import { listarUsuarios } from "@/server/services/cadastros";

/** GET /api/usuarios */
export function GET() {
  return tratarErros(async () => ok(await listarUsuarios()));
}
