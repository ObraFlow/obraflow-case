import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ActorId } from '../session/actor-id.decorator.js';
import { ApproveDto, RejectDto } from './dto/decision.dto.js';
import { OrderDecisionsService } from './order-decisions.service.js';
import { sendOrderResult } from './send-order-result.js';

// Both routes are idempotent: repeating a decision that already succeeded
// returns 200 with the current order instead of an error.
@Controller('purchase-orders/:id')
export class OrderDecisionsController {
  constructor(private readonly service: OrderDecisionsService) {}

  @Post('approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @ActorId() actorId: string,
    @Body() dto: ApproveDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.service.approve(id, actorId, dto.version);
    return sendOrderResult(response, result);
  }

  @Post('reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @ActorId() actorId: string,
    @Body() dto: RejectDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.service.reject(
      id,
      actorId,
      dto.version,
      dto.reason,
    );
    return sendOrderResult(response, result);
  }
}
