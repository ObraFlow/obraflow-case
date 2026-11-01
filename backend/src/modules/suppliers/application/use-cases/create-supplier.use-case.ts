import { Injectable } from '@nestjs/common';
import { CreateSuppliersResponseDataDto } from '../dtos/create-supplier.dto';
import { SuppliersService } from '../services/suppliers.service';
import { CreateSupplierData } from '../../domain/repositories/suppliers.repository';

@Injectable()
export class CreateSupplierUseCase {
  constructor(private readonly service: SuppliersService) {}

  async execute(
    input: CreateSupplierData,
  ): Promise<CreateSuppliersResponseDataDto | null> {
    const createdSupplier = await this.service.create({
      name: input.name,
      document: input.document,
    });

    if (!createdSupplier) {
      return null;
    }

    return {
      id: createdSupplier.id,
      name: createdSupplier.name,
      document: createdSupplier.document,
      createdAt: createdSupplier.createdAt,
    };
  }
}
