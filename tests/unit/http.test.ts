import { expect, it } from "vitest";
import { z } from "zod";
import { ApiError, parseQuery, readJson, withApi } from "@/lib/http";

it("recusa conteúdo excessivo mesmo quando Content-Length mente", async () => {
  const request = new Request("http://localhost/api/orders", { method: "POST", headers: { "Content-Type": "application/json", "Content-Length": "1" }, body: "x".repeat(262145) });
  await expect(readJson(request, z.unknown())).rejects.toMatchObject({ status: 413, code: "PAYLOAD_TOO_LARGE" });
});

it("distingue JSON malformado de mídia não suportada", async () => {
  await expect(readJson(new Request("http://localhost", { method: "POST", body: "{}" }), z.unknown())).rejects.toMatchObject({ status: 415 });
  await expect(readJson(new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }), z.unknown())).rejects.toMatchObject({ code: "INVALID_JSON" });
});

it("rejeita parâmetros repetidos e desconhecidos", () => {
  const schema = z.object({ page: z.string().optional() }).strict();
  expect(() => parseQuery(new Request("http://localhost/?page=1&page=2"), schema)).toThrow(ApiError);
  expect(() => parseQuery(new Request("http://localhost/?unexpected=1"), schema)).toThrow();
});

it("responde falta de identidade antes de conectar e correlaciona o erro", async () => {
  const response = await withApi(new Request("http://localhost/api/orders"), async () => { throw new Error("Não pode chegar ao handler"); });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error.code).toBe("DEMO_USER_REQUIRED");
  expect(body.error.requestId).toBe(response.headers.get("X-Request-Id"));
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});
