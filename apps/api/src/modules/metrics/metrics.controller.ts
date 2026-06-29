import { Controller, Get, Inject, Query } from '@nestjs/common';
import { parseLimit, parseOptionalEnum } from '../../common/query';
import { MetricsService } from './metrics.service';

const INVENTORY_STATUSES = ['reorder_now', 'stockout_risk', 'watch', 'healthy'] as const;
const MARKETING_PLATFORMS = ['google', 'meta'] as const;

@Controller('metrics')
export class MetricsController {
  constructor(@Inject(MetricsService) private readonly metrics: MetricsService) {}

  @Get('overview')
  overview() {
    return this.metrics.overview();
  }

  @Get('revenue')
  revenue(@Query('limit') limit?: string) {
    return this.metrics.revenue(parseLimit(limit, 30, 365));
  }

  @Get('inventory-risk')
  inventoryRisk(@Query('limit') limit?: string, @Query('status') status?: string) {
    return this.metrics.inventoryRisk(
      parseLimit(limit, 50, 250),
      parseOptionalEnum(status, INVENTORY_STATUSES, 'status'),
    );
  }

  @Get('marketing-performance')
  marketingPerformance(@Query('limit') limit?: string, @Query('platform') platform?: string) {
    return this.metrics.marketingPerformance(
      parseLimit(limit, 40, 250),
      parseOptionalEnum(platform, MARKETING_PLATFORMS, 'platform'),
    );
  }

  @Get('support-summary')
  supportSummary(@Query('limit') limit?: string) {
    return this.metrics.supportSummary(parseLimit(limit, 40, 250));
  }

  @Get('customer-segments')
  customerSegments(@Query('limit') limit?: string) {
    return this.metrics.customerSegments(parseLimit(limit, 40, 100));
  }

  @Get('finance-accounts')
  financeAccounts() {
    return this.metrics.financeAccounts();
  }

  @Get('workflow-alerts')
  workflowAlerts() {
    return this.metrics.workflowAlerts();
  }

  @Get('scenario-events')
  scenarioEvents(@Query('limit') limit?: string) {
    return this.metrics.scenarioEvents(parseLimit(limit, 25, 100));
  }
}
