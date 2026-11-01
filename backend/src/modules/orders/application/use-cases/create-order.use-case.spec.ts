import { CreateOrderDto } from '../dtos/create-order.dto';
import { OrdersService } from '../services/orders.service';
import { PurchaseOrder } from '../../domain/entities/purchase-order.entity';
import { CreateOrderUseCase } from './create-order.use-case';

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

describe('CreateOrderUseCase', () => {
  let service: { create: jest.Mock };
  let useCase: CreateOrderUseCase;
  const input = {
    workId: 2,
    supplierId: 3,
    items: [],
  } as unknown as CreateOrderDto;

  beforeEach(() => {
    service = { create: jest.fn() };
    useCase = new CreateOrderUseCase(service as unknown as OrdersService);
  });

  it('retorna apenas o id do pedido criado', async () => {
    service.create.mockResolvedValue(makeOrder());

    await expect(useCase.execute(input)).resolves.toEqual({ id: 1 });
    expect(service.create).toHaveBeenCalledWith(input);
  });

  it('retorna null quando o service retorna null', async () => {
    service.create.mockResolvedValue(null);

    await expect(useCase.execute(input)).resolves.toBeNull();
  });

  it('propaga o erro do service', async () => {
    const error = new Error('falhou');
    service.create.mockRejectedValue(error);

    await expect(useCase.execute(input)).rejects.toBe(error);
  });
});
