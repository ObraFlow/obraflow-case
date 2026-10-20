import { describe, expect, it } from "vitest";
import { z } from "zod";
import { approvalRulesInput } from "@/modules/approval-rules/schema";
import { paginationQuery, registryInput } from "@/modules/registry/service";
import { ApiError, parseId, parseQuery, readJson, withApi } from "@/lib/http";

const amanda = "22222222-2222-4222-8222-222222222222";
const joao = "33333333-3333-4333-8333-333333333333";
const band = (upperLimit: string | null, approverIds = [amanda]) => ({ upperLimit, approverIds });

describe("contrato de configuração de alçadas", () => {
  it("aceita vazio, zero, limites inclusivos e cadeia completa", () => {
    expect(approvalRulesInput.parse({ expectedVersion: 0, bands: [] }).bands).toEqual([]);
    expect(approvalRulesInput.parse({ expectedVersion: 1, bands: [band("0"), band("100000000.00", [amanda, joao]), band(null)] }).bands).toHaveLength(3);
  });
  it.each(["-1", "1e2", "1,00", "0.001", "100000000.01", "NaN", "Infinity", ""]) ("recusa teto inválido %s", (upperLimit) => {
    expect(approvalRulesInput.safeParse({ expectedVersion: 0, bands: [band(upperLimit)] }).success).toBe(false);
  });
  it("recusa igualdade decimal e tetos em ordem inversa", () => {
    for (const bands of [[band("1"), band("1.00")], [band("10"), band("9.99")]]) {
      expect(approvalRulesInput.safeParse({ expectedVersion: 0, bands }).success).toBe(false);
    }
  });
  it("recusa faixa ilimitada fora do fim, cadeia vazia ou pessoa duplicada", () => {
    for (const bands of [[band(null), band("1")], [band(null), band(null)], [band("1", [])], [band("1", [amanda, amanda])]]) {
      expect(approvalRulesInput.safeParse({ expectedVersion: 0, bands }).success).toBe(false);
    }
  });
  it("recusa campos desconhecidos e versão fracionária", () => {
    expect(approvalRulesInput.safeParse({ expectedVersion: 1.5, bands: [] }).success).toBe(false);
    expect(approvalRulesInput.safeParse({ expectedVersion: 0, bands: [], admin: true }).success).toBe(false);
  });
  it("mantém ordem e normaliza UUID para detectar duplicidade", () => {
    const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    expect(approvalRulesInput.safeParse({ expectedVersion: 0, bands: [band(null, [id, id.toUpperCase()])] }).success).toBe(false);
    expect(approvalRulesInput.parse({ expectedVersion: 0, bands: [band(null, [joao, amanda])] }).bands[0].approverIds).toEqual([joao, amanda]);
  });
});

describe("entrada HTTP e cadastros", () => {
  it("aplica trim e limites do cadastro", () => {
    expect(registryInput.parse({ name: " Obra Centro " })).toEqual({ name: "Obra Centro" });
    expect(registryInput.safeParse({ name: "  " }).success).toBe(false);
    expect(registryInput.safeParse({ name: "x".repeat(121) }).success).toBe(false);
  });
  it("pagina com defaults e rejeita query desconhecida, repetida e valores vazios", () => {
    expect(parseQuery(new Request("http://local/api/projects"), paginationQuery)).toEqual({ page: 1, pageSize: 20 });
    for (const query of ["page=1&page=2", "extra=true", "page=", "page=1.5", "pageSize=101", "page=9007199254740991&pageSize=100"]) {
      expect(() => parseQuery(new Request(`http://local/api/projects?${query}`), paginationQuery)).toThrow();
    }
  });
  it("valida UUID de recurso", () => {
    expect(parseId(amanda)).toBe(amanda);
    expect(() => parseId("invalid")).toThrow();
  });
  it("lê JSON estrito e recusa content-type ou JSON malformado", async () => {
    const request = (body: string, type = "application/json") => new Request("http://local/api", { method: "POST", body, headers: { "Content-Type": type } });
    expect(await readJson(request('{"name":"  Amanda "}'), registryInput)).toEqual({ name: "Amanda" });
    await expect(readJson(request("{}", "text/plain"), registryInput)).rejects.toMatchObject({ status: 415 });
    await expect(readJson(request("{"), registryInput)).rejects.toMatchObject({ code: "INVALID_JSON" });
    await expect(readJson(request('{"name":"Amanda","role":"admin"}'), registryInput)).rejects.toBeInstanceOf(z.ZodError);
  });
  it("limita bytes efetivamente lidos mesmo sem Content-Length", async () => {
    const request = new Request("http://local/api", { method: "POST", body: " ".repeat(256 * 1024 + 1), headers: { "Content-Type": "application/json" } });
    await expect(readJson(request, z.unknown())).rejects.toMatchObject({ status: 413, code: "PAYLOAD_TOO_LARGE" });
  });
  it("normaliza identidade ausente e sempre responde com requestId e no-store", async () => {
    const response = await withApi(new Request("http://local/api"), async () => { throw new Error("handler não deve executar"); });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("DEMO_USER_REQUIRED");
    expect(body.error.fieldErrors).toEqual([]);
    expect(body.error.requestId).toBe(response.headers.get("X-Request-Id"));
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(new ApiError(409, "CONFLICT", "Conflito").fieldErrors).toEqual([]);
  });
});
