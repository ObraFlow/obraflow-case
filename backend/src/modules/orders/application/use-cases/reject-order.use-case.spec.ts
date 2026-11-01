import { DecideOrderDto } from '../dtos/decide-order.dto';
import { OrdersService } from '../services/orders.service';
import { PurchaseOrder } from '../../domain/entities/purchase-order.entity';
import { RejectOrderUseCase } from './reject-order.use-case';

const makeOrder = () =>
  PurchaseOrder.create({
    id: 1,
    workId: 2,
    supplierId: 3,
    orderDate: new Date('2026-01-01'),
    notes: null,
    totalCents: 3000,
    status: 'REJECTED',
    createdAt: new Date('2026-01-01'),
  });

describe('RejectOrderUseCase', () => {
  let service: { decide: jest.Mock };
  let useCase: RejectOrderUseCase;
  const input = { userId: 7, reason: 'preço alto' } as DecideOrderDto;

  beforeEach(() => {
    service = { decide: jest.fn() };
    useCase = new RejectOrderUseCase(service as unknown as OrdersService);
  });

  it('rejeita o pedido e retorna orderId e status', async () => {
    service.decide.mockResolvedValue(makeOrder());

    await expect(useCase.execute(1, input)).resolves.toEqual({
      orderId: 1,
      status: 'REJECTED',
    });
    expect(service.decide).toHaveBeenCalledWith(1, 7, false, 'preço alto');
  });

  it('lança erro quando o service retorna null', async () => {
    service.decide.mockResolvedValue(null);

    await expect(useCase.execute(1, input)).rejects.toThrow(
      'Pedido não encontrado ou não foi possível rejeitar.',
    );
  });

  it('propaga o erro do service', async () => {
    const error = new Error('O motivo da rejeição é obrigatório.');
    service.decide.mockRejectedValue(error);

    await expect(useCase.execute(1, input)).rejects.toBe(error);
  });
});
