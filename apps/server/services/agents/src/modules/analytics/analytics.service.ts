import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { FastMcpService } from '../../fastmcp/fastmcp.service';
import { z } from 'zod';
import {
  AgentReadinessProfileResponseSchema,
  AgentStudyPathResponseSchema,
  Requester,
} from '@workspace/schemas';
import Redis from 'ioredis';

const SNAPSHOT_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const SNAPSHOT_KEY = (userId: string, targetLevel: string) =>
  `analytics:snapshot:${userId}:${targetLevel}`;

export interface AnalyticsSnapshotCache {
  progressData: any;
  studyPathData: any;
  profileData: any;
  generatedAt: string; // ISO string
  targetLevel: string;
}

import { AIUsageTrackingService } from './ai-usage-tracking.service';

import { PrismaService, AppConfigService } from '@server/shared';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AnalyticsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name);
  private redis: Redis;

  constructor(
    private readonly fastMcpService: FastMcpService,
    private readonly aiUsageTracking: AIUsageTrackingService,
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  private async deductCoins(userId: string, taskType: string, usage: any) {
    // Billing is temporarily disabled for Agents analytics.
    // Keep this method as a stable extension point so we can re-enable
    // token-based deduction later without touching business flow callsites.
    /*
    // Only deduct coins for roleplay
    if (taskType !== 'roleplay') {
      return;
    }

    this.natsClient.emit(
      { cmd: 'billing.quota.recordTokenUsage' },
      {
        userId,
        taskType,
        usage: {
          promptTokenCount: usage.promptTokenCount,
          candidatesTokenCount: usage.candidatesTokenCount,
          totalTokenCount: usage.totalTokenCount,
        },
      },
    );
    */
    return;
  }

  async onModuleInit() {
    // Init Redis connection
    const redisUrl =
      process.env.REDIS_URL ||
      process.env.REDIS_URI ||
      'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
    });

    try {
      await this.redis.connect();
      this.logger.log('✅ Redis connected for analytics cache');
    } catch (err) {
      this.logger.warn(
        `⚠️ Redis connection failed — analytics will run without cache: ${err.message}`,
      );
    }

    this.registerTools();
  }

  async onModuleDestroy() {
    if (this.redis?.status === 'ready') {
      await this.redis.quit();
    }
  }

  // ── Redis helpers ────────────────────────────────────────────────────────

  private async getCached(
    userId: string,
    targetLevel: string,
  ): Promise<AnalyticsSnapshotCache | null> {
    try {
      const raw = await this.redis.get(SNAPSHOT_KEY(userId, targetLevel));
      if (!raw) return null;
      const parsed: AnalyticsSnapshotCache = JSON.parse(raw);
      return parsed;
    } catch {
      return null;
    }
  }

  private async setCache(
    userId: string,
    targetLevel: string,
    data: AnalyticsSnapshotCache,
  ): Promise<void> {
    try {
      await this.redis.set(
        SNAPSHOT_KEY(userId, targetLevel),
        JSON.stringify(data),
        'EX',
        SNAPSHOT_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(`⚠️ Failed to write analytics cache: ${err.message}`);
    }
  }

  // ── Public cache methods ─────────────────────────────────────────────────

  /**
   * getSnapshot — đọc cache từ Redis. Trả về null nếu không có hoặc đã expire (auto-handled by Redis TTL).
   */
  async getSnapshot(
    requester: Requester,
    targetLevel: string = 'N5',
  ): Promise<{
    snapshot: AnalyticsSnapshotCache | null;
    isStale: boolean;
  }> {
    const snapshot = await this.getCached(requester.sub, targetLevel);
    return {
      snapshot,
      isStale: !snapshot,
    };
  }

  /**
   * generateAndSaveSnapshot — gọi 3 AI APIs song song, lưu vào Redis với TTL 24h.
   * Chỉ nên gọi khi user explicitly yêu cầu phân tích AI.
   */
  async generateAndSaveSnapshot(
    requester: Requester,
    targetLevel: string = 'N5',
  ): Promise<AnalyticsSnapshotCache> {
    this.logger.log(
      `🤖 Generating AI snapshot for user ${requester.sub} (${targetLevel})`,
    );

    // Gọi song song 3 AI tools
    const [progressData, studyPathData, profileData] = await Promise.all([
      this.fastMcpService.callTool('analytics_track_progress', {
        userId: requester.sub,
        timeframe: 'month',
      }),
      this.fastMcpService.callTool('analytics_suggest_study_path', {
        userId: requester.sub,
        targetLevel,
      }),
      this.fastMcpService.callTool('analytics_get_readiness_profile', {
        userId: requester.sub,
        targetLevel,
      }),
    ]);

    const snapshot: AnalyticsSnapshotCache = {
      progressData,
      studyPathData,
      profileData,
      generatedAt: new Date().toISOString(),
      targetLevel,
    };

    await this.setCache(requester.sub, targetLevel, snapshot);
    this.logger.log(
      `✅ AI snapshot generated & cached for user ${requester.sub} (TTL: 24h)`,
    );

    return snapshot;
  }

  // ── Tool registration & legacy methods ───────────────────────────────────

  private registerTools() {
    // 1. Track Progress
    this.fastMcpService.addTool(
      'analytics_track_progress',
      'Track learning progress over time',
      z.object({
        userId: z.string(),
        timeframe: z
          .enum(['week', 'month', 'quarter', 'year'])
          .default('month'),
      }),
      async ({ userId, timeframe }) => {
        const userContext = await this.fastMcpService.getUserContext(userId);
        const template = this.fastMcpService.loadPromptTemplate(
          'analytics/progress-tracking.md',
        );
        const prompt = template({
          userId,
          timeframe,
          userContext,
          timestamp: new Date().toISOString(),
        });
        const { text: response, usage } =
          await this.fastMcpService.callGemini(prompt);

        // Record usage
        await this.aiUsageTracking.updateAITextChatUsage(
          `an-${userId}`,
          userId,
          'progress_tracking',
          usage.promptTokenCount,
          usage.candidatesTokenCount,
          usage.totalTokenCount,
        );

        await this.deductCoins(userId, 'progress_tracking', usage);

        return this.fastMcpService.cleanJsonResponse(response);
      },
    );

    // 2. Suggest Study Path
    this.fastMcpService.addTool(
      'analytics_suggest_study_path',
      'Suggest a personalized study path',
      z.object({
        userId: z.string(),
        targetLevel: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']),
        timeframe: z.string().optional(),
      }),
      async ({ userId, targetLevel, timeframe }) => {
        const userContext = await this.fastMcpService.getUserContext(userId);
        const curriculum =
          this.fastMcpService.loadResource('jlpt-syllabus.json');
        const levelCurriculum = curriculum ? curriculum[targetLevel] : null;

        const template = this.fastMcpService.loadPromptTemplate(
          'analytics/study-path-suggestion.md',
        );
        const prompt = template({
          userId,
          targetLevel,
          timeframe,
          userContext,
          curriculum: levelCurriculum,
          timestamp: new Date().toISOString(),
        });

        const { data, usage } = await this.fastMcpService.callGeminiWithSchema(
          prompt,
          AgentStudyPathResponseSchema,
        );

        // Record usage
        await this.aiUsageTracking.updateAITextChatUsage(
          `an-${userId}`,
          userId,
          'study_path',
          usage.promptTokenCount,
          usage.candidatesTokenCount,
          usage.totalTokenCount,
        );

        await this.deductCoins(userId, 'study_path', usage);

        return data;
      },
    );

    // 3. Generate Report
    this.fastMcpService.addTool(
      'analytics_generate_report',
      'Generate comprehensive analytics report',
      z.object({
        userId: z.string(),
        reportType: z
          .enum(['progress', 'assessment', 'comprehensive'])
          .default('comprehensive'),
        timeframe: z.string().default('month'),
      }),
      async ({ userId, reportType, timeframe }) => {
        const userContext = await this.fastMcpService.getUserContext(userId);
        const template = this.fastMcpService.loadPromptTemplate(
          'analytics/report-generation.md',
        );
        const prompt = template({
          userId,
          reportType,
          period: timeframe,
          userContext,
          timestamp: new Date().toISOString(),
        });
        const { text: response, usage } =
          await this.fastMcpService.callGemini(prompt);

        // Record usage
        await this.aiUsageTracking.updateAITextChatUsage(
          `an-${userId}`,
          userId,
          'report_generation',
          usage.promptTokenCount,
          usage.candidatesTokenCount,
          usage.totalTokenCount,
        );

        await this.deductCoins(userId, 'report_generation', usage);

        return this.fastMcpService.cleanJsonResponse(response);
      },
    );

    // 4. Readiness Profile (Unified)
    this.fastMcpService.addTool(
      'analytics_get_readiness_profile',
      'Get a comprehensive readiness profile and benchmark',
      z.object({
        userId: z.string(),
        targetLevel: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']),
      }),
      async ({ userId, targetLevel }) => {
        // Fetch real metrics from core service via NATS
        const metrics = await firstValueFrom(
          this.natsClient.send(
            { cmd: 'learning.readinessMetrics' },
            { userId },
          ),
        ).catch((err) => {
          this.logger.warn(
            `Failed to fetch readiness metrics for user ${userId}: ${err.message}`,
          );
          return null;
        });

        const template = this.fastMcpService.loadPromptTemplate(
          'analytics/readiness-profile.md',
        );
        const userContext = await this.fastMcpService.getUserContext(userId);

        const prompt = template({
          userId,
          targetLevel,
          metrics,
          userContext,
          timestamp: new Date().toISOString(),
        });

        const { data, usage } = await this.fastMcpService.callGeminiWithSchema(
          prompt,
          AgentReadinessProfileResponseSchema,
        );

        // Record usage
        await this.aiUsageTracking.updateAITextChatUsage(
          `an-${userId}`,
          userId,
          'readiness_profile',
          usage.promptTokenCount,
          usage.candidatesTokenCount,
          usage.totalTokenCount,
        );

        await this.deductCoins(userId, 'readiness_profile', usage);

        return data;
      },
    );
  }

  // --- Legacy Public Methods (Delegate to Tools) ---

  async trackProgress(
    requester: Requester,
    timeframe: 'week' | 'month' | 'quarter' | 'year' = 'month',
  ): Promise<any> {
    return this.fastMcpService.callTool('analytics_track_progress', {
      userId: requester.sub,
      timeframe,
    });
  }

  async suggestStudyPath(
    requester: Requester,
    targetLevel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1',
    timeframe?: string,
  ): Promise<any> {
    return this.fastMcpService.callTool('analytics_suggest_study_path', {
      userId: requester.sub,
      targetLevel,
      timeframe,
    });
  }

  async generateReport(
    requester: Requester,
    reportType: 'progress' | 'assessment' | 'comprehensive' = 'comprehensive',
    timeframe: string = 'month',
  ): Promise<any> {
    return this.fastMcpService.callTool('analytics_generate_report', {
      userId: requester.sub,
      reportType,
      timeframe,
    });
  }

  async getReadinessProfile(
    requester: Requester,
    targetLevel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1',
  ): Promise<any> {
    return this.fastMcpService.callTool('analytics_get_readiness_profile', {
      userId: requester.sub,
      targetLevel,
    });
  }

  async createAIUsageArtifacts(
    roomId: string,
    userId: string,
    type: 'text' | 'voice',
  ): Promise<void> {
    this.logger.log(
      `📝 Generating AI usage artifacts for ${type} session: ${roomId}`,
    );

    const usage = await this.aiUsageTracking.getUsage(roomId);
    if (!usage || Object.keys(usage).length === 0) {
      this.logger.warn(`No usage data found in Redis for ${roomId}`);
      return;
    }

    // Cleanup usage in Redis
    await this.aiUsageTracking.deleteUsage(roomId);

    const pricing = (this.appConfig.insights as any)?.services;
    const roomTableId = await this.getOrCreateSystemRoom();

    if (type === 'text') {
      await this.generateTextChatArtifacts(
        roomId,
        userId,
        roomTableId,
        usage,
        pricing,
      );
    } else {
      await this.generateVoiceChatArtifacts(
        roomId,
        userId,
        roomTableId,
        usage,
        pricing,
      );
    }
  }

  private async getOrCreateSystemRoom(): Promise<number> {
    let room = await this.prisma.roomInfo.findFirst({
      where: { sid: 'SYSTEM_AI_ROLEPLAY' },
    });
    if (!room) {
      room = await this.prisma.roomInfo.create({
        data: {
          sid: 'SYSTEM_AI_ROLEPLAY',
          roomId: 'SYSTEM_AI_ROLEPLAY',
          roomTitle: 'System AI Roleplay Room',
          isRunning: 1,
        },
      });
    }
    return room.id;
  }

  private async generateTextChatArtifacts(
    roomId: string,
    userId: string,
    roomTableId: number,
    usage: Record<string, number>,
    pricing: any,
  ) {
    const tasks = ['roleplay', 'chat', 'grammar_check', 'translation'];
    const aiPricing =
      pricing?.ai_text_chat?.pricing?.['gemini-2.0-flash'] ||
      pricing?.ai_text_chat?.pricing?.['default'];

    const inputPrice = aiPricing?.inputPricePerMillionTokens || 0.5;
    const outputPrice = aiPricing?.outputPricePerMillionTokens || 1.5;
    const coinRate = this.appConfig.insights.coinRatePerUSD || 25000;

    for (const task of tasks) {
      const prompt =
        usage[`${userId}:${task}:prompt`] ||
        usage[`total_${task}_prompt_tokens`] ||
        0;
      const completion =
        usage[`${userId}:${task}:completion`] ||
        usage[`total_${task}_completion_tokens`] ||
        0;
      const total =
        usage[`${userId}:${task}:total`] || usage[`total_${task}_tokens`] || 0;

      if (total > 0) {
        const promptCostCoin = (prompt / 1000000) * inputPrice * coinRate;
        const completionCostCoin =
          (completion / 1000000) * outputPrice * coinRate;
        const totalCostCoin = promptCostCoin + completionCostCoin;

        const metadata = {
          usageDetails: {
            case: 'tokenUsage',
            value: {
              promptTokens: prompt,
              completionTokens: completion,
              totalTokens: total,
              breakdown: usage,
              promptTokensEstimatedCostCoins: Math.ceil(promptCostCoin),
              completionTokensEstimatedCostCoins: Math.ceil(completionCostCoin),
              totalCostCoins: Math.ceil(totalCostCoin),
            },
          },
        };

        const typeStr =
          task === 'translation'
            ? 'CHAT_TRANSLATION_USAGE'
            : 'AI_TEXT_CHAT_INTERACTION_USAGE';

        await this.prisma.roomArtifact.create({
          data: {
            artifactId: uuidv4(),
            roomTableId: roomTableId,
            roomId: roomId,
            type: typeStr,
            metadata: metadata as any,
          },
        });
      }
    }
  }

  private async generateVoiceChatArtifacts(
    roomId: string,
    userId: string,
    roomTableId: number,
    usage: Record<string, number>,
    pricing: any,
  ) {
    const totalDuration = usage['total_duration'] || 0;
    if (totalDuration <= 0) return;

    // NOTE: Coin deduction is handled by agent-entry.ts via NATS billing.quota.recordTokenUsage
    // (token-based billing at session end). This method only creates the artifact record for analytics.
    const metadata = {
      usageDetails: {
        case: 'durationUsage',
        value: {
          durationSec: totalDuration,
        },
      },
    };

    await this.prisma.roomArtifact.create({
      data: {
        artifactId: uuidv4(),
        roomTableId: roomTableId,
        roomId: roomId,
        type: 'SYNTHESIZED_SPEECH_USAGE',
        metadata: metadata as any,
      },
    });
  }

  private round(val: number, precision: number): number {
    const multiplier = Math.pow(10, precision);
    return Math.round(val * multiplier) / multiplier;
  }
}
