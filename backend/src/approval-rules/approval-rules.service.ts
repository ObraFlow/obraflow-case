import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateApprovalRangeDto,
  UpdateApprovalRangeDto,
} from './dto/approval-range.dto.js';

// Include reutilizável: sempre traz os aprovadores em ordem, com o usuário.
const rangeInclude = {
  approvalRangeSteps: {
    orderBy: { position: 'asc' },
    include: { user: true },
  },
} satisfies Prisma.ApprovalRangeInclude;

@Injectable()
export class ApprovalRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async listByProject(projectId: string) {
    await this.ensureProject(projectId);
    return this.prisma.approvalRange.findMany({
      where: { projectId },
      include: rangeInclude,
      orderBy: { minValue: 'asc' },
    });
  }

  async findOne(id: string) {
    const range = await this.prisma.approvalRange.findUnique({
      where: { id },
      include: rangeInclude,
    });
    if (!range) throw new NotFoundException('Faixa de alçada não encontrada.');
    return range;
  }

  async create(projectId: string, dto: CreateApprovalRangeDto) {
    await this.ensureProject(projectId);
    this.validateBounds(dto.minValue, dto.maxValue ?? null);
    await this.ensureUsersExist(dto.approverUserIds);
    await this.ensureNoOverlap(projectId, dto.minValue, dto.maxValue ?? null);

    return this.prisma.approvalRange.create({
      data: {
        projectId,
        minValue: dto.minValue,
        maxValue: dto.maxValue ?? null,
        approvalRangeSteps: {
          create: dto.approverUserIds.map((userId, index) => ({
            userId,
            position: index,
          })),
        },
      },
      include: rangeInclude,
    });
  }

  async update(id: string, dto: UpdateApprovalRangeDto) {
    const range = await this.findOne(id);

    const minValue = dto.minValue ?? Number(range.minValue);
    const maxValue =
      dto.maxValue !== undefined
        ? dto.maxValue
        : range.maxValue === null
          ? null
          : Number(range.maxValue);

    this.validateBounds(minValue, maxValue);
    await this.ensureNoOverlap(range.projectId, minValue, maxValue, id);

    if (dto.approverUserIds) {
      await this.ensureUsersExist(dto.approverUserIds);
    }

    // Reescreve a cadeia (posições) de forma atômica quando os aprovadores mudam.
    return this.prisma.$transaction(async (tx) => {
      await tx.approvalRange.update({
        where: { id },
        data: { minValue, maxValue },
      });

      if (dto.approverUserIds) {
        await tx.approvalRangeStep.deleteMany({ where: { rangeId: id } });
        await tx.approvalRangeStep.createMany({
          data: dto.approverUserIds.map((userId, index) => ({
            rangeId: id,
            userId,
            position: index,
          })),
        });
      }

      return tx.approvalRange.findUniqueOrThrow({
        where: { id },
        include: rangeInclude,
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.approvalRange.delete({ where: { id } });
    return { id };
  }

  // --- helpers ---

  private async ensureProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Obra não encontrada.');
  }

  private validateBounds(minValue: number, maxValue: number | null) {
    if (maxValue !== null && maxValue < minValue) {
      throw new BadRequestException(
        'O valor máximo da faixa deve ser maior ou igual ao mínimo.',
      );
    }
  }

  private async ensureUsersExist(userIds: string[]) {
    const unique = [...new Set(userIds)];
    const found = await this.prisma.user.count({
      where: { id: { in: unique } },
    });
    if (found !== unique.length) {
      throw new BadRequestException(
        'Um ou mais aprovadores informados não existem.',
      );
    }
  }

  /**
   * Faixas contíguas podem tocar em um ponto (ex.: "até 10.000" e
   * "acima de 10.000"), mas não podem se sobrepor no interior. A comparação
   * estrita (`<`) permite o toque e bloqueia a sobreposição real.
   */
  private async ensureNoOverlap(
    projectId: string,
    minValue: number,
    maxValue: number | null,
    excludeId?: string,
  ) {
    const existing = await this.prisma.approvalRange.findMany({
      where: { projectId, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });

    const aMax = maxValue ?? Number.POSITIVE_INFINITY;
    for (const r of existing) {
      const bMin = Number(r.minValue);
      const bMax =
        r.maxValue === null ? Number.POSITIVE_INFINITY : Number(r.maxValue);
      const overlaps = Math.max(minValue, bMin) < Math.min(aMax, bMax);
      if (overlaps) {
        throw new ConflictException(
          'A faixa informada se sobrepõe a uma faixa já existente nesta obra.',
        );
      }
    }
  }
}
