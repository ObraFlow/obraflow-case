import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRegraAlcadaDto } from './dto/create-regra-alcada.dto';
import { UpdateRegraAlcadaDto } from './dto/update-regra-alcada.dto';

@Injectable()
export class RegrasAlcadaService {
  constructor(private readonly prisma: PrismaService) {}

  async findByObra(obraId: string) {
    return this.prisma.regraAlcada.findMany({
      where: { obraId },
      orderBy: { valorMinimo: 'asc' },
      include: {
        aprovadores: {
          include: {
            usuario: {
              select: {
                id: true,
                nome: true,
                email: true,
                cargo: true,
              },
            },
          },
          orderBy: { ordem: 'asc' },
        },
      },
    });
  }

  async findById(id: string) {
    const regra = await this.prisma.regraAlcada.findUnique({
      where: { id },
      include: {
        obra: true,
        aprovadores: {
          include: {
            usuario: {
              select: {
                id: true,
                nome: true,
                email: true,
                cargo: true,
              },
            },
          },
          orderBy: { ordem: 'asc' },
        },
      },
    });

    if (!regra) {
      throw new NotFoundException(`Regra de alçada ${id} não encontrada`);
    }

    return regra;
  }

  async create(dto: CreateRegraAlcadaDto) {
    if (
      dto.valorMaximo !== undefined &&
      dto.valorMaximo !== null &&
      Number(dto.valorMaximo) <= Number(dto.valorMinimo)
    ) {
      throw new BadRequestException(
        'O valor máximo da faixa deve ser estritamente maior que o valor mínimo',
      );
    }

    this.validarAprovadores(dto.aprovadores);

    return this.prisma.$transaction(async (tx) => {
      const regra = await tx.regraAlcada.create({
        data: {
          obraId: dto.obraId,
          descricao: dto.descricao,
          valorMinimo: new Prisma.Decimal(dto.valorMinimo),
          valorMaximo:
            dto.valorMaximo !== undefined && dto.valorMaximo !== null
              ? new Prisma.Decimal(dto.valorMaximo)
              : null,
          aprovadores: {
            create: dto.aprovadores.map((a, idx) => ({
              usuarioId: a.usuarioId,
              ordem: a.ordem || idx + 1,
            })),
          },
        },
        include: {
          aprovadores: {
            include: { usuario: true },
            orderBy: { ordem: 'asc' },
          },
        },
      });

      return regra;
    });
  }

  async update(id: string, dto: UpdateRegraAlcadaDto) {
    const existente = await this.findById(id);

    const valorMin =
      dto.valorMinimo !== undefined ? dto.valorMinimo : Number(existente.valorMinimo);
    const valorMax =
      dto.valorMaximo !== undefined
        ? dto.valorMaximo
        : existente.valorMaximo !== null
          ? Number(existente.valorMaximo)
          : null;

    if (valorMax !== null && valorMax <= valorMin) {
      throw new BadRequestException(
        'O valor máximo da faixa deve ser maior que o valor mínimo',
      );
    }

    if (dto.aprovadores) {
      this.validarAprovadores(dto.aprovadores);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.aprovadores) {
        await tx.regraAlcadaAprovador.deleteMany({
          where: { regraAlcadaId: id },
        });

        await tx.regraAlcadaAprovador.createMany({
          data: dto.aprovadores.map((a, idx) => ({
            regraAlcadaId: id,
            usuarioId: a.usuarioId,
            ordem: a.ordem || idx + 1,
          })),
        });
      }

      return tx.regraAlcada.update({
        where: { id },
        data: {
          descricao: dto.descricao,
          valorMinimo:
            dto.valorMinimo !== undefined
              ? new Prisma.Decimal(dto.valorMinimo)
              : undefined,
          valorMaximo:
            dto.valorMaximo !== undefined
              ? dto.valorMaximo !== null
                ? new Prisma.Decimal(dto.valorMaximo)
                : null
              : undefined,
        },
        include: {
          aprovadores: {
            include: { usuario: true },
            orderBy: { ordem: 'asc' },
          },
        },
      });
    });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.regraAlcada.delete({
      where: { id },
    });
  }

  /**
   * Determina a regra de alçada aplicável com base na obra e no valor total do pedido.
   * Regra: valorMinimo <= valorTotal E (valorMaximo IS NULL OU valorTotal <= valorMaximo)
   */
  async determinarAlcada(obraId: string, valorTotal: number) {
    const regras = await this.prisma.regraAlcada.findMany({
      where: {
        obraId,
        valorMinimo: { lte: valorTotal },
        OR: [{ valorMaximo: null }, { valorMaximo: { gte: valorTotal } }],
      },
      include: {
        aprovadores: {
          include: { usuario: true },
          orderBy: { ordem: 'asc' },
        },
      },
      orderBy: { valorMinimo: 'desc' },
    });

    if (!regras || regras.length === 0) {
      return null;
    }

    return regras[0];
  }

  private validarAprovadores(aprovadores: { usuarioId: string; ordem?: number }[]) {
    if (!aprovadores || aprovadores.length === 0) {
      throw new BadRequestException('A regra deve ter pelo menos um aprovador');
    }

    const userIds = aprovadores.map((a) => a.usuarioId);
    const uniqueUsers = new Set(userIds);
    if (uniqueUsers.size !== userIds.length) {
      throw new BadRequestException(
        'Não é permitido repetir o mesmo usuário como aprovador em múltiplos níveis da mesma regra',
      );
    }
  }
}
