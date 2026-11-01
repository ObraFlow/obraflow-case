import { Supplier } from '../entities/supplier.entity';

export const SUPPLIERS_REPOSITORY = Symbol('SUPPLIERS_REPOSITORY');

export type CreateSupplierData = {
  name: string;
  document: string;
};

export interface SuppliersRepository {
  list(): Promise<Supplier[]>;
  create(data: CreateSupplierData): Promise<Supplier | null>;
  toDomainEntity(data: unknown): Supplier;
}
