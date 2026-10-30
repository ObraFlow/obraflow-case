// Dados de demonstração do Dokimos (os mesmos do design).
// Usa as funções de domínio da API (totais, resolução de faixa e fluxo de aprovação),
// então os pedidos gerados seguem exatamente as regras que a API aplica.
//
// Usado pelo `pnpm db:seed` (prisma/seed.ts) e pelos testes e2e, que resetam o banco de teste com ele.

import {
  HistoryType,
  type PrismaClient,
  StepStatus,
  type Unit,
} from './generated/client.js';
import {
  approveCurrentStep,
  type FlowState,
  rejectCurrentStep,
  startFlow,
} from '../src/common/domain/approval-flow.js';
import { resolveRule } from '../src/common/domain/approval-rules.js';
import { Decimal, itemTotal, orderTotal } from '../src/common/domain/money.js';

// ---------------------------------------------------------------------------
// Cadastros
// ---------------------------------------------------------------------------

const USERS = {
  joao: {
    name: 'João Ribeiro',
    email: 'joao.ribeiro@obraflow.dev',
    jobTitle: 'Engenheiro de obra',
  },
  amanda: {
    name: 'Amanda Costa',
    email: 'amanda.costa@obraflow.dev',
    jobTitle: 'Gerente de suprimentos',
  },
  carlos: {
    name: 'Carlos Mendes',
    email: 'carlos.mendes@obraflow.dev',
    jobTitle: 'Diretor financeiro',
  },
  beatriz: {
    name: 'Beatriz Lima',
    email: 'beatriz.lima@obraflow.dev',
    jobTitle: 'Compradora',
  },
  fernando: {
    name: 'Fernando Souza',
    email: 'fernando.souza@obraflow.dev',
    jobTitle: 'Coordenador de obra',
  },
} as const;

// Três obras para demonstrar os três estados de cobertura das faixas:
// Maré = cobertura total · Sol Nascente = parcial (sem faixa "sem limite") · Torre = sem faixas.
const PROJECTS = {
  mare: { name: 'Edifício Maré', city: 'Salvador' },
  sol: { name: 'Residencial Sol Nascente', city: 'Lauro de Freitas' },
  torre: { name: 'Torre das Artes', city: 'Salvador' },
} as const;

const SUPPLIERS = {
  votorantim: 'Votorantim Cimentos',
  gerdau: 'Gerdau',
  leroy: 'Leroy Merlin Pro',
  tigre: 'Tigre Tubos',
  locabem: 'Locabem Equipamentos',
  holcim: 'Holcim Brasil',
} as const;

type UserKey = keyof typeof USERS;
type ProjectKey = keyof typeof PROJECTS;
type SupplierKey = keyof typeof SUPPLIERS;

const RULES: {
  project: ProjectKey;
  maxAmount: string | null;
  approvers: UserKey[];
}[] = [
  { project: 'mare', maxAmount: '10000.00', approvers: ['joao'] },
  { project: 'mare', maxAmount: '50000.00', approvers: ['joao', 'amanda'] },
  { project: 'mare', maxAmount: null, approvers: ['joao', 'amanda', 'carlos'] },
  { project: 'sol', maxAmount: '5000.00', approvers: ['amanda'] },
  { project: 'sol', maxAmount: '30000.00', approvers: ['amanda', 'carlos'] },
];

// ---------------------------------------------------------------------------
// Pedidos — cada um com as decisões já tomadas, em ordem.
// O aprovador de cada decisão é sempre o da etapa atual (definido pela faixa).
// ---------------------------------------------------------------------------

interface SeedItem {
  description: string;
  quantity: string;
  unit: Unit;
  unitPrice: string;
}

interface SeedDecision {
  action: 'approve' | 'reject';
  at: string;
  reason?: string;
}

interface SeedOrder {
  project: ProjectKey;
  supplier: SupplierKey;
  requester: UserKey;
  orderDate: string;
  createdAt: string;
  notes?: string;
  items: SeedItem[];
  decisions: SeedDecision[];
}

const ORDERS: SeedOrder[] = [
  // PED-001 · Maré · faixa 1 (João) · aprovado
  {
    project: 'mare',
    supplier: 'gerdau',
    requester: 'beatriz',
    orderDate: '2026-10-05',
    createdAt: '2026-10-05T08:40:00-03:00',
    items: [
      {
        description: 'Vergalhão CA-50 10mm',
        quantity: '400',
        unit: 'm',
        unitPrice: '8.90',
      },
      {
        description: 'Vergalhão CA-50 8mm',
        quantity: '300',
        unit: 'm',
        unitPrice: '6.40',
      },
      {
        description: 'Arame recozido nº 18',
        quantity: '40',
        unit: 'kg',
        unitPrice: '22.50',
      },
    ],
    decisions: [{ action: 'approve', at: '2026-10-05T11:15:00-03:00' }],
  },
  // PED-002 · Sol Nascente · faixa 1 (Amanda) · rejeitado
  {
    project: 'sol',
    supplier: 'tigre',
    requester: 'beatriz',
    orderDate: '2026-10-07',
    createdAt: '2026-10-07T09:02:00-03:00',
    items: [
      {
        description: 'Tubo PVC esgoto 100mm × 6m',
        quantity: '20',
        unit: 'un',
        unitPrice: '55.00',
      },
    ],
    decisions: [
      {
        action: 'reject',
        at: '2026-10-07T10:17:00-03:00',
        reason:
          'Fornecedor não homologado para este tipo de material. Solicitar cotação com a Amanco antes de refazer o pedido.',
      },
    ],
  },
  // PED-003 · Maré · faixa 3 (João → Amanda → Carlos) · aprovado
  {
    project: 'mare',
    supplier: 'locabem',
    requester: 'fernando',
    orderDate: '2026-10-09',
    createdAt: '2026-10-09T07:55:00-03:00',
    notes: 'Locação para a etapa de estrutura (pavimentos 5 a 12).',
    items: [
      {
        description: 'Locação de grua torre (mensal)',
        quantity: '1',
        unit: 'un',
        unitPrice: '38000.00',
      },
      {
        description: 'Locação de betoneira 400L',
        quantity: '160',
        unit: 'h',
        unitPrice: '18.00',
      },
      {
        description: 'Andaime fachadeiro',
        quantity: '1200',
        unit: 'm2',
        unitPrice: '22.50',
      },
    ],
    decisions: [
      { action: 'approve', at: '2026-10-09T10:20:00-03:00' },
      { action: 'approve', at: '2026-10-09T15:42:00-03:00' },
      { action: 'approve', at: '2026-10-10T09:05:00-03:00' },
    ],
  },
  // PED-004 · Sol Nascente · faixa 2 (Amanda → Carlos) · rejeitado na 2ª etapa
  {
    project: 'sol',
    supplier: 'leroy',
    requester: 'beatriz',
    orderDate: '2026-10-12',
    createdAt: '2026-10-12T13:30:00-03:00',
    items: [
      {
        description: 'Porcelanato 60×60 acetinado',
        quantity: '320',
        unit: 'm2',
        unitPrice: '48.90',
      },
      {
        description: 'Argamassa ACIII 20kg',
        quantity: '90',
        unit: 'sc',
        unitPrice: '30.50',
      },
    ],
    decisions: [
      { action: 'approve', at: '2026-10-12T16:10:00-03:00' },
      {
        action: 'reject',
        at: '2026-10-13T09:48:00-03:00',
        reason:
          'Orçamento de acabamento deste mês já está comprometido. Reprogramar a compra para novembro.',
      },
    ],
  },
  // PED-005 · Maré · faixa 3 · rejeitado na 1ª etapa (Amanda e Carlos ficam SKIPPED)
  {
    project: 'mare',
    supplier: 'holcim',
    requester: 'beatriz',
    orderDate: '2026-10-14',
    createdAt: '2026-10-14T08:20:00-03:00',
    items: [
      {
        description: 'Concreto usinado fck 30 MPa',
        quantity: '110',
        unit: 'm3',
        unitPrice: '520.00',
      },
      {
        description: 'Bombeamento de concreto',
        quantity: '8',
        unit: 'h',
        unitPrice: '450.00',
      },
    ],
    decisions: [
      {
        action: 'reject',
        at: '2026-10-14T11:05:00-03:00',
        reason:
          'Preço do m³ acima da cotação de referência. Renegociar com o fornecedor.',
      },
    ],
  },
  // PED-006 · Maré · faixa 1 · aprovado
  {
    project: 'mare',
    supplier: 'votorantim',
    requester: 'fernando',
    orderDate: '2026-10-16',
    createdAt: '2026-10-16T10:00:00-03:00',
    items: [
      {
        description: 'Cimento CP-II 50kg',
        quantity: '120',
        unit: 'sc',
        unitPrice: '32.00',
      },
      {
        description: 'Cal hidratada 20kg',
        quantity: '40',
        unit: 'sc',
        unitPrice: '11.50',
      },
    ],
    decisions: [{ action: 'approve', at: '2026-10-16T14:25:00-03:00' }],
  },
  // PED-007 · Sol Nascente · faixa 1 · aguardando Amanda
  {
    project: 'sol',
    supplier: 'gerdau',
    requester: 'fernando',
    orderDate: '2026-10-17',
    createdAt: '2026-10-17T09:30:00-03:00',
    items: [
      {
        description: 'Tela soldada Q-92 (2×3m)',
        quantity: '25',
        unit: 'un',
        unitPrice: '154.00',
      },
    ],
    decisions: [],
  },
  // PED-008 · Maré · faixa 3 · João e Amanda aprovaram, aguardando Carlos
  {
    project: 'mare',
    supplier: 'locabem',
    requester: 'fernando',
    orderDate: '2026-10-18',
    createdAt: '2026-10-18T08:05:00-03:00',
    notes: 'Necessário para iniciar a fachada na próxima semana.',
    items: [
      {
        description: 'Locação de grua torre (mensal)',
        quantity: '1',
        unit: 'un',
        unitPrice: '38000.00',
      },
      {
        description: 'Locação de elevador cremalheira (mensal)',
        quantity: '1',
        unit: 'un',
        unitPrice: '16720.00',
      },
    ],
    decisions: [
      { action: 'approve', at: '2026-10-18T11:30:00-03:00' },
      { action: 'approve', at: '2026-10-19T08:50:00-03:00' },
    ],
  },
  // PED-009 · Maré · faixa 2 (João → Amanda) · João aprovou, aguardando Amanda
  {
    project: 'mare',
    supplier: 'votorantim',
    requester: 'beatriz',
    orderDate: '2026-10-18',
    createdAt: '2026-10-18T09:12:00-03:00',
    notes: 'Entrega urgente — concretagem da laje do 6º pavimento.',
    items: [
      {
        description: 'Cimento CP-II 50kg',
        quantity: '100',
        unit: 'sc',
        unitPrice: '32.00',
      },
      {
        description: 'Areia média lavada',
        quantity: '12',
        unit: 'm3',
        unitPrice: '145.00',
      },
      {
        description: 'Vergalhão CA-50 10mm',
        quantity: '300',
        unit: 'm',
        unitPrice: '25.20',
      },
    ],
    decisions: [{ action: 'approve', at: '2026-10-18T14:32:00-03:00' }],
  },
  // PED-010 · Maré · faixa 1 · aguardando João
  {
    project: 'mare',
    supplier: 'tigre',
    requester: 'beatriz',
    orderDate: '2026-10-20',
    createdAt: '2026-10-20T10:45:00-03:00',
    items: [
      {
        description: 'Tubo PVC esgoto 100mm × 6m',
        quantity: '40',
        unit: 'un',
        unitPrice: '55.00',
      },
      {
        description: 'Tubo PVC água fria 25mm × 6m',
        quantity: '120',
        unit: 'un',
        unitPrice: '18.90',
      },
      {
        description: 'Kit de conexões hidráulicas (lote)',
        quantity: '1',
        unit: 'un',
        unitPrice: '3352.50',
      },
    ],
    decisions: [],
  },
  // PED-011 · Sol Nascente · faixa 2 (Amanda → Carlos) · aguardando Amanda
  {
    project: 'sol',
    supplier: 'leroy',
    requester: 'beatriz',
    orderDate: '2026-10-21',
    createdAt: '2026-10-21T08:30:00-03:00',
    items: [
      {
        description: 'Porta de madeira semi-oca 80cm',
        quantity: '24',
        unit: 'un',
        unitPrice: '520.00',
      },
      {
        description: 'Fechadura de embutir cromada',
        quantity: '24',
        unit: 'un',
        unitPrice: '89.90',
      },
      {
        description: 'Janela de alumínio 1,20 × 1,00m',
        quantity: '16',
        unit: 'un',
        unitPrice: '522.65',
      },
    ],
    decisions: [],
  },
];

// ---------------------------------------------------------------------------

/** APAGA todos os dados e recria os dados de demonstração. */
export async function seed(prisma: PrismaClient) {
  // Limpa tudo e reinicia os ids, para os códigos ficarem PED-001, PED-002…
  await prisma.$executeRawUnsafe(`
    TRUNCATE "PurchaseOrderEvent", "ApprovalStep", "PurchaseOrderItem", "PurchaseOrder",
             "ApprovalRuleApprover", "ApprovalRule", "Supplier", "Project", "User"
    RESTART IDENTITY CASCADE
  `);

  const userIds = {} as Record<UserKey, number>;
  for (const [key, data] of Object.entries(USERS) as [
    UserKey,
    (typeof USERS)[UserKey],
  ][]) {
    userIds[key] = (await prisma.user.create({ data })).id;
  }

  const projectIds = {} as Record<ProjectKey, number>;
  for (const [key, data] of Object.entries(PROJECTS) as [
    ProjectKey,
    (typeof PROJECTS)[ProjectKey],
  ][]) {
    projectIds[key] = (await prisma.project.create({ data })).id;
  }

  const supplierIds = {} as Record<SupplierKey, number>;
  for (const [key, name] of Object.entries(SUPPLIERS) as [
    SupplierKey,
    string,
  ][]) {
    supplierIds[key] = (await prisma.supplier.create({ data: { name } })).id;
  }

  for (const rule of RULES) {
    await prisma.approvalRule.create({
      data: {
        projectId: projectIds[rule.project],
        maxAmount: rule.maxAmount,
        approvers: {
          create: rule.approvers.map((user, index) => ({
            userId: userIds[user],
            position: index + 1,
          })),
        },
      },
    });
  }

  for (const [index, order] of ORDERS.entries()) {
    await createOrder(prisma, order, index + 1, {
      userIds,
      projectIds,
      supplierIds,
    });
  }

  const counts = await prisma.purchaseOrder.groupBy({
    by: ['status'],
    _count: true,
  });
  return {
    usuarios: Object.keys(userIds).length,
    obras: Object.keys(projectIds).length,
    fornecedores: Object.keys(supplierIds).length,
    faixas: RULES.length,
    pedidos: Object.fromEntries(counts.map((c) => [c.status, c._count])),
  };
}

async function createOrder(
  prisma: PrismaClient,
  order: SeedOrder,
  number: number,
  ids: {
    userIds: Record<UserKey, number>;
    projectIds: Record<ProjectKey, number>;
    supplierIds: Record<SupplierKey, number>;
  },
) {
  const items = order.items.map((item, index) => {
    const quantity = new Decimal(item.quantity);
    const unitPrice = new Decimal(item.unitPrice);
    return {
      ...item,
      position: index + 1,
      quantity,
      unitPrice,
      total: itemTotal(quantity, unitPrice),
    };
  });
  const totalAmount = orderTotal(items.map((item) => item.total));

  // Mesma resolução de faixa da API.
  const rules = await prisma.approvalRule.findMany({
    where: { projectId: ids.projectIds[order.project] },
    include: { approvers: { orderBy: { position: 'asc' } } },
  });
  const rule = resolveRule(rules, totalAmount);
  if (!rule) {
    throw new Error(
      `Seed inválido: PED-${number} (${totalAmount.toFixed(2)}) não tem faixa aplicável.`,
    );
  }

  // Aplica as decisões com a mesma máquina de estados da API.
  let state: FlowState = startFlow(rule.approvers.length);
  const decidedAt = new Map<number, Date>();
  const events: {
    type: HistoryType;
    actorId: number;
    stepPosition: number | null;
    reason?: string;
    createdAt: Date;
  }[] = [
    {
      type: HistoryType.CREATED,
      actorId: ids.userIds[order.requester],
      stepPosition: null,
      createdAt: new Date(order.createdAt),
    },
  ];
  for (const decision of order.decisions) {
    const position = state.currentStep!;
    const actorId = rule.approvers[position - 1].userId;
    const at = new Date(decision.at);
    state =
      decision.action === 'approve'
        ? approveCurrentStep(state)
        : rejectCurrentStep(state);
    decidedAt.set(position, at);
    events.push({
      type:
        decision.action === 'approve'
          ? HistoryType.APPROVED
          : HistoryType.REJECTED,
      actorId,
      stepPosition: position,
      reason: decision.reason,
      createdAt: at,
    });
  }

  const createdAt = new Date(order.createdAt);
  await prisma.purchaseOrder.create({
    data: {
      projectId: ids.projectIds[order.project],
      supplierId: ids.supplierIds[order.supplier],
      requesterId: ids.userIds[order.requester],
      orderDate: new Date(order.orderDate),
      notes: order.notes,
      totalAmount,
      status: state.status,
      currentStep: state.currentStep,
      ruleId: rule.id,
      ruleFromAmount: rule.fromAmount,
      ruleMaxAmount: rule.maxAmount,
      createdAt,
      updatedAt: events.at(-1)!.createdAt,
      items: {
        create: items.map(
          ({ position, description, quantity, unit, unitPrice, total }) => ({
            position,
            description,
            quantity,
            unit,
            unitPrice,
            total,
          }),
        ),
      },
      steps: {
        create: rule.approvers.map((approver, index) => ({
          position: approver.position,
          approverId: approver.userId,
          status: state.steps[index],
          decidedAt:
            state.steps[index] === StepStatus.APPROVED ||
            state.steps[index] === StepStatus.REJECTED
              ? decidedAt.get(approver.position)
              : null,
        })),
      },
      events: { create: events },
    },
  });
}
