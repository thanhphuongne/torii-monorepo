import {
  Controller,
  Post,
  Body,
  Inject,
  Req,
  UseGuards,
  Logger,
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
 * Assessment Gateway Handler
 * Handles Assessment AI agent requests from clients
 * Forwards to agents service via NATS
 */
@Controller('api/agents')
export class AssessmentHandler {
  private readonly logger = new Logger(AssessmentHandler.name);

  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Post('test/generate')
  @UseGuards(GatewayAuthGuard)
  async generateTest(@Req() req: ReqWithRequester, @Body() body: any) {
    const requester = req.requester;
    const userId = requester?.sub;
    try {
      this.logger.log(`📝 Test generation request from user ${userId}`);
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'agents.assessment.generateTest' },
          { requester, ...body },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(
        `Test generation failed for user ${userId}`,
        error.stack,
      );
      return errorResponse(error.message || 'Failed to generate test');
    }
  }

  @Post('test/evaluate')
  @UseGuards(GatewayAuthGuard)
  async evaluateTest(@Req() req: ReqWithRequester, @Body() body: any) {
    const requester = req.requester;
    const userId = requester?.sub;
    try {
      this.logger.log(`✅ Test evaluation request from user ${userId}`);
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'agents.assessment.evaluateTest' },
          { requester, ...body },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(
        `Test evaluation failed for user ${userId}`,
        error.stack,
      );
      return errorResponse(error.message || 'Failed to evaluate test');
    }
  }

  // Legacy placement endpoints are deprecated in favor of /api/academy/placement/*
}
