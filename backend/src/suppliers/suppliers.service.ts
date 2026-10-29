import {Injectable, NotFoundException} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {CreateSupplierDto} from "./dto/create-supplier.dto.js";
import {UpdateSupplierDto} from "./dto/update-supplier.dto.js";

@Injectable()
export class SuppliersService {
    constructor(private readonly prisma: PrismaService,) {}

    findAll(){
        return this.prisma.supplier.findMany();
    }

    async findOne(id: string){
        const supplier = await this.prisma.supplier.findUnique({ where: { id } })
        if (!supplier) throw new NotFoundException("Fornecedor Não Encontrado")
        return supplier;
    }

    create(dto: CreateSupplierDto){
        return this.prisma.supplier.create({ data: dto });
    }

    async update(id: string, dto: UpdateSupplierDto){
        await this.findOne(id);
        return this.prisma.supplier.update({ where: { id }, data: dto });
    }

    async remove(id: string){
        await this.findOne(id);
        await this.prisma.supplier.delete({ where: { id } });
        return { id }
    }
}
