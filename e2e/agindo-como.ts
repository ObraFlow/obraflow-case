import type { BrowserContext } from "@playwright/test";

/** Ids do seed (prisma/seed.ts): o TRUNCATE reinicia os autoincrements, então são fixos. */
export const JOAO = 1;
export const AMANDA = 2;
export const CARLA = 3;
export const BEATRIZ = 4;
export const RAFAEL = 5;

/**
 * Escolhe quem está "Agindo como" gravando o cookie direto no contexto. O cookie é httpOnly
 * (src/server/usuario-atual.ts), então o seletor do header seria o único outro caminho;
 * gravar direto é mais rápido e não depende da tela.
 */
export async function agirComo(context: BrowserContext, usuarioId: number): Promise<void> {
  await context.clearCookies({ name: "agindo-como" });
  await context.addCookies([
    {
      name: "agindo-como",
      value: String(usuarioId),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

/** Cabeçalho do POST /api/pedidos usado pelos specs que precisam de um pedido novo. */
export const JSON_HEADERS = { "Content-Type": "application/json" };
