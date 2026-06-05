import {
  Controller,
  Post,
  Get,
  Body,
  Inject,
  Req,
  UseGuards,
  Logger,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  successResponse,
  errorResponse,
  GatewayAuthGuard,
  ReqWithRequester,
} from '@server/shared';

/**
 * Analytics Gateway Handler
 * Handles Analytics AI agent requests from clients
 * Forwards to agents service via NATS
 */
@Controller('api/agents')
export class AnalyticsHandler {
  private readonly logger = new Logger(AnalyticsHandler.name);

  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  // ── Cached Snapshot Endpoints (Solution A) ───────────────────────────────

  /**
   * GET /api/agents/analytics/snapshot
   * Returns cached AI snapshot if still valid (< 24h).
   * Returns { snapshot: null, isStale: true } when no cache or expired.
   */
  @Get('analytics/snapshot')
  @UseGuards(GatewayAuthGuard)
  async getSnapshot(
    @Req() req: ReqWithRequester,
    @Query('targetLevel') targetLevel: string = 'N5',
  ) {
    const requester = req.requester;
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'agents.analytics.getSnapshot' },
          { requester, targetLevel },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(
        `Get snapshot failed for user ${requester?.sub}`,
        error.stack,
      );
      return errorResponse(error.message || 'Failed to get analytics snapshot');
    }
  }

  /**
   * POST /api/agents/analytics/snapshot/generate
   * Triggers AI generation (Gemini). Saves result to DB as a snapshot.
   * Only called when user explicitly requests AI analysis.
   */
  @Post('analytics/snapshot/generate')
  @UseGuards(GatewayAuthGuard)
  async generateSnapshot(
    @Req() req: ReqWithRequester,
    @Body() body: { targetLevel?: string },
  ) {
    const requester = req.requester;
    const userId = requester?.sub;
    try {
      this.logger.log(`🤖 AI snapshot generation requested by user ${userId}`);
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'agents.analytics.generateSnapshot' },
          { requester, targetLevel: body.targetLevel || 'N5' },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(
        `Snapshot generation failed for user ${userId}`,
        error.stack,
      );
      return errorResponse(error.message || 'Failed to generate AI analytics');
    }
  }

  // ── Legacy Direct AI Endpoints (kept for backward compatibility) ──────────

  @Post('progress/track')
  @UseGuards(GatewayAuthGuard)
  async trackProgress(@Req() req: ReqWithRequester, @Body() body: any) {
    const requester = req.requester;
    const userId = requester?.sub;
    try {
      this.logger.log(`📈 Progress tracking request from user ${userId}`);
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'agents.analytics.trackProgress' },
          { requester, ...body },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(
        `Progress tracking failed for user ${userId}`,
        error.stack,
      );
      return errorResponse(error.message || 'Failed to track progress');
    }
  }

  @Post('path/suggest')
  @UseGuards(GatewayAuthGuard)
  async suggestStudyPath(@Req() req: ReqWithRequester, @Body() body: any) {
    const requester = req.requester;
    const userId = requester?.sub;
    try {
      this.logger.log(`🗺️ Study path suggestion request from user ${userId}`);
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'agents.analytics.suggestStudyPath' },
          { requester, ...body },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(
        `Study path suggestion failed for user ${userId}`,
        error.stack,
      );
      return errorResponse(error.message || 'Failed to suggest study path');
    }
  }

  @Post('analytics/report')
  @UseGuards(GatewayAuthGuard)
  async generateReport(@Req() req: ReqWithRequester, @Body() body: any) {
    const requester = req.requester;
    const userId = requester?.sub;
    try {
      this.logger.log(`📄 Report generation request from user ${userId}`);
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'agents.analytics.generateReport' },
          { requester, ...body },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(
        `Report generation failed for user ${userId}`,
        error.stack,
      );
      return errorResponse(error.message || 'Failed to generate report');
    }
  }

  @Post('analytics/readiness-profile')
  @UseGuards(GatewayAuthGuard)
  async getReadinessProfile(@Req() req: ReqWithRequester, @Body() body: any) {
    const requester = req.requester;
    const userId = requester?.sub;
    try {
      this.logger.log(`📊 Readiness profile request from user ${userId}`);
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'agents.analytics.readinessProfile' },
          { requester, ...body },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(
        `Readiness profile failed for user ${userId}`,
        error.stack,
      );
      return errorResponse(
        error.message || 'Failed to fetch readiness profile',
      );
    }
  }
}
