import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@server/shared';

const REDIS_PREFIX = 'wajlc:';
const AI_TEXT_CHAT_USAGE_KEY = `${REDIS_PREFIX}insights:aiTextChat:usage:%s`;

@Injectable()
export class AIUsageTrackingService {
  private readonly logger = new Logger(AIUsageTrackingService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Update AI usage tokens in Redis
   * @param roomId The session ID or Room ID
   * @param userId The user ID
   * @param taskType The type of task (e.g., 'chat', 'roleplay', 'grammar')
   * @param promptTokens tokens in prompt
   * @param completionTokens tokens in completion
   * @param totalTokens total tokens
   */
  async updateAITextChatUsage(
    roomId: string,
    userId: string,
    taskType: string,
    promptTokens: number,
    completionTokens: number,
    totalTokens: number,
  ): Promise<void> {
    const key = AI_TEXT_CHAT_USAGE_KEY.replace('%s', roomId);
    const pipeline = this.redis.pipeline();

    // Per-user tracking
    pipeline.hincrby(key, `${userId}:${taskType}:prompt`, promptTokens);
    pipeline.hincrby(key, `${userId}:${taskType}:completion`, completionTokens);
    pipeline.hincrby(key, `${userId}:${taskType}:total`, totalTokens);

    // Global, per-task tracking for the session
    pipeline.hincrby(key, `total_${taskType}_prompt_tokens`, promptTokens);
    pipeline.hincrby(
      key,
      `total_${taskType}_completion_tokens`,
      completionTokens,
    );
    pipeline.hincrby(key, `total_${taskType}_tokens`, totalTokens);

    pipeline.expire(key, 86400); // 24 hours
    await pipeline.exec();
  }

  async getUsage(roomId: string): Promise<Record<string, number>> {
    const key = AI_TEXT_CHAT_USAGE_KEY.replace('%s', roomId);
    const rawMap = await this.redis.hgetall(key);
    const usageMap: Record<string, number> = {};
    for (const [k, v] of Object.entries(rawMap)) {
      usageMap[k] = parseInt(v, 10) || 0;
    }
    return usageMap;
  }

  async deleteUsage(roomId: string): Promise<void> {
    const key = AI_TEXT_CHAT_USAGE_KEY.replace('%s', roomId);
    await this.redis.del(key);
  }
}
