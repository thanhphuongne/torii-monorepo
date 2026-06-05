import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import {
  AnalyticsOverviewService,
  BillingAnalyticsOverviewResponse,
  LearningAnalyticsOverviewResponse,
} from './analytics-overview.service';

@Controller()
export class AnalyticsOverviewHandler {
  constructor(
    private readonly analyticsOverview: AnalyticsOverviewService,
  ) {}

  @MessagePattern({ cmd: 'learning.analytics.overview' })
  async getLearningOverview(): Promise<LearningAnalyticsOverviewResponse> {
    return this.analyticsOverview.getLearningOverview();
  }

  @MessagePattern({ cmd: 'billing.analytics.overview' })
  async getBillingOverview(): Promise<BillingAnalyticsOverviewResponse> {
    return this.analyticsOverview.getBillingOverview();
  }
}

