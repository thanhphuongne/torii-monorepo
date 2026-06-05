import { Module } from '@nestjs/common';
import { NatsClientModule } from '@server/shared';

// Agents Handlers (Gateway)
import { SenseiHandler } from './controllers/sensei.controller';
import { AssessmentHandler } from './controllers/assessment.controller';
import { AnalyticsHandler } from './controllers/analytics.controller';

/**
 * Agents Module for Gateway
 * Handles all Agents service HTTP routes via NATS
 */
@Module({
  imports: [NatsClientModule],
  controllers: [SenseiHandler, AssessmentHandler, AnalyticsHandler],
})
export class AgentsModule {}
