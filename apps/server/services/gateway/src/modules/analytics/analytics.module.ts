import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { ReportController } from './report.controller';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { NatsClientModule } from '@server/shared';

@Module({
  imports: [NatsClientModule],
  controllers: [AnalyticsController, ReportController, DashboardController],
  providers: [DashboardService],
})
export class AnalyticsModule {}
