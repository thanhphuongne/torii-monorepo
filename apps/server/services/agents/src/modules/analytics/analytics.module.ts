import { Module } from '@nestjs/common';
import { FastMcpModule } from '@server/agents/fastmcp/fastmcp.module';
import { NatsClientModule } from '@server/shared';

import { AnalyticsService } from './analytics.service';
import { AIUsageTrackingService } from './ai-usage-tracking.service';
import { AnalyticsHandler } from './analytics.handler';

@Module({
  imports: [FastMcpModule, NatsClientModule],
  controllers: [AnalyticsHandler],
  providers: [AnalyticsService, AIUsageTrackingService],
  exports: [AnalyticsService, AIUsageTrackingService],
})
export class AnalyticsModule {}
