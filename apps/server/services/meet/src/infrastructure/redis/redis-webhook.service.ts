/**
 * Redis Webhook Service
 *
 * Handles webhook data in Redis.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@server/shared';

const REDIS_PREFIX = 'wajlc:';
const WEBHOOK_HASH_KEY = `${REDIS_PREFIX}webhookData`;
export const WEBHOOK_CLEANUP_SUBJECT = `${REDIS_PREFIX}webhookCleanup`;
const DEFAULT_TTL = 60 * 60 * 24; // 24 hours in seconds

export interface WebhookData {
  urls: string[];
  perform_deleting: boolean;
}

@Injectable()
export class RedisWebhookService {
  private readonly logger = new Logger(RedisWebhookService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * AddWebhookData adds or updates webhook data for a room.
   */
  async addWebhookData(roomId: string, val: Buffer | string): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      pipeline.hset(WEBHOOK_HASH_KEY, roomId, val);

      // Note: HExpire is a Redis 7.4+ command.
      // If the server doesn't support it, this might fail.
      // Using send_command for compatibility if ioredis doesn't have it explicitly.
      (pipeline as any).hexpire(WEBHOOK_HASH_KEY, DEFAULT_TTL, roomId);

      await pipeline.exec();
    } catch (error) {
      this.logger.error(
        `AddWebhookData failed for roomId ${roomId}: ${error.message}`,
      );
      // Fallback for older Redis versions that don't support HEXPIRE
      if (error.message.includes('unknown command')) {
        await this.redis.hset(WEBHOOK_HASH_KEY, roomId, val);
        // We can't set per-field TTL, so we just log it.
        this.logger.warn(
          `HEXPIRE not supported, field TTL not set for roomId ${roomId}`,
        );
      } else {
        throw error;
      }
    }
  }

  /**
   * GetWebhookData retrieves webhook data for a specific room.
   */
  async getWebhookData(roomId: string): Promise<Buffer | null> {
    try {
      const val = await this.redis.hgetBuffer(WEBHOOK_HASH_KEY, roomId);
      return val || null;
    } catch (error) {
      this.logger.error(
        `GetWebhookData failed for roomId ${roomId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * DeleteWebhookData deletes the webhook data for a specific room.
   */
  async deleteWebhookData(roomId: string): Promise<void> {
    try {
      await this.redis.hdel(WEBHOOK_HASH_KEY, roomId);
    } catch (error) {
      this.logger.error(
        `DeleteWebhookData failed for roomId ${roomId}: ${error.message}`,
      );
      throw error;
    }
  }
}
