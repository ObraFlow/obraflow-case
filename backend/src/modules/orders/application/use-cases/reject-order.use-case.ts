import { Injectable } from '@nestjs/common';
import { DecideOrderDto } from '../dtos/decide-order.dto';
import { OrdersService } from '../services/orders.service';
import { DecideOrderResponseDataDto } from '../dtos/decide-order.dto';

@Injectable()
export class RejectOrderUseCase {
  constructor(private readonly ordersService: OrdersService) {}

  async execute(
    orderId: number,
    input: DecideOrderDto,
  ): Promise<DecideOrderResponseDataDto> {
    const result = this.ordersService.decide(
      orderId,
      input.userId,
      false,
      input.reason,
    );
    return result.then((order) => {
      if (!order) {
        throw new Error('Pedido não encontrado ou não foi possível rejeitar.');
      }
      return {
        orderId: order.id,
        status: order.status,
      };
    });
  }
}
