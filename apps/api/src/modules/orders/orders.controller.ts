import { Controller, Get, Inject, Query } from '@nestjs/common';
import { parseLimit } from '../../common/query';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly orders: OrdersService) {}

  @Get('recent')
  recent(@Query('limit') limit?: string) {
    return this.orders.recent(parseLimit(limit, 25, 100));
  }
}
