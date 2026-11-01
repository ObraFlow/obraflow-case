import { SuppliersService } from '../services/suppliers.service';
import { Supplier } from '../../domain/entities/supplier.entity';
import { ListSuppliersUseCase } from './list-suppliers.use-case';

const makeSupplier = (id: number, name: string, document: string) =>
  Supplier.create({
    id,
    name,
    document,
    createdAt: new Date('2026-01-01'),
  });

describe('ListSuppliersUseCase', () => {
  let service: { list: jest.Mock };
  let useCase: ListSuppliersUseCase;

  beforeEach(() => {
    service = { list: jest.fn() };
    useCase = new ListSuppliersUseCase(service as unknown as SuppliersService);
  });

  it('retorna lista vazia quando não há fornecedores', async () => {
    service.list.mockResolvedValue([]);

    await expect(useCase.execute()).resolves.toEqual([]);
    expect(service.list).toHaveBeenCalledTimes(1);
  });

  it('mapeia todos os fornecedores para o DTO', async () => {
    service.list.mockResolvedValue([
      makeSupplier(1, 'Fornecedor X', '12345678000190'),
      makeSupplier(2, 'Fornecedor Y', '98765432000110'),
    ]);

    await expect(useCase.execute()).resolves.toEqual([
      {
        id: 1,
        name: 'Fornecedor X',
        document: '12345678000190',
        createdAt: new Date('2026-01-01'),
      },
      {
        id: 2,
        name: 'Fornecedor Y',
        document: '98765432000110',
        createdAt: new Date('2026-01-01'),
      },
    ]);
  });

  it('propaga o erro do service', async () => {
    const error = new Error('falhou');
    service.list.mockRejectedValue(error);

    await expect(useCase.execute()).rejects.toBe(error);
  });
});
