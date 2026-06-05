import { Module } from '@nestjs/common';
import { FastMcpModule } from '@server/agents/fastmcp/fastmcp.module';
import { SharedModule, NatsClientModule } from '@server/shared';

import { SenseiService } from './sensei.service';
import { TTSService } from './tts.service';
import { SenseiHandler } from './sensei.handler';

import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [FastMcpModule, SharedModule, NatsClientModule, AnalyticsModule],
  controllers: [SenseiHandler],
  providers: [SenseiService, TTSService],
  exports: [SenseiService, TTSService],
})
export class SenseiModule {}
