import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@server/shared';
import {
  fromJsonString,
  toJsonString,
} from '@bufbuild/protobuf';
import { InsightsAITextChatContentSchema } from '@workspace/protocol';

const REDIS_PREFIX = 'wajlc:';
const TRANSCRIPTION_SESSIONS_KEY = `${REDIS_PREFIX}insights:transcription_sessions:%s`;
const TRANSCRIPTION_USAGE_KEY = `${REDIS_PREFIX}insights:transcription_usage:%s`;
const CHAT_TRANSLATION_USAGE_KEY = `${REDIS_PREFIX}insights:chatTranslationService:%s:usage`;
const AI_TEXT_CHAT_KEY = `${REDIS_PREFIX}insights:aiTextChat`;
const AI_TEXT_CHAT_USAGE_KEY = `${AI_TEXT_CHAT_KEY}:usage:%s`;
const AI_TEXT_CHAT_CONTEXT_KEY = `${AI_TEXT_CHAT_KEY}:context:%s:%s`;
const AI_TEXT_CHAT_SUMMARY_KEY = `${AI_TEXT_CHAT_KEY}:summary:%s:%s`;
const TTS_SERVICE_USAGE_KEY = `${REDIS_PREFIX}insights:ttsService:%s:usage`;
const TRANSCRIPTION_HISTORY_PREFIX = `${REDIS_PREFIX}transcription_history:`;
const PENDING_SUMMARIZE_JOBS_KEY = `${REDIS_PREFIX}insights:pending_summarize_jobs`;
const TOTAL_USAGE_FIELD = 'total_usage';
const DEFAULT_TTL = 60 * 60 * 24; // 24 hours in seconds

export interface TranscriptionChunk {
  from_user_id: string;
  name: string;
  lang: string;
  text: string;
}

@Injectable()
export class RedisInsightsService {
  private readonly logger = new Logger(RedisInsightsService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}
  
  /**
   * tryLock attempts to acquire a Redis lock for leader election.
   */
  async tryLock(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(
      `lock:${key}`,
      value,
      'EX',
      ttlSeconds,
      'NX',
    );
    return result === 'OK';
  }

  /**
   * releaseLock releases a Redis lock if the value matches.
   */
  async releaseLock(key: string, value: string): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.redis.eval(script, 1, `lock:${key}`, value);
    return result === 1;
  }

  /**
   * refreshLock extends a lock's TTL.
   */
  async refreshLock(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("expire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;
    const result = await this.redis.eval(
      script,
      1,
      `lock:${key}`,
      value,
      ttlSeconds,
    );
    return result === 1;
  }

  /**
   * HandleTranscriptionUsage manages transcription session lifecycle and usage
   */
  async handleTranscriptionUsage(
    roomId: string,
    userId: string,
    isStarted: boolean,
  ): Promise<number> {
    const sessionsKey = TRANSCRIPTION_SESSIONS_KEY.replace('%s', roomId);
    const usageKey = TRANSCRIPTION_USAGE_KEY.replace('%s', roomId);

    if (isStarted) {
      const pipeline = this.redis.pipeline();
      pipeline.hset(
        sessionsKey,
        userId,
        Math.floor(Date.now() / 1000).toString(),
      );
      pipeline.expire(sessionsKey, DEFAULT_TTL);
      await pipeline.exec();
      return 0;
    }

    const startTimeStr = await this.redis.hget(sessionsKey, userId);
    if (!startTimeStr) return 0;

    await this.redis.hdel(sessionsKey, userId);

    const startTime = parseInt(startTimeStr, 10);
    const duration = Math.floor(Date.now() / 1000) - startTime;
    const finalDuration = duration < 0 ? 0 : duration;

    const pipeline = this.redis.pipeline();
    pipeline.hincrby(usageKey, userId, finalDuration);
    pipeline.hincrby(usageKey, TOTAL_USAGE_FIELD, finalDuration);
    pipeline.expire(usageKey, DEFAULT_TTL);
    await pipeline.exec();

    return finalDuration;
  }

  async isTranscriptionSessionActive(
    roomId: string,
    userId: string,
  ): Promise<boolean> {
    const sessionsKey = TRANSCRIPTION_SESSIONS_KEY.replace('%s', roomId);
    const startTimeStr = await this.redis.hget(sessionsKey, userId);
    return !!startTimeStr;
  }

  async getTranscriptionRoomUsage(
    roomId: string,
    cleanup = false,
  ): Promise<Record<string, number>> {
    const key = TRANSCRIPTION_USAGE_KEY.replace('%s', roomId);
    const rawMap = await this.redis.hgetall(key);

    if (cleanup) {
      await this.redis.del(key);
    }

    const usageMap: Record<string, number> = {};
    for (const [k, v] of Object.entries(rawMap)) {
      usageMap[k] = parseInt(v, 10) || 0;
    }
    return usageMap;
  }

  /**
   * IncrementChatTranslationUsage records text translation usage
   */
  async incrementChatTranslationUsage(
    roomId: string,
    userId: string,
    characters: number,
  ): Promise<number> {
    const key = CHAT_TRANSLATION_USAGE_KEY.replace('%s', roomId);
    const pipeline = this.redis.pipeline();
    pipeline.hincrby(key, userId, characters);
    pipeline.hincrby(key, TOTAL_USAGE_FIELD, characters);
    pipeline.expire(key, DEFAULT_TTL);
    const results = await pipeline.exec();
    return (results?.[0]?.[1] as number) || 0;
  }

  async getChatTranslationRoomUsage(
    roomId: string,
    cleanup = false,
  ): Promise<Record<string, number>> {
    const key = CHAT_TRANSLATION_USAGE_KEY.replace('%s', roomId);
    const rawMap = await this.redis.hgetall(key);
    if (cleanup) await this.redis.del(key);
    const usageMap: Record<string, number> = {};
    for (const [k, v] of Object.entries(rawMap)) {
      usageMap[k] = parseInt(v, 10) || 0;
    }
    return usageMap;
  }

  /**
   * UpdateAITextChatUsage records AI chat token usage
   */
  async updateAITextChatUsage(
    roomId: string,
    userId: string,
    taskType: 'chat' | 'summarize',
    promptTokens: number,
    completionTokens: number,
    totalTokens: number,
  ): Promise<void> {
    const key = AI_TEXT_CHAT_USAGE_KEY.replace('%s', roomId);
    const pipeline = this.redis.pipeline();

    // Per-user, per-task tracking
    pipeline.hincrby(key, `${userId}:${taskType}:prompt`, promptTokens);
    pipeline.hincrby(key, `${userId}:${taskType}:completion`, completionTokens);
    pipeline.hincrby(key, `${userId}:${taskType}:total`, totalTokens);

    // Global, per-task tracking
    pipeline.hincrby(key, `total_${taskType}_prompt_tokens`, promptTokens);
    pipeline.hincrby(
      key,
      `total_${taskType}_completion_tokens`,
      completionTokens,
    );
    pipeline.hincrby(key, `total_${taskType}_tokens`, totalTokens);

    pipeline.expire(key, DEFAULT_TTL);
    await pipeline.exec();
  }

  async getAITextChatRoomUsage(
    roomId: string,
    cleanup = false,
  ): Promise<Record<string, number>> {
    const key = AI_TEXT_CHAT_USAGE_KEY.replace('%s', roomId);
    const rawMap = await this.redis.hgetall(key);
    const usageMap: Record<string, number> = {};
    const userIds = new Set<string>();

    for (const [k, v] of Object.entries(rawMap)) {
      usageMap[k] = parseInt(v, 10) || 0;
      if (!k.startsWith('total_')) {
        const parts = k.split(':');
        if (parts.length > 0) userIds.add(parts[0]);
      }
    }

    if (cleanup && Object.keys(usageMap).length > 0) {
      const pipeline = this.redis.pipeline();
      pipeline.del(key);
      for (const userId of userIds) {
        pipeline.del(
          AI_TEXT_CHAT_CONTEXT_KEY.replace('%s', roomId).replace('%s', userId),
        );
        pipeline.del(
          AI_TEXT_CHAT_SUMMARY_KEY.replace('%s', roomId).replace('%s', userId),
        );
      }
      await pipeline.exec();
    }

    return usageMap;
  }

  async getAITextChatSummary(
    roomId: string,
    userId: string,
  ): Promise<string | null> {
    const key = AI_TEXT_CHAT_SUMMARY_KEY.replace('%s', roomId).replace(
      '%s',
      userId,
    );
    return await this.redis.get(key);
  }

  async setAITextChatSummary(
    roomId: string,
    userId: string,
    summary: string,
  ): Promise<void> {
    const key = AI_TEXT_CHAT_SUMMARY_KEY.replace('%s', roomId).replace(
      '%s',
      userId,
    );
    await this.redis.set(key, summary, 'EX', DEFAULT_TTL);
  }

  async getAITextChatContext(
    roomId: string,
    userId: string,
    start: number,
    stop: number,
  ): Promise<any[]> {
    const key = AI_TEXT_CHAT_CONTEXT_KEY.replace('%s', roomId).replace(
      '%s',
      userId,
    );
    const res = await this.redis.lrange(key, start, stop);
    return res
      .map((r) => {
        try {
          return fromJsonString(InsightsAITextChatContentSchema, r, {
            ignoreUnknownFields: true,
          });
        } catch {
          // Backward compatibility with older JSON.stringify storage
          try {
            return JSON.parse(r);
          } catch {
            return null;
          }
        }
      })
      .filter(Boolean);
  }

  async appendToAITextChatContext(
    roomId: string,
    userId: string,
    ...messages: any[]
  ): Promise<void> {
    const key = AI_TEXT_CHAT_CONTEXT_KEY.replace('%s', roomId).replace(
      '%s',
      userId,
    );
    const pipeline = this.redis.pipeline();
    for (const msg of messages) {
      if (msg && typeof msg === 'object') {
        const { $typeName, ...cleanMsg } = msg;
        try {
          pipeline.rpush(
            key,
            toJsonString(InsightsAITextChatContentSchema, cleanMsg as any, {
              useProtoFieldName: true,
            }),
          );
          continue;
        } catch {
          // fallthrough to JSON
        }
      }
      pipeline.rpush(key, JSON.stringify(msg));
    }
    pipeline.expire(key, DEFAULT_TTL);
    await pipeline.exec();
  }

  async getAITextChatContextLength(
    roomId: string,
    userId: string,
  ): Promise<number> {
    const key = AI_TEXT_CHAT_CONTEXT_KEY.replace('%s', roomId).replace(
      '%s',
      userId,
    );
    return await this.redis.llen(key);
  }

  async deleteAITextChatContext(roomId: string, userId: string): Promise<void> {
    const key = AI_TEXT_CHAT_CONTEXT_KEY.replace('%s', roomId).replace(
      '%s',
      userId,
    );
    await this.redis.del(key);
  }

  async updateTTSServiceUsage(
    roomId: string,
    userId: string,
    language: string,
    incBy: number,
  ): Promise<void> {
    const key = TTS_SERVICE_USAGE_KEY.replace('%s', roomId);
    const pipeline = this.redis.pipeline();
    pipeline.hincrby(key, userId, incBy);
    pipeline.hincrby(key, `lang:${language}`, incBy);
    pipeline.hincrby(key, TOTAL_USAGE_FIELD, incBy);
    pipeline.expire(key, DEFAULT_TTL);
    await pipeline.exec();
  }

  async getTTSServiceRoomUsage(
    roomId: string,
    cleanup = false,
  ): Promise<Record<string, number>> {
    const key = TTS_SERVICE_USAGE_KEY.replace('%s', roomId);
    const rawMap = await this.redis.hgetall(key);
    if (cleanup) await this.redis.del(key);
    const usageMap: Record<string, number> = {};
    for (const [k, v] of Object.entries(rawMap)) {
      usageMap[k] = parseInt(v, 10) || 0;
    }
    return usageMap;
  }

  /**
   * Transcription History Methods
   */

  private formatTranscriptionHistoryKey(roomId: string): string {
    return `${TRANSCRIPTION_HISTORY_PREFIX}${roomId}`;
  }

  async addTranscriptionToHistory(
    roomId: string,
    userId: string,
    name: string,
    lang: string,
    text: string,
  ): Promise<void> {
    const key = this.formatTranscriptionHistoryKey(roomId);
    const chunk: TranscriptionChunk = {
      from_user_id: userId,
      name,
      lang,
      text,
    };

    const field = process.hrtime.bigint().toString(); // Use high-res time for nano-seconds
    try {
      const pipeline = this.redis.pipeline();
      pipeline.hset(key, field, JSON.stringify(chunk));
      pipeline.expire(key, DEFAULT_TTL);
      await pipeline.exec();
    } catch (error) {
      this.logger.error(
        `AddTranscriptionToHistory failed for roomId ${roomId}: ${error.message}`,
      );
      throw error;
    }
  }

  async getTranscriptionHistory(
    roomId: string,
  ): Promise<Record<string, string> | null> {
    const key = this.formatTranscriptionHistoryKey(roomId);
    try {
      const result = await this.redis.hgetall(key);
      if (Object.keys(result).length === 0) return null;
      return result;
    } catch (error) {
      this.logger.error(
        `GetTranscriptionHistory failed for roomId ${roomId}: ${error.message}`,
      );
      throw error;
    }
  }

  async deleteTranscriptionHistory(roomId: string): Promise<void> {
    const key = this.formatTranscriptionHistoryKey(roomId);
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(
        `DeleteTranscriptionHistory failed for roomId ${roomId}: ${error.message}`,
      );
    }
  }

  async getPendingSummarizeJobs(): Promise<Record<string, string>> {
    try {
      return await this.redis.hgetall(PENDING_SUMMARIZE_JOBS_KEY);
    } catch (error) {
      this.logger.error(`getPendingSummarizeJobs failed: ${error.message}`);
      return {};
    }
  }

  async removePendingSummarizeJob(jobId: string): Promise<void> {
    try {
      await this.redis.hdel(PENDING_SUMMARIZE_JOBS_KEY, jobId);
    } catch (error) {
      this.logger.error(
        `removePendingSummarizeJob failed for job ${jobId}: ${error.message}`,
      );
    }
  }
}
