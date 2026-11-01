import { ApprovalRule } from '../entities/approval-rule.entity';

export const APPROVAL_RULES_REPOSITORY = Symbol('APPROVAL_RULES_REPOSITORY');

export type ApprovalRuleInput = {
  minimumTotalCents: number;
  maximumTotalCents?: number;
  approvers: { userId: number }[];
};

export type ApprovalRuleRange = {
  id: number;
  minimumTotalCents: number;
  maximumTotalCents: number | null;
};

export interface ApprovalRulesRepository {
  listByWork(workId: number): Promise<ApprovalRule[]>;
  workExists(workId: number): Promise<boolean>;
  findUserIds(ids: number[]): Promise<number[]>;
  listRangesByWork(workId: number): Promise<ApprovalRuleRange[]>;
  create(
    workId: number,
    input: ApprovalRuleInput,
  ): Promise<ApprovalRule | null>;
  update(
    workId: number,
    ruleId: number,
    input: ApprovalRuleInput,
  ): Promise<ApprovalRule | null>;
  remove(workId: number, ruleId: number): Promise<boolean>;
  toDomainEntity(data: unknown): ApprovalRule;
}
