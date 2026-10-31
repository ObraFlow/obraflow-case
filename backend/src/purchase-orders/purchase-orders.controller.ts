import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';
import {
    ApproveDto,
    ListPurchaseOrdersQueryDto,
    RejectDto,
} from './dto/decision.dto.js';
import { PurchaseOrdersService } from './purchase-orders.service.js';

@Controller('purchase-orders')
export class PurchaseOrdersController {
    constructor(private readonly service: PurchaseOrdersService) {}

    @Get()
    findAll(@Query() query: ListPurchaseOrdersQueryDto) {
        return this.service.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Post()
    create(@Body() dto: CreatePurchaseOrderDto) {
        return this.service.create(dto);
    }

    @Post(':id/approve')
    approve(@Param('id') id: string, @Body() dto: ApproveDto) {
        return this.service.approve(id, dto.actingUserId);
    }

    @Post(':id/reject')
    reject(@Param('id') id: string, @Body() dto: RejectDto) {
        return this.service.reject(id, dto.actingUserId, dto.reason);
    }
}
