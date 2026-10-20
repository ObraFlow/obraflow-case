import { z } from "zod";

const environmentSchema = z.object({
  DATABASE_URL: z.url().refine((value) => {
    try {
      const url = new URL(value);
      return ["postgres:", "postgresql:"].includes(url.protocol) && url.pathname.length > 1;
    } catch {
      return false;
    }
  }, "Use uma URL PostgreSQL com banco definido."),
  LOG_LEVEL: z.enum(["silent", "error", "info"]).default("info"),
});

export function parseEnvironment(input: Record<string, string | undefined>) {
  const result = environmentSchema.safeParse(input);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(
      `Configuração de ambiente inválida: ${fields.join(", ")}. Consulte .env.example.`,
    );
  }
  return result.data;
}

export function getEnvironment() {
  return parseEnvironment(process.env);
}
