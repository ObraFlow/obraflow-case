export type NonRelationalApprovalRule = {
  id: number;
  workId: number;
  minimumTotalCents: number;
  maximumTotalCents: number | null;
  createdAt: Date;
};

export type ApprovalRuleApprover = {
  id: number;
  ruleId: number;
  userId: number;
  userName: string;
  position: number;
};

export class ApprovalRule {
  private constructor(
    public readonly id: number,
    public readonly workId: number,
    public readonly minimumTotalCents: number,
    public readonly maximumTotalCents: number | null,
    public readonly createdAt: Date,
    public readonly approvers?: ApprovalRuleApprover[],
  ) {}

  static create(data: {
    id: number;
    workId: number;
    minimumTotalCents: number;
    maximumTotalCents: number | null;
    createdAt: Date;
    approvers?: ApprovalRuleApprover[];
  }): ApprovalRule {
    return new ApprovalRule(
      data.id,
      data.workId,
      data.minimumTotalCents,
      data.maximumTotalCents,
      data.createdAt,
      data.approvers,
    );
  }

  get nonRelationalData(): NonRelationalApprovalRule {
    return {
      id: this.id,
      workId: this.workId,
      minimumTotalCents: this.minimumTotalCents,
      maximumTotalCents: this.maximumTotalCents,
      createdAt: this.createdAt,
    };
  }

  appliesTo(totalCents: number): boolean {
    return (
      totalCents >= this.minimumTotalCents &&
      (this.maximumTotalCents === null || totalCents <= this.maximumTotalCents)
    );
  }
}
