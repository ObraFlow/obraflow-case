import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import {
  approvalRuleApprovers,
  approvalRules,
  purchaseOrderApprovals,
  purchaseOrderItems,
  purchaseOrders,
  suppliers,
  users,
  works,
} from './schema';

const client = postgres(process.env.DATABASE_URL ?? '');
const db = drizzle(client);

async function seed(): Promise<void> {
  const [work1, work2] = await db
    .insert(works)
    .values([
      { name: 'Residencial Aurora' },
      { name: 'Centro Logístico Norte' },
    ])
    .returning();
  const [amanda, joao, carla] = await db
    .insert(users)
    .values([
      {
        name: 'Amanda Silva',
        email: 'amanda@obraflow.local',
        passwordHash: '$2b$10$7Q9J1Z5F1G8K1J1Z5F1G8K1J1Z5F1G8K1J1Z5F1G8K',
      },
      {
        name: 'João Oliveira',
        email: 'joao@obraflow.local',
        passwordHash: '$2b$10$7Q9J1Z5F1G8K1J1Z5F1G8K1J1Z5F1G8K1J1Z5F1G8K',
      },
      {
        name: 'Carla Mendes',
        email: 'carla@obraflow.local',
        passwordHash: '$2b$10$7Q9J1Z5F1G8K1J1Z5F1G8K1J1Z5F1G8K1J1Z5F1G8K',
      },
    ])
    .returning();
  const [materials, services] = await db
    .insert(suppliers)
    .values([
      { name: 'Materiais Horizonte', document: '00.000.000/0001-01' },
      { name: 'Serviços Construtivos', document: '00.000.000/0001-02' },
    ])
    .returning();
  const [low, high, logistics] = await db
    .insert(approvalRules)
    .values([
      { workId: work1.id, minimumTotalCents: 0, maximumTotalCents: 1_000_000 },
      {
        workId: work1.id,
        minimumTotalCents: 1_000_001,
        maximumTotalCents: null,
      },
      { workId: work2.id, minimumTotalCents: 0, maximumTotalCents: null },
    ])
    .returning();
  await db.insert(approvalRuleApprovers).values([
    { ruleId: low.id, userId: amanda.id, position: 1 },
    { ruleId: high.id, userId: amanda.id, position: 1 },
    { ruleId: high.id, userId: joao.id, position: 2 },
    { ruleId: logistics.id, userId: carla.id, position: 1 },
  ]);
  const [approvedOrder, pendingOrder] = await db
    .insert(purchaseOrders)
    .values([
      {
        workId: work1.id,
        supplierId: materials.id,
        orderDate: new Date('2026-10-20T12:00:00Z'),
        notes: 'Compra aprovada de materiais.',
        totalCents: 800_000,
        status: 'APPROVED',
      },
      {
        workId: work1.id,
        supplierId: services.id,
        orderDate: new Date('2026-10-28T12:00:00Z'),
        notes: 'Serviço de fundação aguardando João.',
        totalCents: 1_250_000,
        status: 'PENDING',
      },
    ])
    .returning();
  await db.insert(purchaseOrderItems).values([
    {
      orderId: approvedOrder.id,
      description: 'Cimento',
      quantity: '20.000',
      unit: 'saco',
      unitPriceCents: 40_000,
      totalCents: 800_000,
    },
    {
      orderId: pendingOrder.id,
      description: 'Execução de fundação',
      quantity: '1.000',
      unit: 'serviço',
      unitPriceCents: 1_250_000,
      totalCents: 1_250_000,
    },
  ]);
  await db.insert(purchaseOrderApprovals).values([
    {
      orderId: approvedOrder.id,
      approverId: amanda.id,
      position: 1,
      status: 'APPROVED',
      decidedAt: new Date('2026-10-21T12:00:00Z'),
    },
    {
      orderId: pendingOrder.id,
      approverId: amanda.id,
      position: 1,
      status: 'APPROVED',
      decidedAt: new Date('2026-10-28T13:00:00Z'),
    },
    {
      orderId: pendingOrder.id,
      approverId: joao.id,
      position: 2,
      status: 'PENDING',
    },
  ]);
  console.log('Dados de demonstração inseridos.');
  await client.end();
}

void seed().catch(async (error: unknown) => {
  console.error(error);
  await client.end();
  process.exitCode = 1;
});
