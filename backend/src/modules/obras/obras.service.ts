import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateObraDto } from './dto/create-obra.dto';

@Injectable()
export class ObrasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.obra.findMany({
      orderBy: { nome: 'asc' },
      include: {
        _count: {
          select: {
            pedidos: true,
            regrasAlcada: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    const obra = await this.prisma.obra.findUnique({
      where: { id },
      include: {
        regrasAlcada: {
          include: {
            aprovadores: {
              include: { usuario: true },
              orderBy: { ordem: 'asc' },
            },
          },
        },
      },
    });

    if (!obra) {
      throw new NotFoundException(`Obra com ID ${id} não encontrada`);
    }

    return obra;
  }

  async create(data: CreateObraDto) {
    return this.prisma.obra.create({
      data,
    });
  }
}
