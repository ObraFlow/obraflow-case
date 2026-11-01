import { Injectable } from '@nestjs/common';
import { OrdersService } from '../services/orders.service';
import { ListOrdersResponseDataDto } from '../dtos/list-order.dto';

@Injectable()
export class ListOrdersUseCase {
  constructor(private readonly ordersService: OrdersService) {}

  async execute(): Promise<ListOrdersResponseDataDto[]> {
    const orders = await this.ordersService.list();

    return orders.map((order) => ({
      id: order.id,
      status: order.status,
      orderDate: order.orderDate.toISOString(),
      totalCents: order.totalCents,
      work: order.work,
      supplier: order.supplier,
    }));
  }
}
