import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ApprovalTiersService } from '../approval-tiers/approval-tiers.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';
import { ListPurchaseOrdersQueryDto } from './dto/list-purchase-orders-query.dto.js';
import { calculateTotals } from './order-totals.js';

const userSummary = { select: { id: true, name: true, role: true } };

/** Everything the details screen shows: items, approval chain and history. */
const detailInclude = {
  site: { select: { id: true, code: true, name: true } },
  supplier: { select: { id: true, name: true, taxId: true } },
  requester: userSummary,
  items: { orderBy: { position: 'asc' } },
  steps: { orderBy: { position: 'asc' }, include: { approver: userSummary } },
  events: {
    orderBy: { sequence: 'asc' },
    include: { actor: { select: { id: true, name: true } } },
  },
} satisfies Prisma.PurchaseOrderInclude;

export type PurchaseOrderDetail = Prisma.PurchaseOrderGetPayload<{
  include: typeof detailInclude;
  omit: typeof hiddenFields;
}>;

const listInclude = {
  site: { select: { id: true, code: true, name: true } },
  supplier: { select: { id: true, name: true } },
  requester: { select: { id: true, name: true } },
  // The whole chain, so the list can show done, current and next approvers.
  steps: {
    orderBy: { position: 'asc' },
    select: {
      position: true,
      status: true,
      approver: { select: { id: true, name: true } },
    },
  },
  _count: { select: { items: true } },
} satisfies Prisma.PurchaseOrderInclude;

/** Internal idempotency fields are not part of the API responses. */
const hiddenFields = {
  idempotencyKey: true,
  requestHash: true,
} satisfies Prisma.PurchaseOrderOmit;

/**
 * Who can see an order: the requester and the approvers in its chain. Applied
 * in the WHERE of every read, so an order outside this set behaves exactly
 * like one that does not exist (404), without revealing that it exists.
 */
export function visibleTo(userId: string): Prisma.PurchaseOrderWhereInput {
  return {
    OR: [{ requesterId: userId }, { steps: { some: { approverId: userId } } }],
  };
}

const IDEMPOTENCY_KEY_REGEX = /^[\w-]{1,100}$/;

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** Result of a write that may be a retry of an earlier request. */
export interface OrderResult {
  order: PurchaseOrderDetail;
  /** True when the request repeated one already processed (nothing new was written). */
  replayed: boolean;
}

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalTiers: ApprovalTiersService,
  ) {}

  async findMany(actorId: string, query: ListPurchaseOrdersQueryDto) {
    const where: Prisma.PurchaseOrderWhereInput = {
      AND: [
        visibleTo(actorId),
        {
          status: query.status,
          siteId: query.siteId,
          ...(query.awaitingMe && {
            steps: { some: { approverId: actorId, status: 'CURRENT' } },
          }),
        },
      ],
    };

    // Count and page in one transaction so both see the same data.
    const [total, orders] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.count({ where }),
      this.prisma.purchaseOrder.findMany({
        where,
        orderBy: { number: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: listInclude,
        omit: hiddenFields,
      }),
    ]);

    const data = orders.map(({ _count, ...order }) => ({
      ...order,
      itemCount: _count.items,
      currentApprover:
        order.steps.find((step) => step.status === 'CURRENT')?.approver ?? null,
    }));
    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: string, actorId: string): Promise<PurchaseOrderDetail> {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, ...visibleTo(actorId) },
      include: detailInclude,
      omit: hiddenFields,
    });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado.');
    }
    return order;
  }

  /**
   * Creates the order with its items and copies the approval chain of the
   * matching tier. With an idempotency key, retrying the same request (double
   * click, network failure) returns the order created the first time.
   */
  async create(
    requesterId: string,
    dto: CreatePurchaseOrderDto,
    idempotencyKey?: string,
  ): Promise<OrderResult> {
    const key = parseIdempotencyKey(idempotencyKey);
    const requestHash = key ? hashRequest(dto) : null;
    if (key) {
      const replay = await this.findReplay(requesterId, key, requestHash);
      if (replay) return replay;
    }

    const totals = calculateTotals(dto.items);
    if (!totals.ok) {
      if (totals.error === 'NON_POSITIVE_QUANTITY') {
        throw new BadRequestException([
          `items.${totals.index}.quantity must be greater than zero`,
        ]);
      }
      throw new UnprocessableEntityException(
        'O total do pedido excede o valor máximo permitido.',
      );
    }

    await this.ensureReferencesExist(requesterId, dto);

    try {
      const { id } = await this.prisma.$transaction(async (tx) => {
        // Resolved in the same transaction that saves the order, so the chain
        // copied is exactly the rule that was read.
        const tier = await this.approvalTiers.resolve(
          dto.siteId,
          totals.total,
          tx,
        );
        if (!tier) {
          throw new UnprocessableEntityException(
            `Nenhuma faixa de alçada desta obra cobre o valor de ${brl.format(totals.total.toNumber())}. Cadastre uma faixa nas regras de alçada.`,
          );
        }

        return tx.purchaseOrder.create({
          data: {
            siteId: dto.siteId,
            supplierId: dto.supplierId,
            requesterId,
            orderDate: new Date(`${dto.orderDate}T00:00:00.000Z`),
            notes: dto.notes,
            total: totals.total,
            currentStep: 1,
            idempotencyKey: key,
            requestHash,
            items: {
              create: dto.items.map((item, index) => ({
                position: index + 1,
                description: item.description,
                unit: item.unit,
                quantity: totals.items[index].quantity,
                unitPrice: totals.items[index].unitPrice,
                total: totals.items[index].total,
              })),
            },
            // Snapshot of the chain: later edits to the tier do not affect this order.
            steps: {
              create: tier.approvers.map((approver, index) => ({
                position: index + 1,
                approverId: approver.userId,
                status: index === 0 ? 'CURRENT' : 'WAITING',
              })),
            },
            events: {
              create: {
                type: 'CREATED',
                actorId: requesterId,
                metadata: {
                  tierId: tier.id,
                  tierMaxAmount: tier.maxAmount?.toString() ?? null,
                  total: totals.total.toString(),
                  approverIds: tier.approvers.map((a) => a.userId),
                },
              },
            },
          },
          select: { id: true },
        });
      });
      return { order: await this.findOne(id, requesterId), replayed: false };
    } catch (error) {
      // Two requests with the same key at the same time: the unique index lets
      // only one insert succeed; the other returns the winner's order.
      if (key && isUniqueViolation(error)) {
        const replay = await this.findReplay(requesterId, key, requestHash);
        if (replay) return replay;
      }
      throw error;
    }
  }

  private async findReplay(
    requesterId: string,
    idempotencyKey: string,
    requestHash: string | null,
  ): Promise<OrderResult | null> {
    const existing = await this.prisma.purchaseOrder.findUnique({
      where: { requesterId_idempotencyKey: { requesterId, idempotencyKey } },
      select: { id: true, requestHash: true },
    });
    if (!existing) return null;
    if (existing.requestHash !== requestHash) {
      throw new UnprocessableEntityException(
        'Esta Idempotency-Key já foi usada em um pedido com outro conteúdo.',
      );
    }
    return {
      order: await this.findOne(existing.id, requesterId),
      replayed: true,
    };
  }

  /** Clear messages instead of a generic foreign key error. */
  private async ensureReferencesExist(
    requesterId: string,
    dto: CreatePurchaseOrderDto,
  ) {
    const [requester, site, supplier] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: requesterId },
        select: { id: true },
      }),
      this.prisma.constructionSite.findUnique({
        where: { id: dto.siteId },
        select: { id: true },
      }),
      this.prisma.supplier.findUnique({
        where: { id: dto.supplierId },
        select: { id: true },
      }),
    ]);
    if (!requester) {
      throw new UnauthorizedException(
        'O usuário da sessão não existe mais. Selecione outro usuário.',
      );
    }
    const errors: string[] = [];
    if (!site) errors.push('Obra não encontrada.');
    if (!supplier) errors.push('Fornecedor não encontrado.');
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
  }
}

function parseIdempotencyKey(value: string | undefined) {
  if (value === undefined) return null;
  if (!IDEMPOTENCY_KEY_REGEX.test(value)) {
    throw new BadRequestException(
      'Idempotency-Key must have 1 to 100 letters, digits, "-" or "_"',
    );
  }
  return value;
}

/**
 * Fingerprint of the request content. Fields are listed explicitly (not
 * JSON.stringify of the body) so key order and "2.5" vs "2.50" do not matter.
 */
function hashRequest(dto: CreatePurchaseOrderDto) {
  const canonical = [
    dto.siteId,
    dto.supplierId,
    dto.orderDate,
    dto.notes ?? null,
    dto.items.map((item) => [
      item.description,
      new Prisma.Decimal(item.quantity).toString(),
      item.unit,
      new Prisma.Decimal(item.unitPrice).toString(),
    ]),
  ];
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
