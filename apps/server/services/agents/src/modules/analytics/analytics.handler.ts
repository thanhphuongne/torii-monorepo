import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Requester } from '@workspace/schemas';

import { AnalyticsService } from './analytics.service';

/**
 * NATS Handler for Analytics Agent
 * Handles inter-service communication via NATS messaging
 */
@Controller()
export class AnalyticsHandler {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ── Redis Snapshot Handlers (Solution A) ─────────────────────────────────

  @MessagePattern({ cmd: 'agents.analytics.getSnapshot' })
  async getSnapshot(
    @Payload() data: { requester: Requester; targetLevel?: string },
  ) {
    return this.analyticsService.getSnapshot(
      data.requester,
      data.targetLevel || 'N5',
    );
  }

  @MessagePattern({ cmd: 'agents.analytics.generateSnapshot' })
  async generateSnapshot(
    @Payload() data: { requester: Requester; targetLevel?: string },
  ) {
    return this.analyticsService.generateAndSaveSnapshot(
      data.requester,
      data.targetLevel || 'N5',
    );
  }

  // ── Legacy Direct AI Handlers ─────────────────────────────────────────────

  @MessagePattern({ cmd: 'agents.analytics.trackProgress' })
  async trackProgress(
    @Payload()
    data: {
      requester: Requester;
      timeframe?: 'week' | 'month' | 'quarter' | 'year';
    },
  ) {
    return this.analyticsService.trackProgress(
      data.requester,
      data.timeframe || 'month',
    );
  }

  @MessagePattern({ cmd: 'agents.analytics.suggestStudyPath' })
  async suggestStudyPath(
    @Payload()
    data: {
      requester: Requester;
      targetLevel?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
      timeframe?: string;
    },
  ) {
    return this.analyticsService.suggestStudyPath(
      data.requester,
      data.targetLevel || 'N5',
      data.timeframe,
    );
  }

  @MessagePattern({ cmd: 'agents.analytics.generateReport' })
  async generateReport(
    @Payload()
    data: {
      requester: Requester;
      reportType?: 'progress' | 'assessment' | 'comprehensive';
      timeframe?: string;
    },
  ) {
    return this.analyticsService.generateReport(
      data.requester,
      data.reportType || 'comprehensive',
      data.timeframe || 'month',
    );
  }

  @MessagePattern({ cmd: 'agents.analytics.readinessProfile' })
  async getReadinessProfile(
    @Payload()
    data: {
      requester: Requester;
      targetLevel?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
    },
  ) {
    return this.analyticsService.getReadinessProfile(
      data.requester,
      data.targetLevel || 'N5',
    );
  }

  @MessagePattern({ cmd: 'agents.analytics.createUsageArtifacts' })
  async createUsageArtifacts(
    @Payload()
    data: {
      roomId: string;
      userId: string;
      type: 'text' | 'voice';
    },
  ) {
    return this.analyticsService.createAIUsageArtifacts(
      data.roomId,
      data.userId,
      data.type,
    );
  }
}
