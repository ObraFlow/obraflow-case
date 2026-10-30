import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseIdPipe } from '../common/validation/ids.js';
import {
  ApproveDto,
  CreatePurchaseOrderDto,
  ListPurchaseOrdersQuery,
  RejectDto,
} from './purchase-order.dto.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';

@ApiTags('purchase-orders')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly orders: PurchaseOrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista pedidos com filtros, paginação e contadores das abas',
  })
  list(@Query() query: ListPurchaseOrdersQuery) {
    return this.orders.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do pedido: itens, etapas e histórico' })
  get(@Param('id', ParseIdPipe) id: number) {
    return this.orders.get(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Cadastra um pedido (calcula totais e monta a cadeia pela alçada)',
  })
  create(@Body() dto: CreatePurchaseOrderDto) {
    return this.orders.create(dto);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aprova a etapa atual' })
  approve(@Param('id', ParseIdPipe) id: number, @Body() dto: ApproveDto) {
    return this.orders.approve(id, dto.stepId);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rejeita o pedido na etapa atual (motivo obrigatório)',
  })
  reject(@Param('id', ParseIdPipe) id: number, @Body() dto: RejectDto) {
    return this.orders.reject(id, dto.stepId, dto.reason);
  }
}
