import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiTags } from '@nestjs/swagger';
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { SuppliersService } from './suppliers.service.js';
import { RequireSession } from '../session/require-session.decorator.js';

@ApiTags('suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  /** All suppliers, sorted by name. */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** Creates a supplier. */
  @Post()
  @RequireSession()
  @ApiConflictResponse({ description: 'CNPJ (taxId) already in use.' })
  create(@Body() dto: CreateSupplierDto) {
    return this.service.create(dto);
  }
}
