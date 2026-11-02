import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.usuario.findMany({
      orderBy: { nome: 'asc' },
    });
  }

  async findById(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    return usuario;
  }

  async create(data: CreateUsuarioDto) {
    const existing = await this.prisma.usuario.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException(`Email ${data.email} já cadastrado`);
    }

    return this.prisma.usuario.create({
      data,
    });
  }
}
