import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Arredondamento monetário (inline para o seed ser autossuficiente).
function round2(v: number): number {
    return Math.round((v + Number.EPSILON) * 100) / 100;
}
function lineTotal(quantity: number, unitPrice: number): number {
    return round2(quantity * unitPrice);
}
function orderTotal(items: { quantity: number; unitPrice: number }[]): number {
    return round2(items.reduce((acc, i) => acc + lineTotal(i.quantity, i.unitPrice), 0));
}

type ItemSeed = { description: string; quantity: number; unit: string; unitPrice: number };
function withTotals(items: ItemSeed[]) {
    return {
        items: items.map((i) => ({ ...i, lineTotal: lineTotal(i.quantity, i.unitPrice) })),
        total: orderTotal(items),
    };
}

async function main() {
    // Limpa em ordem de dependência (seed determinístico/idempotente).
    await prisma.orderApprovalStep.deleteMany();
    await prisma.purchaseOrderItem.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.approvalRangeStep.deleteMany();
    await prisma.approvalRange.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    // --- Usuários (aprovadores) ---
    const joao = await prisma.user.create({
        data: { name: 'João Pereira', email: 'joao@obraflow.io', role: 'Engenheiro de Obra' },
    });
    const amanda = await prisma.user.create({
        data: { name: 'Amanda Souza', email: 'amanda@obraflow.io', role: 'Gerente Financeiro' },
    });
    const carlos = await prisma.user.create({
        data: { name: 'Carlos Lima', email: 'carlos@obraflow.io', role: 'Coordenador' },
    });
    const beatriz = await prisma.user.create({
        data: { name: 'Beatriz Nunes', email: 'beatriz@obraflow.io', role: 'Mestre de Obras' },
    });

    // --- Fornecedores ---
    const construmega = await prisma.supplier.create({
        data: { name: 'Construmega Materiais', document: '12.345.678/0001-90' },
    });
    const ferragens = await prisma.supplier.create({
        data: { name: 'Ferragens Silva', document: '98.765.432/0001-10' },
    });
    const cimentoForte = await prisma.supplier.create({
        data: { name: 'Cimento Forte', document: '55.444.333/0001-22' },
    });

    // --- Obras ---
    const aurora = await prisma.project.create({ data: { name: 'Residencial Aurora' } });
    const horizonte = await prisma.project.create({ data: { name: 'Edifício Horizonte' } });

    // --- Regras de alçada ---
    // Aurora: até 10.000 -> João | acima de 10.000 -> João, Amanda
    await prisma.approvalRange.create({
        data: {
            projectId: aurora.id,
            minValue: 0,
            maxValue: 10000,
            approvalRangeSteps: { create: [{ userId: joao.id, position: 0 }] },
        },
    });
    await prisma.approvalRange.create({
        data: {
            projectId: aurora.id,
            minValue: 10000,
            maxValue: null,
            approvalRangeSteps: {
                create: [
                    { userId: joao.id, position: 0 },
                    { userId: amanda.id, position: 1 },
                ],
            },
        },
    });

    // Horizonte: até 5.000 -> Beatriz | 5.000–20.000 -> Beatriz, Carlos | acima -> Beatriz, Carlos, Amanda
    await prisma.approvalRange.create({
        data: {
            projectId: horizonte.id,
            minValue: 0,
            maxValue: 5000,
            approvalRangeSteps: { create: [{ userId: beatriz.id, position: 0 }] },
        },
    });
    await prisma.approvalRange.create({
        data: {
            projectId: horizonte.id,
            minValue: 5000,
            maxValue: 20000,
            approvalRangeSteps: {
                create: [
                    { userId: beatriz.id, position: 0 },
                    { userId: carlos.id, position: 1 },
                ],
            },
        },
    });
    await prisma.approvalRange.create({
        data: {
            projectId: horizonte.id,
            minValue: 20000,
            maxValue: null,
            approvalRangeSteps: {
                create: [
                    { userId: beatriz.id, position: 0 },
                    { userId: carlos.id, position: 1 },
                    { userId: amanda.id, position: 2 },
                ],
            },
        },
    });

    // --- Pedidos em diferentes estados ---

    // 1) Aurora, pendente no nível 0 (aguardando João). Total 8.000.
    const o1 = withTotals([
        { description: 'Cimento CP-II 50kg', quantity: 100, unit: 'sc', unitPrice: 40 },
        { description: 'Areia média', quantity: 20, unit: 'm³', unitPrice: 200 },
    ]);
    await prisma.purchaseOrder.create({
        data: {
            projectId: aurora.id,
            supplierId: construmega.id,
            orderDate: new Date('2026-10-10'),
            notes: 'Reposição de estoque da fundação.',
            totalValue: o1.total,
            status: 'PENDING',
            currentStep: 0,
            items: { create: o1.items },
            steps: { create: [{ userId: joao.id, position: 0, decision: 'PENDING' }] },
        },
    });

    // 2) Aurora, pendente no nível 1 (João já aprovou; aguardando Amanda). Total 12.500.
    const o2 = withTotals([
        { description: 'Aço CA-50', quantity: 500, unit: 'kg', unitPrice: 9 },
        { description: 'Concreto usinado', quantity: 40, unit: 'm³', unitPrice: 200 },
    ]);
    await prisma.purchaseOrder.create({
        data: {
            projectId: aurora.id,
            supplierId: ferragens.id,
            orderDate: new Date('2026-10-12'),
            notes: 'Estrutura do 2º pavimento.',
            totalValue: o2.total,
            status: 'PENDING',
            currentStep: 1,
            items: { create: o2.items },
            steps: {
                create: [
                    { userId: joao.id, position: 0, decision: 'APPROVED', decidedAt: new Date('2026-10-12T14:00:00Z') },
                    { userId: amanda.id, position: 1, decision: 'PENDING' },
                ],
            },
        },
    });

    // 3) Horizonte, totalmente aprovado. Total 25.000 (3 níveis).
    const o3 = withTotals([
        { description: 'Elevador de carga (locação mensal)', quantity: 1, unit: 'un', unitPrice: 25000 },
    ]);
    await prisma.purchaseOrder.create({
        data: {
            projectId: horizonte.id,
            supplierId: cimentoForte.id,
            orderDate: new Date('2026-10-05'),
            notes: 'Logística vertical da obra.',
            totalValue: o3.total,
            status: 'APPROVED',
            currentStep: 3,
            items: { create: o3.items },
            steps: {
                create: [
                    { userId: beatriz.id, position: 0, decision: 'APPROVED', decidedAt: new Date('2026-10-05T10:00:00Z') },
                    { userId: carlos.id, position: 1, decision: 'APPROVED', decidedAt: new Date('2026-10-05T11:00:00Z') },
                    { userId: amanda.id, position: 2, decision: 'APPROVED', decidedAt: new Date('2026-10-06T09:00:00Z') },
                ],
            },
        },
    });

    // 4) Horizonte, rejeitado no nível 0. Total 6.000.
    const o4 = withTotals([
        { description: 'Telha cerâmica', quantity: 2000, unit: 'un', unitPrice: 3 },
    ]);
    await prisma.purchaseOrder.create({
        data: {
            projectId: horizonte.id,
            supplierId: construmega.id,
            orderDate: new Date('2026-10-08'),
            notes: 'Cobertura bloco B.',
            totalValue: o4.total,
            status: 'REJECTED',
            currentStep: 0,
            items: { create: o4.items },
            steps: {
                create: [
                    {
                        userId: beatriz.id,
                        position: 0,
                        decision: 'REJECTED',
                        reason: 'Fornecedor sem cotação concorrente; refazer cotação.',
                        decidedAt: new Date('2026-10-08T16:30:00Z'),
                    },
                    { userId: carlos.id, position: 1, decision: 'PENDING' },
                ],
            },
        },
    });

    // 5) Aurora, pendente no nível 0 (aguardando João). Total 3.000.
    const o5 = withTotals([
        { description: 'Tinta acrílica 18L', quantity: 30, unit: 'lata', unitPrice: 100 },
    ]);
    await prisma.purchaseOrder.create({
        data: {
            projectId: aurora.id,
            supplierId: cimentoForte.id,
            orderDate: new Date('2026-10-15'),
            notes: 'Acabamento das áreas comuns.',
            totalValue: o5.total,
            status: 'PENDING',
            currentStep: 0,
            items: { create: o5.items },
            steps: { create: [{ userId: joao.id, position: 0, decision: 'PENDING' }] },
        },
    });

    console.log('Seed concluído: 4 usuários, 3 fornecedores, 2 obras, 5 faixas, 5 pedidos.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
