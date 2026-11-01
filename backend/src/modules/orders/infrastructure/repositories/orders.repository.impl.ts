import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, gte, lte, or, isNull } from 'drizzle-orm';
import { DATABASE } from '../../../../database/database.module';
import { Database, DatabaseClient } from '../../../../database/database.types';
import {
  approvalRuleApprovers,
  approvalRules,
  purchaseOrderApprovals,
  purchaseOrderItems,
  purchaseOrders,
  suppliers,
  works,
} from '../../../../database/schema';
import {
  CreateOrderData,
  OrdersRepository,
  ListedOrder,
} from '../../domain/repositories/orders.repository';
import { PurchaseOrder } from '../../domain/entities/purchase-order.entity';

@Injectable()
export class OrdersRepositoryImpl implements OrdersRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(): Promise<ListedOrder[]> {
    return this.db
      .select({
        id: purchaseOrders.id,
        status: purchaseOrders.status,
        orderDate: purchaseOrders.orderDate,
        totalCents: purchaseOrders.totalCents,
        work: works.name,
        supplier: suppliers.name,
      })
      .from(purchaseOrders)
      .innerJoin(works, eq(purchaseOrders.workId, works.id))
      .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .orderBy(desc(purchaseOrders.createdAt));
  }

  async getById(orderId: number): Promise<PurchaseOrder | null> {
    const [order] = await this.db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, orderId));
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    const orderWithClient = await this.getWithClient(this.db, orderId);
    return this.toDomainEntity(orderWithClient);
  }

  async create(data: CreateOrderData): Promise<PurchaseOrder | null> {
    const purchaseOrder = this.db.transaction(async (tx) => {
      const [work] = await tx
        .select({ id: works.id })
        .from(works)
        .where(eq(works.id, data.workId));
      const [supplier] = await tx
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(eq(suppliers.id, data.supplierId));
      if (!work) throw new NotFoundException('Obra não encontrada.');
      if (!supplier) throw new NotFoundException('Fornecedor não encontrado.');

      const [rule] = await tx
        .select()
        .from(approvalRules)
        .where(
          and(
            eq(approvalRules.workId, data.workId),
            lte(approvalRules.minimumTotalCents, data.totalCents),
            or(
              isNull(approvalRules.maximumTotalCents),
              gte(approvalRules.maximumTotalCents, data.totalCents),
            ),
          ),
        )
        .orderBy(desc(approvalRules.minimumTotalCents))
        .limit(1);
      if (!rule)
        throw new BadRequestException(
          'Não existe regra de alçada aplicável a este valor.',
        );

      const approvers = await tx
        .select()
        .from(approvalRuleApprovers)
        .where(eq(approvalRuleApprovers.ruleId, rule.id))
        .orderBy(asc(approvalRuleApprovers.position));
      if (!approvers.length)
        throw new ConflictException(
          'A regra selecionada não possui aprovadores.',
        );

      const [order] = await tx
        .insert(purchaseOrders)
        .values({
          workId: data.workId,
          supplierId: data.supplierId,
          orderDate: new Date(data.orderDate),
          notes: data.notes,
          totalCents: data.totalCents,
          status: 'PENDING',
        })
        .returning();
      await tx.insert(purchaseOrderItems).values(
        data.items.map((item) => ({
          orderId: order.id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPriceCents: item.unitPriceCents,
          totalCents: item.totalCents,
        })),
      );
      await tx.insert(purchaseOrderApprovals).values(
        approvers.map((approver) => ({
          orderId: order.id,
          approverId: approver.userId,
          position: approver.position,
          status: 'PENDING' as const,
        })),
      );
      return this.getWithClient(tx, order.id);
    });

    return this.toDomainEntity(await purchaseOrder);
  }

  async decide(
    orderId: number,
    userId: number,
    approve: boolean,
    reason?: string,
  ): Promise<PurchaseOrder | null> {
    const purchaseOrder = this.db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, orderId));
      if (!order) throw new NotFoundException('Pedido não encontrado.');
      if (order.status !== 'PENDING')
        throw new ConflictException('A cadeia de alçada já foi concluída.');

      const [step] = await tx
        .select()
        .from(purchaseOrderApprovals)
        .where(
          and(
            eq(purchaseOrderApprovals.orderId, orderId),
            eq(purchaseOrderApprovals.status, 'PENDING'),
          ),
        )
        .orderBy(asc(purchaseOrderApprovals.position))
        .limit(1);
      if (!step)
        throw new ConflictException('Nenhuma etapa pendente para este pedido.');
      if (step.approverId !== userId)
        throw new ConflictException('Este usuário não é o aprovador atual.');

      await tx
        .update(purchaseOrderApprovals)
        .set({
          status: approve ? 'APPROVED' : 'REJECTED',
          decidedAt: new Date(),
          rejectionReason: approve ? null : reason!.trim(),
        })
        .where(eq(purchaseOrderApprovals.id, step.id));
      if (!approve) {
        await tx
          .update(purchaseOrders)
          .set({ status: 'REJECTED' })
          .where(eq(purchaseOrders.id, orderId));
      } else {
        const [next] = await tx
          .select({ id: purchaseOrderApprovals.id })
          .from(purchaseOrderApprovals)
          .where(
            and(
              eq(purchaseOrderApprovals.orderId, orderId),
              eq(purchaseOrderApprovals.status, 'PENDING'),
            ),
          )
          .limit(1);
        if (!next)
          await tx
            .update(purchaseOrders)
            .set({ status: 'APPROVED' })
            .where(eq(purchaseOrders.id, orderId));
      }
      return this.getWithClient(tx, orderId);
    });

    return this.toDomainEntity(await purchaseOrder);
  }

  private async getWithClient(db: DatabaseClient, id: number) {
    const [order] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id));
    const items = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.orderId, id));
    const approvals = await db
      .select()
      .from(purchaseOrderApprovals)
      .where(eq(purchaseOrderApprovals.orderId, id))
      .orderBy(asc(purchaseOrderApprovals.position));
    return { ...order, items, approvals };
  }

  toDomainEntity(order: unknown): PurchaseOrder {
    const orderData = order as {
      id: number;
      workId: number;
      supplierId: number;
      orderDate: Date;
      notes?: string;
      totalCents: number;
      status: 'PENDING' | 'APPROVED' | 'REJECTED';
      createdAt: Date;
      updatedAt: Date;
      items: {
        id: number;
        orderId: number;
        description: string;
        quantity: string;
        unit: string;
        unitPriceCents: number;
        totalCents: number;
        createdAt: Date;
        updatedAt: Date;
      }[];
      approvals: {
        id: number;
        orderId: number;
        approverId: number;
        position: number;
        status: 'PENDING' | 'APPROVED' | 'REJECTED';
        decidedAt?: Date | null;
        rejectionReason?: string | null;
        createdAt: Date;
        updatedAt: Date;
      }[];
    };

    return PurchaseOrder.create({
      id: orderData.id,
      workId: orderData.workId,
      supplierId: orderData.supplierId,
      orderDate: orderData.orderDate,
      notes: orderData.notes ?? null,
      totalCents: orderData.totalCents,
      status: orderData.status,
      createdAt: orderData.createdAt,
      items: orderData.items.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPriceCents: item.unitPriceCents,
        totalCents: item.totalCents,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      approvals: orderData.approvals.map((approval) => ({
        id: approval.id,
        orderId: approval.orderId,
        approverId: approval.approverId,
        position: approval.position,
        status: approval.status,
        decidedAt: approval.decidedAt ?? null,
        rejectionReason: approval.rejectionReason ?? null,
        createdAt: approval.createdAt,
        updatedAt: approval.updatedAt,
      })),
    });
  }
}
