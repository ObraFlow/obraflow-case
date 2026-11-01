export type PurchaseOrderStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type NonRelationalPurchaseOrder = {
  id: number;
  workId: number;
  supplierId: number;
  orderDate: Date;
  notes: string | null;
  totalCents: number;
  status: PurchaseOrderStatus;
  createdAt: Date;
};

export type PurchaseOrderItem = {
  id: number;
  orderId: number;
  description: string;
  quantity: string;
  unit: string;
  unitPriceCents: number;
  totalCents: number;
};

export type PurchaseOrderApproval = {
  id: number;
  orderId: number;
  approverId: number;
  position: number;
  status: ApprovalStatus;
  decidedAt: Date | null;
  rejectionReason: string | null;
};

export class PurchaseOrder {
  private constructor(
    public readonly id: number,
    public readonly workId: number,
    public readonly supplierId: number,
    public readonly orderDate: Date,
    public readonly notes: string | null,
    public readonly totalCents: number,
    public readonly status: PurchaseOrderStatus,
    public readonly createdAt: Date,
    public readonly items?: PurchaseOrderItem[],
    public readonly approvals?: PurchaseOrderApproval[],
  ) {}

  static create(data: {
    id: number;
    workId: number;
    supplierId: number;
    orderDate: Date;
    notes: string | null;
    totalCents: number;
    status: PurchaseOrderStatus;
    createdAt: Date;
    items?: PurchaseOrderItem[];
    approvals?: PurchaseOrderApproval[];
  }): PurchaseOrder {
    return new PurchaseOrder(
      data.id,
      data.workId,
      data.supplierId,
      data.orderDate,
      data.notes,
      data.totalCents,
      data.status,
      data.createdAt,
      data.items,
      data.approvals,
    );
  }

  get nonRelationalData(): NonRelationalPurchaseOrder {
    return {
      id: this.id,
      workId: this.workId,
      supplierId: this.supplierId,
      orderDate: this.orderDate,
      notes: this.notes,
      totalCents: this.totalCents,
      status: this.status,
      createdAt: this.createdAt,
    };
  }

  get isPending(): boolean {
    return this.status === 'PENDING';
  }

  get isFinished(): boolean {
    return this.status === 'APPROVED' || this.status === 'REJECTED';
  }
}
