import { OrdersService } from '../services/orders.service';
import { PurchaseOrder } from '../../domain/entities/purchase-order.entity';
import { GetOrderUseCase } from './get-order.use-case';

const makeOrder = () =>
  PurchaseOrder.create({
    id: 1,
    workId: 2,
    supplierId: 3,
    orderDate: new Date('2026-01-01'),
    notes: null,
    totalCents: 3000,
    status: 'PENDING',
    createdAt: new Date('2026-01-01'),
  });

describe('GetOrderUseCase', () => {
  let service: { get: jest.Mock };
  let useCase: GetOrderUseCase;

  beforeEach(() => {
    service = { get: jest.fn() };
    useCase = new GetOrderUseCase(service as unknown as OrdersService);
  });

  it('retorna orderId e status do pedido', async () => {
    service.get.mockResolvedValue(makeOrder());

    await expect(useCase.execute(1)).resolves.toEqual({
      orderId: 1,
      status: 'PENDING',
    });
    expect(service.get).toHaveBeenCalledWith(1);
  });

  it('retorna null quando o pedido não existe', async () => {
    service.get.mockResolvedValue(null);

    await expect(useCase.execute(99)).resolves.toBeNull();
  });

  it('propaga o erro do service', async () => {
    const error = new Error('falhou');
    service.get.mockRejectedValue(error);

    await expect(useCase.execute(1)).rejects.toBe(error);
  });
});
