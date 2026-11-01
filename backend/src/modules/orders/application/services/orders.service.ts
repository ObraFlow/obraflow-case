import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateOrderDto } from '../dtos/create-order.dto';
import {
  CreateOrderData,
  ListedOrder,
  ORDERS_REPOSITORY,
  OrdersRepository,
} from '../../domain/repositories/orders.repository';
import { PurchaseOrder } from '../../domain/entities/purchase-order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly repository: OrdersRepository,
  ) {}

  list(): Promise<ListedOrder[]> {
    return this.repository.list();
  }

  get(id: number): Promise<PurchaseOrder | null> {
    return this.repository.getById(id);
  }

  async create(input: CreateOrderDto): Promise<PurchaseOrder | null> {
    if (!input.items?.length)
      throw new BadRequestException('O pedido precisa ter ao menos um item.');

    const items = input.items.map((item) => {
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0)
        throw new BadRequestException(
          `Quantidade inválida no item "${item.description}".`,
        );
      if (!Number.isInteger(item.unitPriceCents) || item.unitPriceCents < 0)
        throw new BadRequestException(
          `Preço inválido no item "${item.description}".`,
        );
      const totalCents = Math.round(quantity * item.unitPriceCents);
      return {
        description: item.description,
        unit: item.unit,
        quantity: quantity.toFixed(3),
        unitPriceCents: item.unitPriceCents,
        totalCents,
      };
    });
    const totalCents = items.reduce(
      (total, item) => total + item.totalCents,
      0,
    );

    const data: CreateOrderData = {
      workId: input.workId,
      supplierId: input.supplierId,
      orderDate: input.orderDate,
      notes: input.notes,
      totalCents,
      items,
    };
    return this.repository.create(data);
  }

  decide(
    orderId: number,
    userId: number,
    approve: boolean,
    reason?: string,
  ): Promise<PurchaseOrder | null> {
    if (!approve && !reason?.trim())
      throw new BadRequestException('O motivo da rejeição é obrigatório.');
    return this.repository.decide(orderId, userId, approve, reason);
  }
}
