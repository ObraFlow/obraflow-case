import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../common/errors/app.exception.js';
import { isUniqueViolation } from '../common/errors/prisma-errors.js';
import {
  coverage,
  resolveRule,
  withRanges,
} from '../common/domain/approval-rules.js';
import { Decimal, formatBRL, formatMoney } from '../common/domain/money.js';
import { PrismaService } from '../common/prisma/prisma.service.js';
import type { ApprovalRuleDto } from './approval-rule.dto.js';
import {
  type RuleWithApprovers,
  toRuleResponse,
} from './approval-rule.mapper.js';

const WITH_APPROVERS = {
  approvers: { orderBy: { position: 'asc' }, include: { user: true } },
} as const;

@Injectable()
export class ApprovalRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectId: number) {
    await this.findProject(projectId);
    const rules = await this.findRules(projectId);
    const { status, uncoveredFrom } = coverage(rules);
    return {
      projectId,
      coverage: {
        status,
        uncoveredFrom: uncoveredFrom ? formatMoney(uncoveredFrom) : null,
      },
      data: withRanges(rules).map(toRuleResponse),
    };
  }

  async create(projectId: number, dto: ApprovalRuleDto) {
    await this.findProject(projectId);
    await this.assertUsersExist(dto.approverIds);

    const rule = await this.saveOrTranslateConflict(dto, () =>
      this.prisma.approvalRule.create({
        data: {
          projectId,
          maxAmount: dto.maxAmount,
          approvers: { create: toApproverRows(dto.approverIds) },
        },
      }),
    );
    return this.findWithRange(projectId, rule.id);
  }

  /** Substitui o limite e a cadeia inteira da faixa (reordenar = enviar a nova ordem). */
  async update(id: number, dto: ApprovalRuleDto) {
    const existing = await this.findRule(id);
    await this.assertUsersExist(dto.approverIds);

    // Uma única escrita aninhada (transação implícita): o UPDATE da faixa vem primeiro e trava a linha,
    // então duas edições simultâneas da mesma faixa são aplicadas uma depois da outra, sem misturar
    // as cadeias. A faixa nunca fica, nem por um instante, sem aprovadores ou com a cadeia pela metade.
    await this.saveOrTranslateConflict(dto, () =>
      this.prisma.approvalRule.update({
        where: { id },
        data: {
          maxAmount: dto.maxAmount,
          approvers: {
            deleteMany: {},
            create: toApproverRows(dto.approverIds),
          },
        },
      }),
    );
    return this.findWithRange(existing.projectId, id);
  }

  /** Remove a faixa. Pedidos já criados guardam a sua própria cópia da cadeia e não são afetados. */
  async remove(id: number) {
    await this.findRule(id);
    await this.prisma.approvalRule.delete({ where: { id } });
  }

  /** Prévia da cadeia para um valor — usa a mesma função da criação de pedidos. */
  async resolve(projectId: number, amount: string) {
    const project = await this.findProject(projectId);
    const value = new Decimal(amount);
    const rule = resolveRule(await this.findRules(projectId), value);
    if (!rule) {
      return {
        amount: formatMoney(value),
        matched: false,
        rule: null,
        message: noRuleMessage(value, project.name),
      };
    }
    return {
      amount: formatMoney(value),
      matched: true,
      rule: toRuleResponse(rule),
    };
  }

  // -------------------------------------------------------------------------

  private async findProject(projectId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw AppException.notFound('Obra não encontrada.');
    return project;
  }

  private async findRule(id: number) {
    const rule = await this.prisma.approvalRule.findUnique({ where: { id } });
    if (!rule) throw AppException.notFound('Faixa de alçada não encontrada.');
    return rule;
  }

  private findRules(projectId: number): Promise<RuleWithApprovers[]> {
    return this.prisma.approvalRule.findMany({
      where: { projectId },
      include: WITH_APPROVERS,
    });
  }

  /** A posição e o início da faixa dependem das outras faixas da obra, então são recalculados. */
  private async findWithRange(projectId: number, ruleId: number) {
    const ranged = withRanges(await this.findRules(projectId)).find(
      (rule) => rule.id === ruleId,
    )!;
    return toRuleResponse(ranged);
  }

  private async assertUsersExist(userIds: number[]) {
    const found = await this.prisma.user.count({
      where: { id: { in: userIds } },
    });
    if (found !== userIds.length) {
      throw AppException.unprocessable(
        'INVALID_REFERENCE',
        'Um ou mais aprovadores não existem.',
        [
          {
            field: 'approverIds',
            message: 'Selecione apenas usuários cadastrados.',
          },
        ],
      );
    }
  }

  /**
   * A unicidade do limite por obra é garantida pelo índice único do banco
   * (projectId, maxAmount) NULLS NOT DISTINCT — inclusive com requisições simultâneas.
   * Aqui só traduzimos a violação para a mensagem certa.
   */
  private async saveOrTranslateConflict<T>(
    dto: ApprovalRuleDto,
    save: () => Promise<T>,
  ) {
    try {
      return await save();
    } catch (error) {
      if (!isUniqueViolation(error, 'maxAmount')) throw error;
      if (dto.maxAmount === null) {
        throw new AppException(
          HttpStatus.CONFLICT,
          'UNLIMITED_RULE_EXISTS',
          'Esta obra já tem uma faixa "sem limite".',
          [
            {
              field: 'maxAmount',
              message: 'Já existe uma faixa "sem limite" nesta obra.',
            },
          ],
        );
      }
      throw new AppException(
        HttpStatus.CONFLICT,
        'DUPLICATE_LIMIT',
        `Já existe uma faixa com o limite de ${formatBRL(new Decimal(dto.maxAmount))} nesta obra.`,
        [
          {
            field: 'maxAmount',
            message: 'Já existe uma faixa com este limite nesta obra.',
          },
        ],
      );
    }
  }
}

function toApproverRows(approverIds: number[]) {
  return approverIds.map((userId, index) => ({ userId, position: index + 1 }));
}

export function noRuleMessage(amount: Decimal, projectName: string) {
  return `Nenhuma faixa de alçada cobre ${formatBRL(amount)} na obra ${projectName}.`;
}
