import { describe, expect, it } from "vitest";
import { parseEnvironment } from "@/lib/env";

describe("configuração de ambiente", () => {
  it("rejeita configuração ausente sem exibir valores sensíveis", () => {
    expect(() => parseEnvironment({ DATABASE_URL: "segredo-que-nao-deve-aparecer" })).toThrow("Configuração de ambiente inválida: DATABASE_URL.");
    expect(() => parseEnvironment({ DATABASE_URL: "segredo-que-nao-deve-aparecer" })).not.toThrow("segredo-que-nao-deve-aparecer");
  });

  it.each(["https://example.com/data", "postgresql://localhost/"])("recusa banco não PostgreSQL ou sem nome: %s", (DATABASE_URL) => {
    expect(() => parseEnvironment({ DATABASE_URL })).toThrow();
  });

  it("aceita PostgreSQL e aplica nível de log padrão", () => {
    expect(parseEnvironment({ DATABASE_URL: "postgresql://localhost/obraflow" }).LOG_LEVEL).toBe("info");
  });
});
