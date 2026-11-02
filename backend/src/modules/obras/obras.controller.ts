import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ObrasService } from './obras.service';
import { CreateObraDto } from './dto/create-obra.dto';

@ApiTags('Obras')
@Controller('obras')
export class ObrasController {
  constructor(private readonly obrasService: ObrasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as obras' })
  @ApiResponse({ status: 200, description: 'Lista de obras cadastradas' })
  async findAll() {
    return this.obrasService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar obra por ID com regras associadas' })
  @ApiResponse({ status: 200, description: 'Detalhes da obra' })
  @ApiResponse({ status: 404, description: 'Obra não encontrada' })
  async findById(@Param('id') id: string) {
    return this.obrasService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastrar nova obra' })
  @ApiResponse({ status: 201, description: 'Obra cadastrada com sucesso' })
  async create(@Body() dto: CreateObraDto) {
    return this.obrasService.create(dto);
  }
}
