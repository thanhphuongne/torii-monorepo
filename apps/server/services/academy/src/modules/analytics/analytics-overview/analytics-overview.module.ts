import { Module } from '@nestjs/common';
import { PrismaModule } from '@server/shared';
import { AnalyticsOverviewHandler } from './analytics-overview.handler';
import { AnalyticsOverviewService } from './analytics-overview.service';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsOverviewHandler],
  providers: [AnalyticsOverviewService],
})
export class AnalyticsOverviewModule {}

