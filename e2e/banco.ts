import { execSync } from "node:child_process";

/**
 * Volta o banco ao estado do seed (ids e situações conhecidos pelos specs). Cada spec chama
 * em `beforeAll`, para não depender da ordem dos arquivos nem do que o spec anterior fez.
 */
export function reiniciarBanco(): void {
  execSync("npx prisma db seed", { stdio: "pipe" });
}
