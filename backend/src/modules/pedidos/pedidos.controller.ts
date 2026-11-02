import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PedidoStatus } from '@prisma/client';
import { PedidosService } from './pedidos.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { AprovarPedidoDto } from './dto/aprovar-pedido.dto';
import { RejeitarPedidoDto } from './dto/rejeitar-pedido.dto';

@ApiTags('Pedidos')
@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pedidos de compra com contexto de alçada' })
  @ApiQuery({ name: 'obraId', required: false, description: 'Filtrar por obra' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PedidoStatus,
    description: 'Filtrar por status',
  })
  @ApiResponse({ status: 200, description: 'Lista de pedidos de compra' })
  async findAll(
    @Query('obraId') obraId?: string,
    @Query('status') status?: PedidoStatus,
  ) {
    return this.pedidosService.findAll({ obraId, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar detalhes completos do pedido, itens e auditoria' })
  @ApiResponse({ status: 200, description: 'Detalhes completos do pedido' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  async findById(@Param('id') id: string) {
    return this.pedidosService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastrar novo pedido de compra com itens' })
  @ApiResponse({ status: 201, description: 'Pedido cadastrado e alçada associada' })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou sem regra de alçada aplicável',
  })
  async create(@Body() dto: CreatePedidoDto) {
    return this.pedidosService.create(dto);
  }

  @Post(':id/aprovar')
  @ApiOperation({ summary: 'Aprovar etapa atual do pedido na cadeia de alçada' })
  @ApiResponse({ status: 200, description: 'Etapa aprovada com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Aprovador incorreto para a etapa atual ou pedido não pendente',
  })
  async aprovar(@Param('id') id: string, @Body() dto: AprovarPedidoDto) {
    return this.pedidosService.aprovar(id, dto);
  }

  @Post(':id/rejeitar')
  @ApiOperation({ summary: 'Rejeitar pedido de compra com motivo obrigatório' })
  @ApiResponse({ status: 200, description: 'Pedido rejeitado e fluxo interrompido' })
  @ApiResponse({
    status: 400,
    description: 'Motivo não informado ou usuário sem permissão na etapa',
  })
  async rejeitar(@Param('id') id: string, @Body() dto: RejeitarPedidoDto) {
    return this.pedidosService.rejeitar(id, dto);
  }
}
