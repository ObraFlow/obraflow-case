import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateSupplierDto, ListSuppliersQuery } from './supplier.dto.js';
import { SuppliersService } from './suppliers.service.js';

@ApiTags('suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os fornecedores, com busca opcional por nome',
  })
  list(@Query() query: ListSuppliersQuery) {
    return this.suppliers.list(query.q);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra um fornecedor' })
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliers.create(dto);
  }
}
