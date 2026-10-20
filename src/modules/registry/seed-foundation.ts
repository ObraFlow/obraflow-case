import type { PrismaClient } from "@/generated/prisma/client";

export const foundationIds = {
  users: {
    amanda: "22222222-2222-4222-8222-222222222222",
    joao: "33333333-3333-4333-8333-333333333333",
    lucas: "66666666-6666-4666-8666-666666666666",
  },
  projects: {
    centro: "11111111-1111-4111-8111-111111111111",
    norte: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  },
  suppliers: {
    alfa: "44444444-4444-4444-8444-444444444444",
    beta: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  },
  bands: {
    centroFirst: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    centroLast: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    norteFirst: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  },
} as const;

/** Adiciona referências ausentes; nunca reseta dados já existentes. */
export async function seedFoundation(database: PrismaClient) {
  await database.$transaction(async (transaction) => {
    // Serializa duas execuções do seed, sem substituir o lock por obra do domínio.
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(1868723052)::text`;
    await transaction.user.createMany({
      data: [
        { id: foundationIds.users.amanda, name: "Amanda" },
        { id: foundationIds.users.joao, name: "João" },
        { id: foundationIds.users.lucas, name: "Lucas" },
      ],
      skipDuplicates: true,
    });
    await transaction.supplier.createMany({
      data: [
        { id: foundationIds.suppliers.alfa, name: "Fornecedor Alfa" },
        { id: foundationIds.suppliers.beta, name: "Fornecedor Beta" },
      ],
      skipDuplicates: true,
    });

    if (!(await transaction.project.findUnique({ where: { id: foundationIds.projects.centro } }))) {
      await transaction.project.create({
        data: {
          id: foundationIds.projects.centro,
          name: "Obra Centro",
          rulesVersion: 1,
          bands: {
            create: [
              {
                id: foundationIds.bands.centroFirst,
                position: 1,
                upperLimit: "10000.00",
                approvers: { create: [{ userId: foundationIds.users.amanda, position: 1 }] },
              },
              {
                id: foundationIds.bands.centroLast,
                position: 2,
                upperLimit: null,
                approvers: {
                  create: [
                    { userId: foundationIds.users.amanda, position: 1 },
                    { userId: foundationIds.users.joao, position: 2 },
                  ],
                },
              },
            ],
          },
        },
      });
    }
    if (!(await transaction.project.findUnique({ where: { id: foundationIds.projects.norte } }))) {
      await transaction.project.create({
        data: {
          id: foundationIds.projects.norte,
          name: "Obra Norte",
          rulesVersion: 1,
          bands: {
            create: [
              {
                id: foundationIds.bands.norteFirst,
                position: 1,
                upperLimit: "5000.00",
                approvers: { create: [{ userId: foundationIds.users.joao, position: 1 }] },
              },
            ],
          },
        },
      });
    }
  });
}
