import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class OrdersService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  recent(limit: number) {
    return this.database.query(
      `
        SELECT
          o.order_number,
          o.order_date,
          o.channel,
          o.status,
          o.grand_total,
          o.refund_total,
          o.scenario_tag,
          c.customer_segment,
          c.acquisition_channel
        FROM commerce.orders o
        JOIN commerce.customers c ON c.customer_id = o.customer_id
        ORDER BY o.order_date DESC
        LIMIT $1
      `,
      [limit],
    );
  }
}
