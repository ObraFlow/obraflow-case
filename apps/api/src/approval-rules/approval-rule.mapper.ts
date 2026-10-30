import type {
  ApprovalRule,
  ApprovalRuleApprover,
  User,
} from '../../prisma/generated/client.js';
import type { RuleWithRange } from '../common/domain/approval-rules.js';
import { formatMoney } from '../common/domain/money.js';
import { toUserSummary } from '../users/user.mapper.js';

export type RuleWithApprovers = ApprovalRule & {
  approvers: (ApprovalRuleApprover & { user: User })[];
};

/** Faixa no formato da API: início calculado, limite e cadeia ordenada. */
export function toRuleResponse(rule: RuleWithRange<RuleWithApprovers>) {
  return {
    id: rule.id,
    position: rule.position,
    fromAmount: formatMoney(rule.fromAmount),
    maxAmount: rule.maxAmount ? formatMoney(rule.maxAmount) : null,
    approvers: rule.approvers.map((approver) => ({
      position: approver.position,
      user: toUserSummary(approver.user),
    })),
    updatedAt: rule.updatedAt,
  };
}
