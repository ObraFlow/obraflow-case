import { Inject, Injectable } from '@nestjs/common';
import {
  SUPPLIERS_REPOSITORY,
  SuppliersRepository,
  CreateSupplierData,
} from '../../domain/repositories/suppliers.repository';
import { Supplier } from '../../domain/entities/supplier.entity';

@Injectable()
export class SuppliersService {
  constructor(
    @Inject(SUPPLIERS_REPOSITORY)
    private readonly repository: SuppliersRepository,
  ) {}

  list(): Promise<Supplier[]> {
    return this.repository.list();
  }

  create(data: CreateSupplierData): Promise<Supplier | null> {
    return this.repository.create(data);
  }
}
