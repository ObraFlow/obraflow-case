import { Injectable } from '@nestjs/common';
import { SuppliersService } from '../services/suppliers.service';
import { ListSuppliersResponseDataDto } from '../dtos/list-suppliers.dto';

@Injectable()
export class ListSuppliersUseCase {
  constructor(private readonly service: SuppliersService) {}

  async execute(): Promise<ListSuppliersResponseDataDto[]> {
    const suppliers = await this.service.list();

    return suppliers.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      document: supplier.document,
      createdAt: supplier.createdAt,
    }));
  }
}
