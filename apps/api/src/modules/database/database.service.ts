import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult, QueryResultRow, types } from 'pg';

types.setTypeParser(20, (value) => Number.parseInt(value, 10));
types.setTypeParser(1700, (value) => Number.parseFloat(value));

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const connectionString =
      config.get<string>('DATABASE_URL') ??
      'postgresql://commerceops:commerceops@localhost:5432/commerceops';

    this.pool = new Pool({
      connectionString,
      max: Number(config.get<string>('DATABASE_POOL_MAX') ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  async onModuleInit() {
    await this.query('SELECT 1');
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const result: QueryResult<T> = await this.pool.query(sql, params);
    return result.rows;
  }
}
