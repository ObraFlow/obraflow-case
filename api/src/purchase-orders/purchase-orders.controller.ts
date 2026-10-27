import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ActorId } from '../session/actor-id.decorator.js';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';
import { ListPurchaseOrdersQueryDto } from './dto/list-purchase-orders-query.dto.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';
import { sendOrderResult } from './send-order-result.js';

@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}

  @Get()
  findMany(@Query() query: ListPurchaseOrdersQueryDto) {
    return this.service.findMany(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  /** Send an Idempotency-Key header (e.g. a UUID per form) to make retries safe. */
  @Post()
  async create(
    @ActorId() requesterId: string,
    @Body() dto: CreatePurchaseOrderDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.service.create(requesterId, dto, idempotencyKey);
    return sendOrderResult(response, result);
  }
}
