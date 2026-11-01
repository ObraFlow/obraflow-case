import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateSupplierDto } from '../../application/dtos/create-supplier.dto';
import { CreateSupplierUseCase } from '../../application/use-cases/create-supplier.use-case';
import { ListSuppliersUseCase } from '../../application/use-cases/list-suppliers.use-case';
import { ListSuppliersResponseDto } from '../../application/dtos/list-suppliers.dto';
import { CreateSupplierResponseDto } from '../../application/dtos/create-supplier.dto';

@ApiTags('Suppliers')
@Controller()
export class SuppliersController {
  constructor(
    private readonly listSuppliersUseCase: ListSuppliersUseCase,
    private readonly createSupplierUseCase: CreateSupplierUseCase,
  ) {}

  @Get('suppliers')
  @ApiOperation({
    summary: 'Lista todos os fornecedores',
    description:
      'Retorna a lista de todos os fornecedores cadastrados no sistema.',
  })
  async list(): Promise<ListSuppliersResponseDto> {
    const suppliers = this.listSuppliersUseCase.execute();
    return suppliers.then((data) => ({
      success: true,
      data,
      message: 'Lista de fornecedores retornada com sucesso.',
    }));
  }

  @Post('suppliers')
  @ApiOperation({
    summary: 'Cria um novo fornecedor',
    description: 'Cria um novo fornecedor com base nos dados fornecidos.',
  })
  async create(
    @Body() dto: CreateSupplierDto,
  ): Promise<CreateSupplierResponseDto> {
    const supplier = await this.createSupplierUseCase.execute(dto);

    if (!supplier) {
      return {
        success: false,
        data: null,
        message: 'Falha ao criar o fornecedor.',
      };
    }

    return {
      success: true,
      data: supplier,
      message: 'Fornecedor criado com sucesso.',
    };
  }
}
