import { OrdersService } from '../services/orders.service';
import { PurchaseOrder } from '../../domain/entities/purchase-order.entity';
import { ApproveOrderUseCase } from './approve-order.use-case';

const makeOrder = () =>
  PurchaseOrder.create({
    id: 1,
    workId: 2,
    supplierId: 3,
    orderDate: new Date('2026-01-01'),
    notes: null,
    totalCents: 3000,
    status: 'APPROVED',
    createdAt: new Date('2026-01-01'),
  });

describe('ApproveOrderUseCase', () => {
  let service: { decide: jest.Mock };
  let useCase: ApproveOrderUseCase;

  beforeEach(() => {
    service = { decide: jest.fn() };
    useCase = new ApproveOrderUseCase(service as unknown as OrdersService);
  });

  it('aprova o pedido e retorna orderId e status', async () => {
    service.decide.mockResolvedValue(makeOrder());

    await expect(useCase.execute(1, 7)).resolves.toEqual({
      orderId: 1,
      status: 'APPROVED',
    });
    expect(service.decide).toHaveBeenCalledWith(1, 7, true);
  });

  it('lança erro quando o service retorna null', async () => {
    service.decide.mockResolvedValue(null);

    await expect(useCase.execute(1, 7)).rejects.toThrow(
      'Pedido não encontrado ou não foi possível aprovar.',
    );
  });

  it('propaga o erro do service', async () => {
    const error = new Error('falhou');
    service.decide.mockRejectedValue(error);

    await expect(useCase.execute(1, 7)).rejects.toBe(error);
  });
});
