import { Supplier } from './supplier.entity';

const createdAt = new Date('2026-01-01');

const makeSupplier = () =>
  Supplier.create({
    id: 1,
    name: 'Fornecedor X',
    document: '12345678000190',
    createdAt,
  });

describe('Supplier', () => {
  describe('create', () => {
    it('mapeia todos os campos', () => {
      const supplier = makeSupplier();

      expect(supplier.id).toBe(1);
      expect(supplier.name).toBe('Fornecedor X');
      expect(supplier.document).toBe('12345678000190');
      expect(supplier.createdAt).toBe(createdAt);
    });
  });

  describe('nonRelationalData', () => {
    it('retorna os dados da entidade', () => {
      expect(makeSupplier().nonRelationalData).toEqual({
        id: 1,
        name: 'Fornecedor X',
        document: '12345678000190',
        createdAt,
      });
    });
  });
});
