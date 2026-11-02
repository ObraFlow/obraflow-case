import { expect, it } from "vitest";
import { checkReadiness } from "@/lib/health";

it("indica prontidão somente quando a dependência responde", async () => {
  await expect(checkReadiness(async () => ({ id: "project" }))).resolves.toEqual({ ready: true });
});

it("indica indisponibilidade sem expor erro de conexão ou credenciais", async () => {
  await expect(
    checkReadiness(async () => {
      throw new Error("postgresql://user:secret@private/database");
    }),
  ).resolves.toEqual({ ready: false });
});
