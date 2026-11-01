import { SuppliersService } from '../services/suppliers.service';
import { CreateSupplierData } from '../../domain/repositories/suppliers.repository';
import { Supplier } from '../../domain/entities/supplier.entity';
import { CreateSupplierUseCase } from './create-supplier.use-case';

const createdAt = new Date('2026-01-01');

const makeSupplier = () =>
  Supplier.create({
    id: 1,
    name: 'Fornecedor X',
    document: '12345678000190',
    createdAt,
  });

describe('CreateSupplierUseCase', () => {
  let service: { create: jest.Mock };
  let useCase: CreateSupplierUseCase;
  const input = {
    name: 'Fornecedor X',
    document: '12345678000190',
  } as CreateSupplierData;

  beforeEach(() => {
    service = { create: jest.fn() };
    useCase = new CreateSupplierUseCase(service as unknown as SuppliersService);
  });

  it('cria o fornecedor e retorna o DTO de resposta', async () => {
    service.create.mockResolvedValue(makeSupplier());

    await expect(useCase.execute(input)).resolves.toEqual({
      id: 1,
      name: 'Fornecedor X',
      document: '12345678000190',
      createdAt,
    });
    expect(service.create).toHaveBeenCalledWith({
      name: 'Fornecedor X',
      document: '12345678000190',
    });
  });

  it('repassa ao service apenas name e document', async () => {
    service.create.mockResolvedValue(makeSupplier());

    await useCase.execute({
      ...input,
      extra: 'ignorado',
    } as unknown as CreateSupplierData);

    expect(service.create).toHaveBeenCalledWith({
      name: 'Fornecedor X',
      document: '12345678000190',
    });
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
