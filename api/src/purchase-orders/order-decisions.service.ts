import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  OrderResult,
  PurchaseOrdersService,
  visibleTo,
} from './purchase-orders.service.js';

type Decision = { type: 'approve' } | { type: 'reject'; reason: string };

const STALE_MESSAGE =
  'O pedido foi alterado por outra pessoa. Recarregue e tente novamente.';

/**
 * Approve and reject, one step at a time and in chain order.
 *
 * Invariant used for idempotency: every decision increments the order version
 * by exactly one and decides exactly one step, in order. So a decision sent
 * with version v always targets step v + 1.
 */
@Injectable()
export class OrderDecisionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: PurchaseOrdersService,
  ) {}

  approve(orderId: string, actorId: string, version: number) {
    return this.decide(orderId, actorId, version, { type: 'approve' });
  }

  reject(orderId: string, actorId: string, version: number, reason: string) {
    return this.decide(orderId, actorId, version, { type: 'reject', reason });
  }

  private async decide(
    orderId: string,
    actorId: string,
    version: number,
    decision: Decision,
  ): Promise<OrderResult> {
    const replayed = await this.prisma.$transaction(async (tx) => {
      // Someone outside the order gets the same 404 as for a missing order.
      const order = await tx.purchaseOrder.findFirst({
        where: { id: orderId, ...visibleTo(actorId) },
        select: {
          status: true,
          version: true,
          currentStep: true,
          steps: {
            orderBy: { position: 'asc' },
            select: { id: true, position: true, approverId: true },
          },
        },
      });
      if (!order) {
        throw new NotFoundException('Pedido não encontrado.');
      }

      if (order.status !== 'PENDING' || order.version !== version) {
        // A retry of a decision that already succeeded returns 200, not an error.
        if (await isRepeated(tx, orderId, actorId, version, decision)) {
          return true;
        }
        throw new ConflictException(
          order.status !== 'PENDING'
            ? 'Este pedido já foi finalizado.'
            : STALE_MESSAGE,
        );
      }

      const current = order.steps.find(
        (step) => step.position === order.currentStep,
      );
      if (!current || current.approverId !== actorId) {
        throw new ForbiddenException(
          order.steps.some((step) => step.approverId === actorId)
            ? 'Ainda não é a sua vez de decidir este pedido.'
            : 'Você não é aprovador deste pedido.',
        );
      }

      const isLast = current.position === order.steps.length;
      const status =
        decision.type === 'reject'
          ? 'REJECTED'
          : isLast
            ? 'APPROVED'
            : 'PENDING';

      // Optimistic lock. UPDATE locks the row, so a concurrent decision waits
      // here; when it runs, the version no longer matches and it updates 0 rows.
      const guard = await tx.purchaseOrder.updateMany({
        where: { id: orderId, version, status: 'PENDING' },
        data: {
          version: { increment: 1 },
          status,
          currentStep: status === 'PENDING' ? current.position + 1 : null,
        },
      });
      if (guard.count === 0) {
        // Lost the race: a double click is a repeat, anything else is a conflict.
        if (await isRepeated(tx, orderId, actorId, version, decision)) {
          return true;
        }
        throw new ConflictException(STALE_MESSAGE);
      }

      const decidedAt = new Date();
      const metadata = { version, step: current.position };

      if (decision.type === 'approve') {
        await tx.approvalStep.update({
          where: { id: current.id },
          data: { status: 'APPROVED', decidedAt },
        });
        if (!isLast) {
          await tx.approvalStep.update({
            where: {
              orderId_position: { orderId, position: current.position + 1 },
            },
            data: { status: 'CURRENT' },
          });
        }
        await tx.purchaseOrderEvent.create({
          data: { orderId, type: 'APPROVED', actorId, metadata },
        });
        if (isLast) {
          await tx.purchaseOrderEvent.create({
            data: { orderId, type: 'COMPLETED', metadata },
          });
        }
      } else {
        await tx.approvalStep.update({
          where: { id: current.id },
          data: { status: 'REJECTED', decidedAt, reason: decision.reason },
        });
        // Rejection stops the flow: the remaining steps will never be reached.
        await tx.approvalStep.updateMany({
          where: { orderId, status: 'WAITING' },
          data: { status: 'CANCELLED' },
        });
        await tx.purchaseOrderEvent.create({
          data: {
            orderId,
            type: 'REJECTED',
            actorId,
            reason: decision.reason,
            metadata,
          },
        });
      }
      return false;
    });

    return { order: await this.orders.findOne(orderId, actorId), replayed };
  }
}

/**
 * Did this user already make this same decision on the step version v targeted?
 * A rejection only counts as the same when the reason is the same too: a retry
 * with another reason is a conflict, so the client never believes the new
 * reason was saved when the first one was kept.
 */
async function isRepeated(
  tx: Prisma.TransactionClient,
  orderId: string,
  actorId: string,
  version: number,
  decision: Decision,
) {
  const step = await tx.approvalStep.findUnique({
    where: { orderId_position: { orderId, position: version + 1 } },
    select: { approverId: true, status: true, reason: true },
  });
  if (step?.approverId !== actorId) return false;
  return decision.type === 'approve'
    ? step.status === 'APPROVED'
    : step.status === 'REJECTED' && step.reason === decision.reason;
}
