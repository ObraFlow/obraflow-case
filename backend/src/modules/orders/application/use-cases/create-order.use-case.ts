import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { OrdersService } from '../services/orders.service';
import { CreateOrderResponseDataDto } from '../dtos/create-order.dto';

@Injectable()
export class CreateOrderUseCase {
  constructor(private readonly ordersService: OrdersService) {}

  async execute(
    input: CreateOrderDto,
  ): Promise<CreateOrderResponseDataDto | null> {
    const result = this.ordersService.create(input);
    return result.then((order) => {
      if (!order) {
        return null;
      }
      return {
        id: order.id,
      };
    });
  }
}
