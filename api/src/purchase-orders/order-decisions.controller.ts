import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ActorId } from '../session/actor-id.decorator.js';
import { ApproveDto, RejectDto } from './dto/decision.dto.js';
import { OrderDecisionsService } from './order-decisions.service.js';
import { sendOrderResult } from './send-order-result.js';
import { ParseUuid } from '../common/parse-uuid.pipe.js';

// Both routes are idempotent: repeating a decision that already succeeded
// returns 200 with the current order instead of an error.
@ApiTags('purchase-orders')
@ApiCookieAuth()
@ApiOkResponse({
  description:
    'Decision recorded, or a repeat of a decision already made (Idempotent-Replayed: true).',
  headers: {
    'Idempotent-Replayed': {
      description: 'Present (true) when the request repeated an earlier one.',
      schema: { type: 'string' },
    },
  },
})
@ApiUnauthorizedResponse({ description: 'No user selected.' })
@ApiForbiddenResponse({
  description: 'The user is not the approver of the current step.',
})
@ApiNotFoundResponse({ description: 'Order not found.' })
@ApiConflictResponse({
  description: 'Order already finished or changed since the given version.',
})
@Controller('purchase-orders/:id')
export class OrderDecisionsController {
  constructor(private readonly service: OrderDecisionsService) {}

  /** Approves the current step; the last approval completes the order. */
  @Post('approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id', ParseUuid) id: string,
    @ActorId() actorId: string,
    @Body() dto: ApproveDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.service.approve(id, actorId, dto.version);
    return sendOrderResult(response, result);
  }

  /** Rejects the order: the reason is required and the remaining steps are cancelled. */
  @Post('reject')
  @ApiBadRequestResponse({ description: 'Missing reason.' })
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id', ParseUuid) id: string,
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
