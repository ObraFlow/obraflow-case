import { Injectable } from '@nestjs/common';
import { OrdersService } from '../services/orders.service';
import { DecideOrderResponseDataDto } from '../dtos/decide-order.dto';

@Injectable()
export class ApproveOrderUseCase {
  constructor(private readonly ordersService: OrdersService) {}

  async execute(
    orderId: number,
    userId: number,
  ): Promise<DecideOrderResponseDataDto> {
    const result = this.ordersService.decide(orderId, userId, true);
    return result.then((order) => {
      if (!order) {
        throw new Error('Pedido não encontrado ou não foi possível aprovar.');
      }
      return {
        orderId: order.id,
        status: order.status,
      };
    });
  }
}
