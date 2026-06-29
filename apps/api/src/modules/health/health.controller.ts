import { Controller, Get, Inject } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('health')
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  @Get()
  async health() {
    const [database] = await this.database.query<{
      ok: number;
      order_count: number;
      latest_order_date: string;
    }>(`
      SELECT
        1 AS ok,
        COUNT(*)::int AS order_count,
        MAX(order_date)::text AS latest_order_date
      FROM commerce.orders
    `);

    return {
      status: 'ok',
      service: 'commerceops-api',
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
