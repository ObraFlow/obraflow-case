import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFornecedorDto } from './dto/create-fornecedor.dto';

@Injectable()
export class FornecedoresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.fornecedor.findMany({
      orderBy: { razaoSocial: 'asc' },
    });
  }

  async findById(id: string) {
    const fornecedor = await this.prisma.fornecedor.findUnique({
      where: { id },
    });

    if (!fornecedor) {
      throw new NotFoundException(`Fornecedor com ID ${id} não encontrado`);
    }

    return fornecedor;
  }

  async create(data: CreateFornecedorDto) {
    const existing = await this.prisma.fornecedor.findUnique({
      where: { cnpj: data.cnpj },
    });

    if (existing) {
      throw new ConflictException(`CNPJ ${data.cnpj} já cadastrado`);
    }

    return this.prisma.fornecedor.create({
      data,
    });
  }
}
