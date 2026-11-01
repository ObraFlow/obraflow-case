import { ok, tratarErros } from "@/app/api/_http";
import { listarFornecedores } from "@/server/services/cadastros";

/** GET /api/fornecedores */
export function GET() {
  return tratarErros(async () => ok(await listarFornecedores()));
}
