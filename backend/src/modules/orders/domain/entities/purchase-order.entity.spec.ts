import {
  PurchaseOrder,
  PurchaseOrderApproval,
  PurchaseOrderItem,
  PurchaseOrderStatus,
} from './purchase-order.entity';

const orderDate = new Date('2026-01-01');
const createdAt = new Date('2026-01-02');

const makeOrder = (
  status: PurchaseOrderStatus = 'PENDING',
  relations: {
    items?: PurchaseOrderItem[];
    approvals?: PurchaseOrderApproval[];
  } = {},
) =>
  PurchaseOrder.create({
    id: 1,
    workId: 2,
    supplierId: 3,
    orderDate,
    notes: 'obs',
    totalCents: 3000,
    status,
    createdAt,
    ...relations,
  });

describe('PurchaseOrder', () => {
  describe('create', () => {
    it('mapeia todos os campos, incluindo items e approvals', () => {
      const items: PurchaseOrderItem[] = [
        {
          id: 1,
          orderId: 1,
          description: 'Cimento',
          quantity: '2.000',
          unit: 'saco',
          unitPriceCents: 1500,
          totalCents: 3000,
        },
      ];
      const approvals: PurchaseOrderApproval[] = [
        {
          id: 1,
          orderId: 1,
          approverId: 5,
          position: 1,
          status: 'PENDING',
          decidedAt: null,
          rejectionReason: null,
        },
      ];

      const order = makeOrder('PENDING', { items, approvals });

      expect(order.id).toBe(1);
      expect(order.workId).toBe(2);
      expect(order.supplierId).toBe(3);
      expect(order.orderDate).toBe(orderDate);
      expect(order.notes).toBe('obs');
      expect(order.totalCents).toBe(3000);
      expect(order.status).toBe('PENDING');
      expect(order.createdAt).toBe(createdAt);
      expect(order.items).toBe(items);
      expect(order.approvals).toBe(approvals);
    });

    it('deixa items e approvals indefinidos quando não informados', () => {
      const order = makeOrder();

      expect(order.items).toBeUndefined();
      expect(order.approvals).toBeUndefined();
    });
  });

  describe('nonRelationalData', () => {
    it('retorna apenas os dados não relacionais', () => {
      const order = makeOrder('APPROVED', { items: [], approvals: [] });

      expect(order.nonRelationalData).toEqual({
        id: 1,
        workId: 2,
        supplierId: 3,
        orderDate,
        notes: 'obs',
        totalCents: 3000,
        status: 'APPROVED',
        createdAt,
      });
    });
  });

  describe('isPending', () => {
    it('é verdadeiro quando PENDING', () => {
      expect(makeOrder('PENDING').isPending).toBe(true);
    });

    it.each<PurchaseOrderStatus>(['APPROVED', 'REJECTED'])(
      'é falso quando %s',
      (status) => {
        expect(makeOrder(status).isPending).toBe(false);
      },
    );
  });

  describe('isFinished', () => {
    it.each<PurchaseOrderStatus>(['APPROVED', 'REJECTED'])(
      'é verdadeiro quando %s',
      (status) => {
        expect(makeOrder(status).isFinished).toBe(true);
      },
    );

    it('é falso quando PENDING', () => {
      expect(makeOrder('PENDING').isFinished).toBe(false);
    });
  });
});
