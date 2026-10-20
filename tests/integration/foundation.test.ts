import { beforeAll, afterAll, expect, it } from "vitest";
import { createDatabaseClient } from "@/lib/database-client";
import { foundationIds, seedFoundation } from "@/modules/registry/seed-foundation";

if (process.env.TEST_DATABASE_GUARDED !== "true" || process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) {
  throw new Error("Execute integrações por npm run test:integration para proteger o banco.");
}
const database = createDatabaseClient(process.env.TEST_DATABASE_URL!);

beforeAll(async () => { await seedFoundation(database); });
afterAll(async () => { await database.$disconnect(); });

it("aplica o schema e popula referências e cadeias na ordem correta", async () => {
  const centro = await database.project.findUniqueOrThrow({
    where: { id: foundationIds.projects.centro },
    include: { bands: { orderBy: { position: "asc" }, include: { approvers: { orderBy: { position: "asc" } } } } },
  });
  expect(centro.bands).toHaveLength(2);
  expect(centro.bands[0].upperLimit?.toFixed(2)).toBe("10000.00");
  expect(centro.bands[1].upperLimit).toBeNull();
  expect(centro.bands[1].approvers.map((approver) => approver.userId)).toEqual([foundationIds.users.amanda, foundationIds.users.joao]);
  expect(await database.project.count({ where: { id: { in: Object.values(foundationIds.projects) } } })).toBe(2);
});

it("repete seed sem duplicar dados nem substituir configurações editadas", async () => {
  const before = await database.bandApprover.count();
  const band = await database.approvalBand.findUniqueOrThrow({ where: { id: foundationIds.bands.centroFirst } });
  await database.approvalBand.update({ where: { id: band.id }, data: { upperLimit: "1234.00" } });
  try {
    await seedFoundation(database);
    await seedFoundation(database);
    expect(await database.bandApprover.count()).toBe(before);
    expect((await database.approvalBand.findUniqueOrThrow({ where: { id: band.id } })).upperLimit?.toFixed(2)).toBe("1234.00");
  } finally {
    await database.approvalBand.update({ where: { id: band.id }, data: { upperLimit: band.upperLimit } });
  }
});

it("impede faixa ilimitada duplicada mesmo em escrita direta no banco", async () => {
  await expect(database.approvalBand.create({ data: { projectId: foundationIds.projects.centro, position: 3, upperLimit: null } })).rejects.toThrow();
  expect(await database.approvalBand.count({ where: { projectId: foundationIds.projects.centro, upperLimit: null } })).toBe(1);
});

it("impede aprovador duplicado e referência inválida", async () => {
  await expect(database.bandApprover.create({ data: { bandId: foundationIds.bands.centroFirst, userId: foundationIds.users.amanda, position: 2 } })).rejects.toThrow();
  await expect(database.bandApprover.create({ data: { bandId: foundationIds.bands.centroFirst, userId: "ffffffff-ffff-4fff-8fff-ffffffffffff", position: 2 } })).rejects.toThrow();
});
