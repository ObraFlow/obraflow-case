import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { computeLineTotal, computeOrderTotal } from '../utils/money.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ApprovalError,
  NoMatchingRangeError,
  decide,
  resolveChain,
  type DecisionAction,
  type OrderState,
  type RuleRange,
} from './approval-engine.js';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';

// Include reutilizável: pedido sempre vem com obra, fornecedor, itens e cadeia.
const orderInclude = {
  project: true,
  supplier: true,
  items: true,
  steps: {
    orderBy: { position: 'asc' },
    include: { user: true },
  },
} satisfies Prisma.PurchaseOrderInclude;

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePurchaseOrderDto) {
    const [project, supplier] = await Promise.all([
      this.prisma.project.findUnique({ where: { id: dto.projectId } }),
      this.prisma.supplier.findUnique({ where: { id: dto.supplierId } }),
    ]);
    if (!project) throw new BadRequestException('Obra não encontrada.');
    if (!supplier) throw new BadRequestException('Fornecedor não encontrado.');

    const items = dto.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      lineTotal: computeLineTotal(item.quantity, item.unitPrice),
    }));
    const total = computeOrderTotal(dto.items);

    // Resolve a cadeia pelas faixas da obra; sem faixa aplicável -> 422.
    const ranges = await this.loadRanges(dto.projectId);
    let chain;
    try {
      chain = resolveChain(ranges, total);
    } catch (e) {
      if (e instanceof NoMatchingRangeError) {
        throw new UnprocessableEntityException(e.message);
      }
      throw e;
    }

    // Nested create é atômico: cabeçalho + itens + snapshot da cadeia numa transação.
    return this.prisma.purchaseOrder.create({
      data: {
        projectId: dto.projectId,
        supplierId: dto.supplierId,
        orderDate: new Date(dto.orderDate),
        notes: dto.notes,
        totalValue: total,
        status: 'PENDING',
        currentStep: 0,
        items: { create: items },
        steps: {
          create: chain.map((step) => ({
            position: step.position,
            userId: step.userId,
          })),
        },
      },
      include: orderInclude,
    });
  }

  async findAll(filter: { status?: string; currentApproverId?: string }) {
    const where: Prisma.PurchaseOrderWhereInput = {};
    if (filter.status) {
      where.status = {
        equals: filter.status as 'PENDING' | 'APPROVED' | 'REJECTED',
      };
    }
    // "Pendentes no nível do aprovador": pré-filtra no banco e refina em memória.
    if (filter.currentApproverId) {
      where.status = 'PENDING';
      where.steps = {
        some: { userId: filter.currentApproverId, decision: 'PENDING' },
      };
    }

    const orders = await this.prisma.purchaseOrder.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });

    if (!filter.currentApproverId) return orders;
    // O aprovador precisa ser o do nível ATUAL (position == currentStep).
    return orders.filter(
      (o) => o.steps[o.currentStep]?.userId === filter.currentApproverId,
    );
  }

  async findOne(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    return order;
  }

  approve(id: string, actingUserId: string) {
    return this.applyDecision(id, actingUserId, 'APPROVE');
  }

  reject(id: string, actingUserId: string, reason: string) {
    return this.applyDecision(id, actingUserId, 'REJECT', reason);
  }

  // --- helpers ---

  private async loadRanges(projectId: string): Promise<RuleRange[]> {
    const ranges = await this.prisma.approvalRange.findMany({
      where: { projectId },
      include: { approvalRangeSteps: { orderBy: { position: 'asc' } } },
    });
    return ranges.map((r) => ({
      id: r.id,
      minValue: Number(r.minValue),
      maxValue: r.maxValue === null ? null : Number(r.maxValue),
      approverUserIds: r.approvalRangeSteps.map((s) => s.userId),
    }));
  }

  private async applyDecision(
    id: string,
    actingUserId: string,
    action: DecisionAction,
    reason?: string,
  ) {
    const order = await this.findOne(id);

    const state: OrderState = {
      status: order.status,
      currentStep: order.currentStep,
      chain: order.steps.map((s) => ({
        position: s.position,
        userId: s.userId,
        decision: s.decision,
      })),
    };

    let outcome;
    try {
      outcome = decide(state, actingUserId, action, reason);
    } catch (e) {
      throw this.mapApprovalError(e);
    }

    // Transação + optimistic locking: só grava se a versão lida ainda for a atual.
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.purchaseOrder.updateMany({
        where: { id, version: order.version },
        data: {
          status: outcome.newStatus,
          currentStep: outcome.newCurrentStep,
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new ConflictException(
          'O pedido foi alterado por outra decisão. Recarregue e tente novamente.',
        );
      }

      await tx.orderApprovalStep.update({
        where: {
          orderId_position: { orderId: id, position: outcome.stepPosition },
        },
        data: {
          decision: outcome.stepDecision,
          reason: reason ?? null,
          decidedAt: new Date(),
        },
      });

      return tx.purchaseOrder.findUniqueOrThrow({
        where: { id },
        include: orderInclude,
      });
    });
  }

  // Traduz os códigos de erro do motor em exceções HTTP adequadas.
  private mapApprovalError(e: unknown): Error {
    if (!(e instanceof ApprovalError)) return e as Error;
    switch (e.code) {
      case 'NOT_CURRENT_APPROVER':
        return new ForbiddenException(e.message);
      case 'ORDER_NOT_PENDING':
        return new ConflictException(e.message);
      case 'REASON_REQUIRED':
        return new BadRequestException(e.message);
      default:
        return new BadRequestException(e.message);
    }
  }
}
