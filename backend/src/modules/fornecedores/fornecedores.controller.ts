import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FornecedoresService } from './fornecedores.service';
import { CreateFornecedorDto } from './dto/create-fornecedor.dto';

@ApiTags('Fornecedores')
@Controller('fornecedores')
export class FornecedoresController {
  constructor(private readonly fornecedoresService: FornecedoresService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os fornecedores' })
  @ApiResponse({ status: 200, description: 'Lista de fornecedores' })
  async findAll() {
    return this.fornecedoresService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar fornecedor por ID' })
  @ApiResponse({ status: 200, description: 'Detalhes do fornecedor' })
  @ApiResponse({ status: 404, description: 'Fornecedor não encontrado' })
  async findById(@Param('id') id: string) {
    return this.fornecedoresService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastrar novo fornecedor' })
  @ApiResponse({ status: 201, description: 'Fornecedor cadastrado com sucesso' })
  async create(@Body() dto: CreateFornecedorDto) {
    return this.fornecedoresService.create(dto);
  }
}
