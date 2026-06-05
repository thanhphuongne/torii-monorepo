import { Module } from '@nestjs/common';
import { AnalyticsHandler } from '@server/identity/modules/analytics/analytics.handler';

@Module({
  controllers: [AnalyticsHandler],
})
export class AnalyticsModule {}
