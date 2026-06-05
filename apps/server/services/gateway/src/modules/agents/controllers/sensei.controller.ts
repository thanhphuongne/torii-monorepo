import {
  Controller,
  Post,
  Get,
  Body,
  Inject,
  Req,
  UseGuards,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  successResponse,
  errorResponse,
  GatewayAuthGuard,
  ReqWithRequester,
  AppConfigService,
  PermissionsGuard,
  Permissions,
} from '@server/shared';
import { WajlcTokenClaimsSchema } from '@workspace/protocol';
import { create } from '@bufbuild/protobuf';
import { generateVoiceAgentLivekitToken } from '../utils/voice-agent-token';

/**
 * Sensei Gateway Handler
 * Handles Sensei AI agent requests from clients
 * Forwards to agents service via NATS
 */
@Controller('api/agents')
export class SenseiHandler {
  private readonly logger = new Logger(SenseiHandler.name);

  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
    private readonly appConfig: AppConfigService,
  ) { }

  @Post('grammar-check')
  @UseGuards(GatewayAuthGuard)
  async grammarCheck(@Req() req: ReqWithRequester, @Body() body: any) {
    const requester = req.requester;
    const userId = requester?.sub;
    try {
      this.logger.log(`📝 Grammar check request from user ${userId}`);
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'agents.sensei.grammarCheck' },
          { requester, ...body },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(`Grammar check failed for user ${userId}`, error.stack);
      return errorResponse(error.message || 'Failed to check grammar');
    }
  }

  @Post('translate')
  @UseGuards(GatewayAuthGuard)
  async translate(@Req() req: ReqWithRequester, @Body() body: any) {
    const requester = req.requester;
    const userId = requester?.sub;
    try {
      this.logger.log(`🌐 Translation request from user ${userId}`);
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'agents.sensei.translate' },
          { requester, ...body },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(`Translation failed for user ${userId}`, error.stack);
      return errorResponse(error.message || 'Failed to translate');
    }
  }

  @Post('flashcard')
  @UseGuards(GatewayAuthGuard)
  async createFlashcard(@Req() req: ReqWithRequester, @Body() body: any) {
    const requester = req.requester;
    const userId = requester?.sub;
    try {
      this.logger.log(`📇 Flashcard creation request from user ${userId}`);
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'agents.sensei.createFlashcard' },
          { requester, ...body },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(
        `Flashcard creation failed for user ${userId}`,
        error.stack,
      );
      return errorResponse(error.message || 'Failed to create flashcard');
    }
  }

  @Post('flashcard/autofill')
  @UseGuards(GatewayAuthGuard)
  async autofillFlashcard(@Req() req: ReqWithRequester, @Body() body: any) {
    const requester = req.requester;
    const userId = requester?.sub;

    if (!body?.term || typeof body.term !== 'string' || !body.term.trim()) {
      throw new BadRequestException('term is required');
    }

    try {
      this.logger.log(`✨ Flashcard autofill request from user ${userId}`);
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'agents.sensei.autofillFlashcard' },
          { requester, term: body.term.trim() },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(
        `Flashcard autofill failed for user ${userId}`,
        error.stack,
      );
      return errorResponse(error.message || 'Failed to autofill flashcard');
    }
  }

  @Post('conversation/simulate')
  @UseGuards(GatewayAuthGuard)
  async simulateConversation(@Req() req: ReqWithRequester, @Body() body: any) {
    const requester = req.requester;
    const userId = requester?.sub;
    try {
      this.logger.log(`💬 Conversation simulation request from user ${userId}`);
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'agents.sensei.simulateConversation' },
          { requester, ...body },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(
        `Conversation simulation failed for user ${userId}`,
        error.stack,
      );
      return errorResponse(error.message || 'Failed to simulate conversation');
    }
  }

  @Post('resources/recommend')
  @UseGuards(GatewayAuthGuard)
  async recommendResources(@Req() req: ReqWithRequester, @Body() body: any) {
    const requester = req.requester;
    const userId = requester?.sub;
    try {
      this.logger.log(`📚 Resource recommendation request from user ${userId}`);
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'agents.sensei.recommendResources' },
          { requester, ...body },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(
        `Resource recommendation failed for user ${userId}`,
        error.stack,
      );
      return errorResponse(error.message || 'Failed to recommend resources');
    }
  }

  @Post('chat')
  @UseGuards(GatewayAuthGuard)
  async chat(@Req() req: ReqWithRequester, @Body() body: any) {
    const requester = req.requester;
    const userId = requester?.sub;
    try {
      this.logger.log(`💬 Chat request from user ${userId}`);
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'agents.sensei.chat' },
          { requester, ...body },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(`Chat failed for user ${userId}`, error.stack);
      return errorResponse(error.message || 'Failed to chat');
    }
  }

  @Post('lesson/chat')
  @UseGuards(GatewayAuthGuard)
  async lessonChat(@Req() req: ReqWithRequester, @Body() body: any) {
    const requester = req.requester;
    const userId = requester?.sub;
    try {
      this.logger.log(`📖 Lesson chat request from user ${userId} for lesson ${body.lessonId}`);

      // Check Quota
      const quota = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'billing.quota.checkAndConsume' },
          { userId, feature: 'ai_turns' },
        ),
      );
      if (quota.allowed === false) {
        return errorResponse(
          `Bạn đã hết lượt sử dụng AI hôm nay. Vui lòng nâng cấp gói để tiếp tục.`,
        );
      }

      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'agents.sensei.lessonChat' },
          { requester, ...body },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(`Lesson chat failed for user ${userId}`, error.stack);
      return errorResponse(error.message || 'Failed to chat about lesson');
    }
  }

  @Post('roleplay')
  @UseGuards(GatewayAuthGuard)
  async roleplay(@Req() req: ReqWithRequester, @Body() body: any) {
    const requester = req.requester;
    const userId = requester?.sub;
    try {
      // Check Quota (only for the first turn or general turn)
      if (!body.history || body.history.length === 0) {
        const quota = await firstValueFrom(
          this.natsClient.send(
            { cmd: 'billing.quota.checkAndConsume' },
            { userId, feature: 'ai_turns' },
          ),
        );
        if (quota.allowed === false) {
          return errorResponse(
            `Bạn đã hết lượt sử dụng AI hôm nay. Vui lòng nâng cấp gói để tiếp tục.`,
          );
        }
      }

      this.logger.log(`🎭 Roleplay request from user ${userId}`);

      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'agents.sensei.roleplay' },
          { requester, ...body },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(`Roleplay failed`, error.stack);
      return errorResponse(error.message || 'Failed to process roleplay');
    }
  }

  @Post('tts')
  @UseGuards(GatewayAuthGuard)
  async tts(
    @Req() req: ReqWithRequester,
    @Body() body: { text: string; voice?: string },
  ) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'agents.sensei.tts' },
          { text: body.text, voice: body.voice },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(`TTS generation failed`, error.stack);
      return errorResponse(error.message || 'Failed to generate TTS');
    }
  }

  @Post('livekit-consume')
  @UseGuards(GatewayAuthGuard)
  async consumeLivekitQuota(@Req() req: ReqWithRequester) {
    const userId = req.requester?.sub;

    try {
      const usageResult = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'billing.quota.checkAndConsume' },
          {
            userId,
            feature: 'ai_turns',
          },
        ),
      );

      if (!usageResult || usageResult.allowed === false) {
        return errorResponse(
          usageResult?.message ||
          'Bạn đã hết lượt sử dụng AI hôm nay. Vui lòng nâng cấp gói để tiếp tục.',
        );
      }

      return successResponse({
        allowed: true,
        status: usageResult.status,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to consume livekit quota for user ${userId}`,
        error.stack,
      );
      return errorResponse(error.message || 'Failed to consume livekit quota');
    }
  }

  @Post('livekit-token')
  @UseGuards(GatewayAuthGuard)
  async getLivekitToken(
    @Req() req: ReqWithRequester,
    @Body() body: { graphName?: string; geminiApiKey?: string },
  ) {
    const requester = req.requester;
    const userId = requester?.sub;

    try {
      this.logger.log(
        `🔑 Fetching LiveKit Token for Roleplay Cloud from user ${userId}`,
      );

      // Check usage and deduct quota
      const usageResult = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'billing.quota.checkAndConsume' },
          {
            userId,
            feature: 'ai_turns',
          },
        ),
      );

      if (!usageResult || usageResult.allowed === false) {
        return errorResponse(
          usageResult?.message ||
          'Bạn đã hết lượt sử dụng AI hôm nay. Vui lòng nâng cấp gói để tiếp tục.',
        );
      }

      const { apiKey, apiSecret, wsUrl } = this.appConfig.livekitRoleplay;
      const tokenValidity = 7200; // 2 hours
      // Unique room per-session: prevents old agent from interfering with new session
      const graphName = body.graphName || 'japanese_tutor';
      const sessionId = Date.now().toString(36);
      const roomId = `roleplay-${graphName}-${userId}-${sessionId}`;
      const graphConfig = this.resolveVoiceGraphConfig(graphName);
      const agentName = process.env.VOICE_AGENT_NAME || 'torii-voice-agent';
      const metadata = JSON.stringify({
        graphName,
        model: graphConfig.model,
        voice: graphConfig.voice,
        temperature: graphConfig.temperature,
        instructions: graphConfig.instructions,
        modalities: graphConfig.modalities,
        max_output_tokens: graphConfig.maxOutputTokens,
        gemini_api_key:
          body.geminiApiKey ||
          process.env.GOOGLE_API_KEY ||
          process.env.GEMINI_API_KEY ||
          '',
      });

      const claims = create(WajlcTokenClaimsSchema, {
        roomId: roomId,
        name: (requester as any)?.name || 'Student',
        userId: userId,
        isAdmin: false,
      });

      const token = await generateVoiceAgentLivekitToken({
        apiKey,
        apiSecret,
        tokenValidity,
        claims,
        metadata,
        agentName,
      });

      return successResponse({
        token,
        wsUrl,
        roomId,
        quota: usageResult.status,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to generate LiveKit token for user ${userId}`,
        error.stack,
      );
      return errorResponse(error.message || 'Failed to generate token');
    }
  }

  @Get('sensei/subscription-plans')
  @UseGuards(GatewayAuthGuard)
  async getSubscriptionPlans() {
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'billing.subscription.getPlans' }, {}),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(`Failed to fetch subscription plans`, error.stack);
      return successResponse([]); // Return empty array instead of error for UI stability
    }
  }

  @Get('sensei/quota-status')
  @UseGuards(GatewayAuthGuard)
  async getQuotaStatus(@Req() req: ReqWithRequester) {
    const userId = req.requester?.sub;
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'billing.quota.getStatus' },
          {
            userId,
            feature: 'ai_turns',
          },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(
        `Failed to get quota status for user ${userId}`,
        error.stack,
      );
      return errorResponse(error.message || 'Failed to fetch quota status');
    }
  }

  // --- Admin CRUD for Subscriptions ---

  @Get('admin/subscriptions/plans')
  @UseGuards(GatewayAuthGuard, PermissionsGuard)
  @Permissions('ops.subscription.manage')
  async admin_getPlans() {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'admin.billing.subscription.getAllPlans' },
          {},
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(`Failed to fetch all subscription plans`, error.stack);
      return errorResponse(error.message || 'Failed to fetch plans');
    }
  }

  @Patch('admin/subscriptions/plans/:id')
  @UseGuards(GatewayAuthGuard, PermissionsGuard)
  @Permissions('ops.subscription.manage')
  async admin_updatePlan(@Param('id') id: string, @Body() body: any) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'admin.billing.subscription.updatePlan' },
          { id, plan: body },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(
        `Failed to update subscription plan ${id}`,
        error.stack,
      );
      return errorResponse(error.message || 'Failed to update plan');
    }
  }

  @Get('admin/subscriptions/user-subscriptions')
  @UseGuards(GatewayAuthGuard, PermissionsGuard)
  @Permissions('ops.subscription.manage')
  async admin_getUserSubscriptions(@Query() query: any) {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'admin.billing.subscription.getUserSubscriptions' },
          {
            page: parseInt(query.page) || 1,
            limit: parseInt(query.limit) || 10,
            search: query.search,
            planCode: query.planCode,
          },
        ),
      );
      return successResponse(result);
    } catch (error: any) {
      this.logger.error(`Failed to fetch user subscriptions`, error.stack);
      return errorResponse(
        error.message || 'Failed to fetch user subscriptions',
      );
    }
  }

  private joinCooldowns = new Map<string, number>();

  private resolveVoiceGraphConfig(graphName: string): {
    model: string;
    voice: string;
    temperature: number;
    instructions: string;
    modalities: string;
    maxOutputTokens: string;
  } {
    const graph = graphName || 'japanese_tutor';

    if (graph === 'roleplay') {
      return {
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        voice: 'Puck',
        temperature: 0.8,
        instructions:
          'You are Yuki, a native Japanese conversation partner. Always speak only Japanese and keep responses concise and natural for voice conversation.',
        modalities: 'audio_only',
        maxOutputTokens: 'inf',
      };
    }

    if (graph === 'free_conversation') {
      return {
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        voice: 'Charon',
        temperature: 0.7,
        instructions:
          'You are a friendly Japanese speaking partner. Always answer in Japanese, concise and supportive, and ask follow-up questions.',
        modalities: 'audio_only',
        maxOutputTokens: 'inf',
      };
    }

    return {
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      voice: 'Aoede',
      temperature: 0.7,
      instructions:
        'You are Sakura, a helpful Japanese tutor. Always answer only in Japanese and guide learners with gentle corrections and encouragement.',
      modalities: 'audio_only',
      maxOutputTokens: 'inf',
    };
  }

  /**
   * Called by the frontend when the live voice session ends.
   * Triggers reliable token-based billing via NATS, as a fallback / complement
   * to the LiveKit agent's metrics-based billing (which may not fire for Gemini native audio).
   */
  @Post('livekit-end')
  @UseGuards(GatewayAuthGuard)
  async livekitEnd(
    @Req() req: ReqWithRequester,
    @Body()
    body: {
      roomName: string;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      durationSec?: number;
    },
  ) {
    const requester = req.requester;
    const userId = requester?.sub;

    try {
      this.logger.log(
        `🔚 LiveKit session ended for room ${body.roomName}, user=${userId}, tokens=${body.totalTokens}, duration=${body.durationSec ?? 0}s (Billing disabled)`,
      );

      return successResponse({
        billed: false,
      });
    } catch (error: any) {
      this.logger.error(
        `❌ Error in livekit-end (billing disabled) for user ${userId}: ${error.message}`,
      );
      return errorResponse(error.message || 'Failed to process session end');
    }

    /*
        try {
            if (body.totalTokens > 0) {
                // Primary: token-based billing
                this.natsClient.emit(
                    { cmd: 'billing.quota.recordTokenUsage' },
                    {
                        userId,
                        taskType: 'live_voice',
                        usage: {
                            promptTokenCount: body.inputTokens || 0,
                            candidatesTokenCount: body.outputTokens || 0,
                            totalTokenCount: body.totalTokens,
                            model: 'gemini-2.5-flash-native-audio-latest',
                        },
                    },
                );
                this.logger.log(
                    `[billing] Emitted token billing for user=${userId}, tokens=${body.totalTokens}`,
                );
            } else if ((body.durationSec ?? 0) > 10) {
                // Fallback: duration-based billing (when Gemini native audio doesn't emit metrics)
                // Rate: ~3 Coins/second based on Gemini 2.5 Flash native audio pricing at avg usage
                const durationSec = body.durationSec!;
                const estimatedCoins = Math.ceil(durationSec * 3); // 3 coins/sec ≈ reasonable estimate
                this.natsClient.emit(
                    { cmd: 'billing.user_balance.deduct' },
                    {
                        userId,
                        amount: estimatedCoins,
                        reason: `Sử dụng Live Voice (thời lượng): ${Math.floor(durationSec / 60)}m ${durationSec % 60}s`,
                    },
                );
                this.logger.log(
                    `[billing] Duration fallback billing for user=${userId}: ${durationSec}s → ${estimatedCoins} coins`,
                );
            } else {
                this.logger.warn(
                    `[billing] livekit-end: user=${userId} has 0 tokens and <10s duration. Skipping deduction.`,
                );
            }

            return successResponse({
                billed: body.totalTokens > 0 || (body.durationSec ?? 0) > 10,
            });
        } catch (error: any) {
            this.logger.error(
                `❌ Failed to bill live session for user ${userId}: ${error.message}`,
            );
            return errorResponse(error.message || 'Failed to bill session');
        }
        */
  }
}
