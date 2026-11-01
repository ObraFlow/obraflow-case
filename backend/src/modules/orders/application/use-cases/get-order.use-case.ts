import { Injectable } from '@nestjs/common';
import { OrdersService } from '../services/orders.service';
import { GetOrderResponseDataDto } from '../dtos/get-order.dto';

@Injectable()
export class GetOrderUseCase {
  constructor(private readonly ordersService: OrdersService) {}

  async execute(orderId: number): Promise<GetOrderResponseDataDto | null> {
    const result = this.ordersService.get(orderId);
    return result.then((order) => {
      if (!order) {
        return null;
      }
      return {
        orderId: order.id,
        status: order.status,
      };
    });
  }
}
