// Demo data for the ObraFlow approvals case. Run with `pnpm db:seed`.
//
// Everything is created through the same services the API uses, with payloads
// validated by the same DTOs as the HTTP layer. Totals, approval chains and the
// history are therefore produced by the real business rules: the seed cannot
// insert data the API would refuse. It clears every table first, so it can run
// any number of times.

import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { ApprovalTierDto } from '../src/approval-tiers/dto/approval-tier.dto.js';
import { ApprovalTiersService } from '../src/approval-tiers/approval-tiers.service.js';
import { CreateConstructionSiteDto } from '../src/construction-sites/dto/create-construction-site.dto.js';
import { ConstructionSitesService } from '../src/construction-sites/construction-sites.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  ApproveDto,
  RejectDto,
} from '../src/purchase-orders/dto/decision.dto.js';
import { CreatePurchaseOrderDto } from '../src/purchase-orders/dto/create-purchase-order.dto.js';
import { OrderDecisionsService } from '../src/purchase-orders/order-decisions.service.js';
import { PurchaseOrdersService } from '../src/purchase-orders/purchase-orders.service.js';
import { CreateSupplierDto } from '../src/suppliers/dto/create-supplier.dto.js';
import { SuppliersService } from '../src/suppliers/suppliers.service.js';
import { CreateUserDto } from '../src/users/dto/create-user.dto.js';
import { UsersService } from '../src/users/users.service.js';

// ---------------------------------------------------------------------------
// Base data
// ---------------------------------------------------------------------------

const users = {
  joao: {
    name: 'João Silva',
    email: 'joao.silva@obraflow.dev',
    role: 'Engenheiro de obra',
  },
  amanda: {
    name: 'Amanda Costa',
    email: 'amanda.costa@obraflow.dev',
    role: 'Gerente de obras',
  },
  carla: {
    name: 'Carla Mendes',
    email: 'carla.mendes@obraflow.dev',
    role: 'Coordenadora de suprimentos',
  },
  ricardo: {
    name: 'Ricardo Alves',
    email: 'ricardo.alves@obraflow.dev',
    role: 'Diretor de operações',
  },
  bruno: {
    name: 'Bruno Lima',
    email: 'bruno.lima@obraflow.dev',
    role: 'Comprador',
  },
  fernanda: {
    name: 'Fernanda Rocha',
    email: 'fernanda.rocha@obraflow.dev',
    role: 'Compradora',
  },
};
type UserKey = keyof typeof users;

const sites = {
  horizonte: { code: 'OB-001', name: 'Residencial Horizonte' },
  galpao: { code: 'OB-002', name: 'Galpão Logístico Camaçari' },
  // No tiers on purpose: shows the "no applicable rule" case in the UI.
  pituba: { code: 'OB-003', name: 'Edifício Comercial Pituba' },
};
type SiteKey = keyof typeof sites;

// Fictitious companies and tax IDs.
const suppliers = {
  concreto: { name: 'Concreto Forte Ltda', taxId: '11.222.333/0001-81' },
  aco: { name: 'Aço Norte Distribuidora', taxId: '22.333.444/0001-92' },
  eletrica: {
    name: 'Elétrica Recôncavo Materiais',
    taxId: '33.444.555/0001-03',
  },
  locadora: { name: 'Equipa Locação de Máquinas', taxId: '44.555.666/0001-14' },
  tintas: { name: 'Cores da Bahia Tintas', taxId: '55.666.777/0001-25' },
};
type SupplierKey = keyof typeof suppliers;

// ---------------------------------------------------------------------------
// Approval tiers (maxAmount null = no upper limit)
// ---------------------------------------------------------------------------

const tiers: Partial<
  Record<SiteKey, { maxAmount: string | null; approvers: UserKey[] }[]>
> = {
  horizonte: [
    { maxAmount: '10000.00', approvers: ['joao'] },
    { maxAmount: null, approvers: ['joao', 'amanda'] },
  ],
  galpao: [
    { maxAmount: '5000.00', approvers: ['carla'] },
    { maxAmount: '50000.00', approvers: ['carla', 'amanda'] },
    { maxAmount: null, approvers: ['carla', 'amanda', 'ricardo'] },
  ],
};

// ---------------------------------------------------------------------------
// Purchase orders. Totals and chains are NOT written here: the services
// calculate them. The comments show what the rules are expected to produce.
// ---------------------------------------------------------------------------

type Outcome =
  | { kind: 'pending'; approvals: number }
  | { kind: 'approved' }
  | { kind: 'rejected'; atStep: number; reason: string };

interface OrderSeed {
  site: SiteKey;
  supplier: SupplierKey;
  requester: UserKey;
  orderDate: string;
  notes?: string;
  items: {
    description: string;
    quantity: string;
    unit: string;
    unitPrice: string;
  }[];
  outcome: Outcome;
}

const orders: OrderSeed[] = [
  // Residencial Horizonte
  {
    // 8,036.50 -> João
    site: 'horizonte',
    supplier: 'concreto',
    requester: 'bruno',
    orderDate: '2026-10-20',
    notes: 'Reposição para a concretagem da laje do 3º pavimento.',
    items: [
      {
        description: 'Cimento CP-II 50 kg',
        quantity: '160',
        unit: 'un',
        unitPrice: '38.90',
      },
      {
        description: 'Areia média lavada',
        quantity: '12.5',
        unit: 'm³',
        unitPrice: '145.00',
      },
    ],
    outcome: { kind: 'pending', approvals: 0 },
  },
  {
    // 12,255.00 -> João -> Amanda (João already approved)
    site: 'horizonte',
    supplier: 'aco',
    requester: 'bruno',
    orderDate: '2026-10-18',
    notes: 'Armação dos pilares do bloco B.',
    items: [
      {
        description: 'Vergalhão CA-50 10 mm',
        quantity: '900',
        unit: 'kg',
        unitPrice: '8.75',
      },
      {
        description: 'Arame recozido 18',
        quantity: '80',
        unit: 'kg',
        unitPrice: '18.50',
      },
      {
        description: 'Espaçador plástico para armadura',
        quantity: '2000',
        unit: 'un',
        unitPrice: '1.45',
      },
    ],
    outcome: { kind: 'pending', approvals: 1 },
  },
  {
    // 9,187.00 -> João
    site: 'horizonte',
    supplier: 'tintas',
    requester: 'bruno',
    orderDate: '2026-10-10',
    items: [
      {
        description: 'Tinta acrílica fosca branca 18 L',
        quantity: '30',
        unit: 'un',
        unitPrice: '289.90',
      },
      {
        description: 'Rolo de lã 23 cm',
        quantity: '20',
        unit: 'un',
        unitPrice: '24.50',
      },
    ],
    outcome: { kind: 'approved' },
  },
  {
    // 2,850.00 -> João (rejected at the first step)
    site: 'horizonte',
    supplier: 'locadora',
    requester: 'fernanda',
    orderDate: '2026-10-08',
    items: [
      {
        description: 'Locação de betoneira 400 L',
        quantity: '30',
        unit: 'dia',
        unitPrice: '95.00',
      },
    ],
    outcome: {
      kind: 'rejected',
      atStep: 1,
      reason:
        'Já temos uma betoneira disponível no canteiro. Pedido desnecessário.',
    },
  },

  // Galpão Logístico Camaçari
  {
    // 4,458.00 -> Carla
    site: 'galpao',
    supplier: 'eletrica',
    requester: 'fernanda',
    orderDate: '2026-10-21',
    items: [
      {
        description: 'Cabo flexível 6 mm²',
        quantity: '500',
        unit: 'm',
        unitPrice: '6.90',
      },
      {
        description: 'Disjuntor bipolar 32 A',
        quantity: '24',
        unit: 'un',
        unitPrice: '42.00',
      },
    ],
    outcome: { kind: 'pending', approvals: 0 },
  },
  {
    // 110,500.00 -> Carla -> Amanda -> Ricardo (Carla already approved)
    site: 'galpao',
    supplier: 'concreto',
    requester: 'fernanda',
    orderDate: '2026-10-19',
    notes: 'Piso industrial da área de docas.',
    items: [
      {
        description: 'Concreto usinado fck 30 MPa',
        quantity: '220',
        unit: 'm³',
        unitPrice: '485.00',
      },
      {
        description: 'Serviço de bombeamento',
        quantity: '1',
        unit: 'un',
        unitPrice: '3800.00',
      },
    ],
    outcome: { kind: 'pending', approvals: 1 },
  },
  {
    // 29,600.00 -> Carla -> Amanda (Amanda rejects)
    site: 'galpao',
    supplier: 'locadora',
    requester: 'fernanda',
    orderDate: '2026-10-12',
    items: [
      {
        description: 'Locação de escavadeira hidráulica com operador',
        quantity: '160',
        unit: 'h',
        unitPrice: '185.00',
      },
    ],
    outcome: {
      kind: 'rejected',
      atStep: 2,
      reason:
        'Valor da hora acima do contrato vigente com a locadora. Solicitar nova cotação.',
    },
  },
  {
    // 212,020.00 -> Carla -> Amanda -> Ricardo
    site: 'galpao',
    supplier: 'aco',
    requester: 'fernanda',
    orderDate: '2026-10-05',
    notes: 'Estrutura metálica da cobertura, conforme projeto rev. 03.',
    items: [
      {
        description: 'Perfil metálico estrutural',
        quantity: '18000',
        unit: 'kg',
        unitPrice: '9.80',
      },
      {
        description: 'Parafuso estrutural galvanizado',
        quantity: '1200',
        unit: 'un',
        unitPrice: '4.35',
      },
      {
        description: 'Montagem da estrutura',
        quantity: '320',
        unit: 'h',
        unitPrice: '95.00',
      },
    ],
    outcome: { kind: 'approved' },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function flatten(errors: ValidationError[], path = ''): string[] {
  return errors.flatMap((error) => {
    const field = path ? `${path}.${error.property}` : error.property;
    return [
      ...Object.values(error.constraints ?? {}).map(
        (message) => `${field}: ${message}`,
      ),
      ...flatten(error.children ?? [], field),
    ];
  });
}

/** Same transformation and validation the global ValidationPipe applies to HTTP bodies. */
async function dto<T extends object>(
  cls: new () => T,
  plain: object,
): Promise<T> {
  const instance = plainToInstance(cls, plain);
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length > 0) {
    throw new Error(`Invalid ${cls.name}:\n  ${flatten(errors).join('\n  ')}`);
  }
  return instance;
}

async function createAll<K extends string>(
  entries: Record<K, object>,
  create: (data: object) => Promise<{ id: string }>,
): Promise<Record<K, string>> {
  const ids = {} as Record<K, string>;
  for (const key of Object.keys(entries) as K[]) {
    ids[key] = (await create(entries[key])).id;
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

// Built by hand instead of through the Nest container: tsx does not emit the
// decorator metadata Nest uses for dependency injection.
const prisma = new PrismaService(new ConfigService());
const usersService = new UsersService(prisma);
const sitesService = new ConstructionSitesService(prisma);
const suppliersService = new SuppliersService(prisma);
const tiersService = new ApprovalTiersService(prisma);
const ordersService = new PurchaseOrdersService(prisma, tiersService);
const decisionsService = new OrderDecisionsService(prisma, ordersService);

async function main() {
  // RESTART IDENTITY resets the order number, so the demo starts at PC-0001.
  await prisma.$executeRaw`
    TRUNCATE TABLE
      "PurchaseOrderEvent", "ApprovalStep", "PurchaseOrderItem", "PurchaseOrder",
      "ApprovalTierApprover", "ApprovalTier", "Supplier", "User", "ConstructionSite"
    RESTART IDENTITY
  `;

  const userIds = await createAll(users, async (data) =>
    usersService.create(await dto(CreateUserDto, data)),
  );
  const siteIds = await createAll(sites, async (data) =>
    sitesService.create(await dto(CreateConstructionSiteDto, data)),
  );
  const supplierIds = await createAll(suppliers, async (data) =>
    suppliersService.create(await dto(CreateSupplierDto, data)),
  );

  for (const [site, siteTiers] of Object.entries(tiers)) {
    for (const tier of siteTiers ?? []) {
      const body = await dto(ApprovalTierDto, {
        maxAmount: tier.maxAmount,
        approverIds: tier.approvers.map((user) => userIds[user]),
      });
      await tiersService.create(siteIds[site as SiteKey], body);
    }
  }

  const summary: string[] = [];
  for (const seed of orders) {
    const body = await dto(CreatePurchaseOrderDto, {
      siteId: siteIds[seed.site],
      supplierId: supplierIds[seed.supplier],
      orderDate: seed.orderDate,
      notes: seed.notes,
      items: seed.items,
    });
    let { order } = await ordersService.create(userIds[seed.requester], body);

    const { outcome } = seed;
    const chainLength = order.steps.length;
    const approvals =
      outcome.kind === 'approved'
        ? chainLength
        : outcome.kind === 'pending'
          ? outcome.approvals
          : outcome.atStep - 1;
    // A pending order must still have a step left; a rejection must hit a real step.
    if (outcome.kind !== 'approved' && approvals >= chainLength) {
      throw new Error(
        `Order ${order.number}: outcome ${JSON.stringify(outcome)} does not fit a chain of ${chainLength} approvers`,
      );
    }

    // Each decision is made by the approver of the current step, in chain order.
    for (const step of order.steps.slice(0, approvals)) {
      const { version } = await dto(ApproveDto, { version: order.version });
      ({ order } = await decisionsService.approve(
        order.id,
        step.approverId,
        version,
      ));
    }
    if (outcome.kind === 'rejected') {
      const step = order.steps[outcome.atStep - 1];
      const { version, reason } = await dto(RejectDto, {
        version: order.version,
        reason: outcome.reason,
      });
      ({ order } = await decisionsService.reject(
        order.id,
        step.approverId,
        version,
        reason,
      ));
    }

    const chain = order.steps
      .map((s) => `${s.approver.name.split(' ')[0]}:${s.status}`)
      .join(' > ');
    summary.push(
      `  PC-${String(order.number).padStart(4, '0')}  ${sites[seed.site].code}  ${order.total.toFixed(2).padStart(10)}  ${order.status.padEnd(8)}  ${chain}`,
    );
  }

  console.log(
    `Seeded ${Object.keys(users).length} users, ${Object.keys(sites).length} sites, ` +
      `${Object.keys(suppliers).length} suppliers and ${orders.length} purchase orders:\n${summary.join('\n')}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
