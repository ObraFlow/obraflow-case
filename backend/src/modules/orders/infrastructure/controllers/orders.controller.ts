import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateOrderDto } from '../../application/dtos/create-order.dto';
import { DecideOrderDto } from '../../application/dtos/decide-order.dto';
import { ApproveOrderUseCase } from '../../application/use-cases/approve-order.use-case';
import { CreateOrderUseCase } from '../../application/use-cases/create-order.use-case';
import { GetOrderUseCase } from '../../application/use-cases/get-order.use-case';
import { ListOrdersUseCase } from '../../application/use-cases/list-orders.use-case';
import { RejectOrderUseCase } from '../../application/use-cases/reject-order.use-case';
import { ListOrdersResponseDto } from '../../application/dtos/list-order.dto';
import { GetOrderResponseDto } from '../../application/dtos/get-order.dto';
import { CreateOrderResponseDto } from '../../application/dtos/create-order.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly listOrders: ListOrdersUseCase,
    private readonly getOrder: GetOrderUseCase,
    private readonly createOrder: CreateOrderUseCase,
    private readonly approveOrder: ApproveOrderUseCase,
    private readonly rejectOrder: RejectOrderUseCase,
  ) {}
  @Get()
  @ApiOperation({
    summary: 'Lista todos os pedidos',
    description: 'Retorna uma lista de todos os pedidos existentes no sistema',
  })
  async list(): Promise<ListOrdersResponseDto> {
    const orders = this.listOrders.execute();
    return orders.then((data) => ({
      success: true,
      data,
      message: 'Pedidos listados com sucesso.',
    }));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Recuperar detalhes de um pedido específico',
    description:
      'Retorna os detalhes de um pedido específico com base no ID fornecido',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do pedido',
    type: Number,
  })
  async get(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GetOrderResponseDto> {
    const result = this.getOrder.execute(id);
    return result.then((data) => {
      if (!data) {
        return {
          success: false,
          data: null,
          message: 'Pedido não encontrado.',
        };
      }
      return {
        success: true,
        data,
        message: 'Pedido recuperado com sucesso.',
      };
    });
  }

  @Post()
  @ApiOperation({
    summary: 'Criar um novo pedido',
    description: 'Cria um novo pedido com base nos dados fornecidos',
  })
  async create(@Body() dto: CreateOrderDto): Promise<CreateOrderResponseDto> {
    const result = this.createOrder.execute(dto);
    return result.then((data) => {
      if (!data) {
        return {
          success: false,
          data: null,
          message: 'Falha ao criar o pedido.',
        };
      }
      return {
        success: true,
        data,
        message: 'Pedido criado com sucesso.',
      };
    });
  }

  @Post(':id/approve')
  @ApiOperation({
    summary: 'Aprovar um pedido',
    description: 'Aprova um pedido específico com base no ID fornecido',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do pedido',
    type: Number,
  })
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecideOrderDto,
  ) {
    const result = this.approveOrder.execute(id, dto.userId);
    return result.then((data) => ({
      success: true,
      data,
      message: 'Pedido aprovado com sucesso.',
    }));
  }

  @Post(':id/reject')
  @ApiOperation({
    summary: 'Rejeitar um pedido',
    description: 'Rejeita um pedido específico com base no ID fornecido',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do pedido',
    type: Number,
  })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecideOrderDto,
  ) {
    const result = this.rejectOrder.execute(id, dto);
    return result.then((data) => ({
      success: true,
      data,
      message: 'Pedido rejeitado com sucesso.',
    }));
  }
}
