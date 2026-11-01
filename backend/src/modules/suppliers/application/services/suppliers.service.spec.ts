import {
  CreateSupplierData,
  SuppliersRepository,
} from '../../domain/repositories/suppliers.repository';
import { Supplier } from '../../domain/entities/supplier.entity';
import { SuppliersService } from './suppliers.service';

const makeSupplier = () =>
  Supplier.create({
    id: 1,
    name: 'Fornecedor X',
    document: '12345678000190',
    createdAt: new Date('2026-01-01'),
  });

describe('SuppliersService', () => {
  let repository: { list: jest.Mock; create: jest.Mock };
  let service: SuppliersService;
  const data = {
    name: 'Fornecedor X',
    document: '12345678000190',
  } as CreateSupplierData;

  beforeEach(() => {
    repository = { list: jest.fn(), create: jest.fn() };
    service = new SuppliersService(
      repository as unknown as SuppliersRepository,
    );
  });

  describe('list', () => {
    it('delega para repository.list', async () => {
      const suppliers = [makeSupplier()];
      repository.list.mockResolvedValue(suppliers);

      await expect(service.list()).resolves.toBe(suppliers);
      expect(repository.list).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('delega para repository.create e retorna o fornecedor', async () => {
      const supplier = makeSupplier();
      repository.create.mockResolvedValue(supplier);

      await expect(service.create(data)).resolves.toBe(supplier);
      expect(repository.create).toHaveBeenCalledWith(data);
    });

    it('retorna null quando o repository retorna null', async () => {
      repository.create.mockResolvedValue(null);

      await expect(service.create(data)).resolves.toBeNull();
    });
  });
});
