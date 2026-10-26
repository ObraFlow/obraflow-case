import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApprovalTierDto } from './dto/approval-tier.dto.js';

/** Approvers in chain order, with the user data the UI needs. */
const approversInclude = {
  approvers: {
    orderBy: { position: 'asc' },
    include: { user: { select: { id: true, name: true, role: true } } },
  },
} satisfies Prisma.ApprovalTierInclude;

/** Bounded tiers from the smallest limit up; the "no upper limit" tier last. */
const byMaxAmount = {
  maxAmount: { sort: 'asc', nulls: 'last' },
} satisfies Prisma.ApprovalTierOrderByWithRelationInput;

function parseMaxAmount(value: string | null): Prisma.Decimal | null {
  if (value === null) return null;
  const amount = new Prisma.Decimal(value);
  if (amount.lessThanOrEqualTo(0)) {
    throw new BadRequestException('maxAmount must be greater than zero');
  }
  return amount;
}

function toApprovers(approverIds: string[]) {
  return approverIds.map((userId, index) => ({ userId, position: index + 1 }));
}

@Injectable()
export class ApprovalTiersService {
  constructor(private readonly prisma: PrismaService) {}

  async findBySite(siteId: string) {
    await this.ensureSiteExists(siteId);
    const tiers = await this.prisma.approvalTier.findMany({
      where: { siteId },
      orderBy: byMaxAmount,
      include: approversInclude,
    });

    // A tier starts right after the previous tier's limit. Only the upper limit is
    // stored, so the lower bound is derived here and can never be inconsistent.
    return tiers.map((tier, index) => ({
      ...tier,
      minAmount: index === 0 ? null : tiers[index - 1].maxAmount,
    }));
  }

  async create(siteId: string, dto: ApprovalTierDto) {
    const maxAmount = parseMaxAmount(dto.maxAmount);
    await this.ensureSiteExists(siteId);
    await this.ensureUsersExist(dto.approverIds);

    return this.withTierConflictMessage(() =>
      this.prisma.approvalTier.create({
        data: {
          siteId,
          maxAmount,
          approvers: { create: toApprovers(dto.approverIds) },
        },
        include: approversInclude,
      }),
    );
  }

  async update(id: string, dto: ApprovalTierDto) {
    const maxAmount = parseMaxAmount(dto.maxAmount);
    await this.ensureUsersExist(dto.approverIds);

    // Replacing the whole approver list in one transaction avoids clashes on the
    // unique position while reordering, and readers never see a half-updated chain.
    return this.withTierConflictMessage(() =>
      this.prisma.$transaction(async (tx) => {
        await tx.approvalTierApprover.deleteMany({ where: { tierId: id } });
        return tx.approvalTier.update({
          where: { id }, // missing tier -> P2025 -> 404 (global filter)
          data: {
            maxAmount,
            approvers: { create: toApprovers(dto.approverIds) },
          },
          include: approversInclude,
        });
      }),
    );
  }

  async remove(id: string) {
    // Approvers are removed by cascade. Existing orders keep their own copy of the
    // chain (ApprovalStep), so they are not affected.
    await this.prisma.approvalTier.delete({ where: { id } });
  }

  /**
   * The tier that applies to an order total: the smallest limit that covers it,
   * or the "no upper limit" tier. Returns null when no tier covers the total.
   * Accepts a transaction client so order creation can resolve and save atomically.
   */
  resolve(
    siteId: string,
    total: Prisma.Decimal,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    return db.approvalTier.findFirst({
      where: {
        siteId,
        OR: [{ maxAmount: { gte: total } }, { maxAmount: null }],
      },
      orderBy: byMaxAmount,
      include: approversInclude,
    });
  }

  async getChain(siteId: string, amount: string) {
    await this.ensureSiteExists(siteId);
    const tier = await this.resolve(siteId, new Prisma.Decimal(amount));
    return { amount, tier };
  }

  private async ensureSiteExists(siteId: string) {
    const site = await this.prisma.constructionSite.findUnique({
      where: { id: siteId },
      select: { id: true },
    });
    if (!site) {
      throw new NotFoundException('Obra não encontrada.');
    }
  }

  private async ensureUsersExist(userIds: string[]) {
    const found = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true },
    });
    const foundIds = new Set(found.map((user) => user.id));
    const missing = userIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Aprovadores não encontrados: ${missing.join(', ')}`,
      );
    }
  }

  /** The unique (siteId, maxAmount) index gets a clearer message than the generic 409. */
  private async withTierConflictMessage<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Esta obra já tem uma faixa com esse limite de valor.',
        );
      }
      throw error;
    }
  }
}
