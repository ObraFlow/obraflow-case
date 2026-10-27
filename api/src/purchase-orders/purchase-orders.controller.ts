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
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ActorId } from '../session/actor-id.decorator.js';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';
import { ListPurchaseOrdersQueryDto } from './dto/list-purchase-orders-query.dto.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';
import { sendOrderResult } from './send-order-result.js';

@ApiTags('purchase-orders')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}

  /** Paginated list, newest first. Filter by status, site or current approver. */
  @Get()
  findMany(@Query() query: ListPurchaseOrdersQueryDto) {
    return this.service.findMany(query);
  }

  /** Order with items, approval steps and full history. */
  @Get(':id')
  @ApiNotFoundResponse({ description: 'Order not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  /**
   * Creates an order as the logged-in user. Totals are calculated by the API and
   * the approval chain is copied from the matching tier.
   */
  @Post()
  @ApiCookieAuth()
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Makes retries safe: repeating the request with the same key returns the order created the first time (with Idempotent-Replayed: true). Use a new UUID per form.',
  })
  @ApiCreatedResponse({
    description: 'Order created, or the existing one for a repeated key.',
    headers: {
      'Idempotent-Replayed': {
        description: 'Present (true) when the request repeated an earlier one.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid payload, unknown site or supplier.',
  })
  @ApiUnauthorizedResponse({
    description: 'No user selected (session cookie missing).',
  })
  @ApiUnprocessableEntityResponse({
    description:
      'No tier covers the total, total too large, or key reused with a different body.',
  })
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
