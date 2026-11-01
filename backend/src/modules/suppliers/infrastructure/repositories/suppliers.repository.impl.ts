import { Inject, Injectable } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import { DATABASE } from '../../../../database/database.module';
import { Database } from '../../../../database/database.types';
import { suppliers } from '../../../../database/schema';
import {
  SuppliersRepository,
  CreateSupplierData,
} from '../../domain/repositories/suppliers.repository';
import { Supplier } from '../../domain/entities/supplier.entity';

@Injectable()
export class SuppliersRepositoryImpl implements SuppliersRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(): Promise<Supplier[]> {
    const suppliersData = this.db
      .select()
      .from(suppliers)
      .orderBy(asc(suppliers.id));
    return suppliersData.then((data) =>
      data.map((supplier) => this.toDomainEntity(supplier)),
    );
  }

  async create(data: CreateSupplierData): Promise<Supplier | null> {
    const newSupplier = await this.db
      .insert(suppliers)
      .values({
        name: data.name,
        document: data.document,
        createdAt: new Date(),
      })
      .returning();

    if (newSupplier.length === 0) {
      return null;
    }

    return this.toDomainEntity(newSupplier[0]);
  }

  toDomainEntity(data: unknown): Supplier {
    const supplierData = data as {
      id: number;
      name: string;
      document: string;
      createdAt: Date;
    };

    return Supplier.create({
      id: supplierData.id,
      name: supplierData.name,
      document: supplierData.document,
      createdAt: supplierData.createdAt,
    });
  }
}
