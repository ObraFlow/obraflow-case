import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean up
  await prisma.approvalHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.ruleLevelApprover.deleteMany();
  await prisma.approvalRuleLevel.deleteMany();
  await prisma.approvalRule.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.work.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const joao = await prisma.user.create({
    data: { name: 'João P. Bernardino', email: 'joao@obraflow.io' },
  });
  const amanda = await prisma.user.create({
    data: { name: 'Amanda Oliveira', email: 'amanda@obraflow.io' },
  });
  const carlos = await prisma.user.create({
    data: { name: 'Carlos Silva', email: 'carlos@obraflow.io' },
  });

  // Create Works
  const obra1 = await prisma.work.create({
    data: { name: 'Residencial Bela Vista' },
  });
  const obra2 = await prisma.work.create({
    data: { name: 'Edifício Horizonte' },
  });

  // Create Suppliers
  await prisma.supplier.create({ data: { name: 'Cimento & Cia' } });
  await prisma.supplier.create({ data: { name: 'Ferragens Forte' } });
  await prisma.supplier.create({ data: { name: 'Madeireira Central' } });

  // Create Rules for Obra 1
  // Rule 1: Up to 10.000 -> Amanda
  await prisma.approvalRule.create({
    data: {
      workId: obra1.id,
      minValue: 0,
      maxValue: 10000,
      levels: {
        create: [
          {
            order: 0,
            approvers: { create: [{ userId: amanda.id }] }
          }
        ]
      }
    }
  });

  // Rule 2: Above 10.000 -> Amanda -> João
  await prisma.approvalRule.create({
    data: {
      workId: obra1.id,
      minValue: 10000.01,
      maxValue: null,
      levels: {
        create: [
          {
            order: 0,
            approvers: { create: [{ userId: amanda.id }] }
          },
          {
            order: 1,
            approvers: { create: [{ userId: joao.id }] }
          }
        ]
      }
    }
  });

  // Create Rules for Obra 2
  // Rule: Any value -> Carlos -> João
  await prisma.approvalRule.create({
    data: {
      workId: obra2.id,
      minValue: 0,
      maxValue: null,
      levels: {
        create: [
          {
            order: 0,
            approvers: { create: [{ userId: carlos.id }] }
          },
          {
            order: 1,
            approvers: { create: [{ userId: joao.id }] }
          }
        ]
      }
    }
  });

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
