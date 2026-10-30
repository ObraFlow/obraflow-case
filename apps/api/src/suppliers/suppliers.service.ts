import { Injectable } from '@nestjs/common';
import { AppException } from '../common/errors/app.exception.js';
import { isUniqueViolation } from '../common/errors/prisma-errors.js';
import { PrismaService } from '../common/prisma/prisma.service.js';
import type { CreateSupplierDto } from './supplier.dto.js';

const SUPPLIER_FIELDS = { id: true, name: true, taxId: true } as const;

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q?: string) {
    const suppliers = await this.prisma.supplier.findMany({
      where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
      orderBy: { name: 'asc' },
      select: SUPPLIER_FIELDS,
    });
    return { data: suppliers };
  }

  async create(dto: CreateSupplierDto) {
    try {
      return await this.prisma.supplier.create({
        data: dto,
        select: SUPPLIER_FIELDS,
      });
    } catch (error) {
      if (isUniqueViolation(error, 'taxId')) {
        throw AppException.conflict(
          'CONFLICT',
          'Já existe um fornecedor com este CNPJ.',
        );
      }
      throw error;
    }
  }
}
