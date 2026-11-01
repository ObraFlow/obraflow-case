import { OrdersService } from '../services/orders.service';
import { ListOrdersUseCase } from './list-orders.use-case';

describe('ListOrdersUseCase', () => {
  let service: { list: jest.Mock };
  let useCase: ListOrdersUseCase;

  beforeEach(() => {
    service = { list: jest.fn() };
    useCase = new ListOrdersUseCase(service as unknown as OrdersService);
  });

  it('retorna lista vazia quando não há pedidos', async () => {
    service.list.mockResolvedValue([]);

    await expect(useCase.execute()).resolves.toEqual([]);
    expect(service.list).toHaveBeenCalledTimes(1);
  });

  it('mapeia os pedidos e converte orderDate para ISO string', async () => {
    service.list.mockResolvedValue([
      {
        id: 1,
        status: 'PENDING',
        orderDate: new Date('2026-01-01T10:00:00.000Z'),
        totalCents: 3000,
        work: { id: 2, name: 'Obra A' },
        supplier: { id: 3, name: 'Fornecedor X' },
      },
      {
        id: 2,
        status: 'APPROVED',
        orderDate: new Date('2026-02-01T00:00:00.000Z'),
        totalCents: 500,
        work: { id: 2, name: 'Obra A' },
        supplier: { id: 4, name: 'Fornecedor Y' },
      },
    ]);

    await expect(useCase.execute()).resolves.toEqual([
      {
        id: 1,
        status: 'PENDING',
        orderDate: '2026-01-01T10:00:00.000Z',
        totalCents: 3000,
        work: { id: 2, name: 'Obra A' },
        supplier: { id: 3, name: 'Fornecedor X' },
      },
      {
        id: 2,
        status: 'APPROVED',
        orderDate: '2026-02-01T00:00:00.000Z',
        totalCents: 500,
        work: { id: 2, name: 'Obra A' },
        supplier: { id: 4, name: 'Fornecedor Y' },
      },
    ]);
  });

  it('propaga o erro do service', async () => {
    const error = new Error('falhou');
    service.list.mockRejectedValue(error);

    await expect(useCase.execute()).rejects.toBe(error);
  });
});
