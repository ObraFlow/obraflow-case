import {Injectable, NotFoundException} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {CreateProjectDto} from "./dto/create-project.dto.js";
import {UpdateProjectDto} from "./dto/update-project.dto.js";

@Injectable()
export class ProjectsService {
    constructor(private readonly prisma: PrismaService,) {}

    findAll(){
        return this.prisma.project.findMany();
    }

    async findOne(id: string){
        const project = await this.prisma.project.findUnique({ where: { id } })
        if (!project) throw new NotFoundException("Obra Não Encontrada")
        return project;
    }

    create(dto: CreateProjectDto){
        return this.prisma.project.create({ data: { name: dto.name } });
    }

    async update(id: string, dto: UpdateProjectDto){
        await this.findOne(id);
        return this.prisma.project.update({ where: { id }, data: dto });
    }

    async remove(id: string){
        await this.findOne(id);
        await this.prisma.project.delete({ where: { id } });
        return { id }
    }
}
