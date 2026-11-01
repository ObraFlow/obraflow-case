import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RegrasAlcadaService } from './regras-alcada.service';
import { CreateRegraAlcadaDto } from './dto/create-regra-alcada.dto';
import { UpdateRegraAlcadaDto } from './dto/update-regra-alcada.dto';

@ApiTags('Regras de Alçada')
@Controller('regras-alcada')
export class RegrasAlcadaController {
  constructor(private readonly regrasAlcadaService: RegrasAlcadaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar regras de alçada por obra' })
  @ApiQuery({ name: 'obraId', required: true, description: 'ID da obra' })
  @ApiResponse({ status: 200, description: 'Regras da obra com cadeia de aprovadores' })
  async findByObra(@Query('obraId') obraId: string) {
    return this.regrasAlcadaService.findByObra(obraId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar regra de alçada por ID' })
  @ApiResponse({ status: 200, description: 'Detalhes da regra de alçada' })
  @ApiResponse({ status: 404, description: 'Regra não encontrada' })
  async findById(@Param('id') id: string) {
    return this.regrasAlcadaService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar nova regra de alçada para uma obra' })
  @ApiResponse({ status: 201, description: 'Regra criada com sucesso' })
  async create(@Body() dto: CreateRegraAlcadaDto) {
    return this.regrasAlcadaService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar regra de alçada e reordenar aprovadores' })
  @ApiResponse({ status: 200, description: 'Regra atualizada com sucesso' })
  async update(@Param('id') id: string, @Body() dto: UpdateRegraAlcadaDto) {
    return this.regrasAlcadaService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir regra de alçada' })
  @ApiResponse({ status: 200, description: 'Regra excluída com sucesso' })
  async delete(@Param('id') id: string) {
    return this.regrasAlcadaService.delete(id);
  }
}
