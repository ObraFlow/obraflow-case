import {Injectable, NotFoundException} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {CreateUserDto} from "./dto/create-user.dto.js";
import {UpdateUserDto} from "./dto/update-user.dto.js";

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService,) {}

    findAll(){
        return this.prisma.user.findMany();
    }

    async findOne(id: string){
        const user = await this.prisma.user.findUnique({ where: { id } })
        if (!user) throw new NotFoundException("Usuário Não Encontrado")
        return user;
    }

    create(dto: CreateUserDto){
        return this.prisma.user.create({ data: dto });
    }

    async update(id: string, dto: UpdateUserDto){
        await this.findOne(id);
        return this.prisma.user.update({ where: { id }, data: dto });
    }

    async remove(id: string){
        await this.findOne(id);
        await this.prisma.user.delete({ where: { id } });
        return { id }
    }
}
