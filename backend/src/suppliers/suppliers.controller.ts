import {Controller, Get, Post, Body, Param, Patch, Delete} from '@nestjs/common';
import {SuppliersService} from "./suppliers.service.js";
import {CreateSupplierDto} from "./dto/create-supplier.dto.js";
import {UpdateSupplierDto} from "./dto/update-supplier.dto.js";

@Controller('suppliers') // Rota /suppliers
export class SuppliersController {
    constructor(private readonly service: SuppliersService) {}

    @Get() findAll(){
        return this.service.findAll();
    }

    @Get(':id') findOne(@Param('id') id: string){
        return this.service.findOne(id);
    }

    @Post() create(@Body() dto: CreateSupplierDto){
        return this.service.create(dto);
    }

    @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id') remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
