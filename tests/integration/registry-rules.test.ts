import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { createDatabaseClient } from "@/lib/database-client";
import { ApiError } from "@/lib/http";
import { createRegistry, getRegistry, listRegistry } from "@/modules/registry/service";
import { getApprovalRules, replaceApprovalRules } from "@/modules/approval-rules/service";

if (process.env.TEST_DATABASE_GUARDED !== "true" || process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) {
  throw new Error("Execute integrações por npm run test:integration para proteger o banco.");
}
const database = createDatabaseClient(process.env.TEST_DATABASE_URL!);
let projectId: string;
let firstUser: string;
let secondUser: string;
let supplierId: string;

beforeAll(async () => {
  projectId = (await createRegistry(database, "projects", { name: `Test ${randomUUID()}` })).id;
  firstUser = (await createRegistry(database, "users", { name: " Test A " })).id;
  secondUser = (await createRegistry(database, "users", { name: "Test B" })).id;
  supplierId = (await createRegistry(database, "suppliers", { name: "Test Supplier" })).id;
});
afterAll(async () => {
  if (projectId) {
    await database.approvalBand.deleteMany({ where: { projectId } });
    await database.project.delete({ where: { id: projectId } });
  }
  await database.user.deleteMany({ where: { id: { in: [firstUser, secondUser].filter(Boolean) } } });
  if (supplierId) await database.supplier.delete({ where: { id: supplierId } });
  await database.$disconnect();
});

describe("cadastros e configuração persistida", () => {
  it("cria, consulta e pagina os três cadastros sem vazar campos internos", async () => {
    for (const [kind, id] of [["projects", projectId], ["users", firstUser], ["suppliers", supplierId]] as const) {
      expect(Object.keys(await getRegistry(database, kind, id)).sort()).toEqual(["createdAt", "id", "name"]);
      const list = await listRegistry(database, kind, { page: 1, pageSize: 2 });
      expect(list.data.length).toBe(Math.min(2, list.pagination.total));
      expect(list.pagination.totalPages).toBe(Math.ceil(list.pagination.total / 2));
    }
    expect((await getRegistry(database, "users", firstUser)).name).toBe("Test A");
    await expect(getRegistry(database, "projects", randomUUID())).rejects.toMatchObject({ status: 404, code: "PROJECT_NOT_FOUND" });
  });
  it("retorna configuração inicial vazia e substitui faixas mantendo a sequência", async () => {
    expect(await getApprovalRules(database, projectId)).toEqual({ projectId, version: 0, bands: [] });
    const result = await replaceApprovalRules(database, projectId, { expectedVersion: 0, bands: [
      { upperLimit: "10000", approverIds: [firstUser] },
      { upperLimit: null, approverIds: [secondUser, firstUser] },
    ] });
    expect(result.version).toBe(1);
    expect(result.bands[0].upperLimit).toBe("10000.00");
    expect(result.bands[1].approvers.map(({ id }) => id)).toEqual([secondUser, firstUser]);
  });
  it("não modifica configuração ao encontrar aprovador ausente ou versão antiga", async () => {
    const before = await getApprovalRules(database, projectId);
    await expect(replaceApprovalRules(database, projectId, { expectedVersion: before.version, bands: [{ upperLimit: null, approverIds: [randomUUID()] }] })).rejects.toMatchObject({
      status: 400, fieldErrors: [{ path: "bands.0.approverIds.0", message: "Aprovador não encontrado." }],
    });
    await expect(replaceApprovalRules(database, projectId, { expectedVersion: before.version - 1, bands: [] })).rejects.toMatchObject({ code: "RULES_VERSION_CONFLICT" });
    expect(await getApprovalRules(database, projectId)).toEqual(before);
  });
  it("serializa duas edições com mesma versão: apenas uma é confirmada", async () => {
    const before = await getApprovalRules(database, projectId);
    const results = await Promise.allSettled([
      replaceApprovalRules(database, projectId, { expectedVersion: before.version, bands: [{ upperLimit: "500", approverIds: [firstUser] }] }),
      replaceApprovalRules(database, projectId, { expectedVersion: before.version, bands: [{ upperLimit: "700", approverIds: [secondUser] }] }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const failure = results.find((result) => result.status === "rejected");
    expect(failure?.status === "rejected" && failure.reason).toBeInstanceOf(ApiError);
    expect(failure?.status === "rejected" && failure.reason.code).toBe("RULES_VERSION_CONFLICT");
    expect((await getApprovalRules(database, projectId)).version).toBe(before.version + 1);
  });
  it("permite limpar faixas e incrementa a versão também para conteúdo igual", async () => {
    const before = await getApprovalRules(database, projectId);
    const cleared = await replaceApprovalRules(database, projectId, { expectedVersion: before.version, bands: [] });
    expect(cleared).toEqual({ projectId, version: before.version + 1, bands: [] });
    expect((await replaceApprovalRules(database, projectId, { expectedVersion: cleared.version, bands: [] })).version).toBe(cleared.version + 1);
  });
});
