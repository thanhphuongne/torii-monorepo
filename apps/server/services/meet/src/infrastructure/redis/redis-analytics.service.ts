/**
 * Redis Analytics Service
 *
 * Handles analytics data storage and retrieval in Redis
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@server/shared';

const REDIS_PREFIX = 'wajlc:';
const ANALYTICS_ROOM_KEY = `${REDIS_PREFIX}analytics:%s:room`;
const ANALYTICS_USER_KEY = `${REDIS_PREFIX}analytics:%s:user:%s`;

/**
 * RedisAnalyticsService handles analytics-related Redis operations
 */
@Injectable()
export class RedisAnalyticsService {
  private readonly logger = new Logger(RedisAnalyticsService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * GetAnalyticsRoomKeyPrefix returns the prefix for room-level analytics
   */
  getAnalyticsRoomKeyPrefix(roomId: string): string {
    return ANALYTICS_ROOM_KEY.replace('%s', roomId);
  }

  /**
   * GetAnalyticsUserKeyPrefix returns the prefix for user-level analytics
   */
  getAnalyticsUserKeyPrefix(roomId: string, userId: string): string {
    return ANALYTICS_USER_KEY.replace('%s', roomId).replace('%s', userId);
  }

  /**
   * AddAnalyticsHSETType adds data to a Redis Hash
   */
  async addAnalyticsHSETType(
    key: string,
    values: Record<string, string>,
  ): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      pipeline.hset(key, values);
      pipeline.expire(key, 24 * 60 * 60); // 24 hours
      await pipeline.exec();
    } catch (error) {
      this.logger.error(
        `AddAnalyticsHSETType failed for key ${key}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * IncrementAnalyticsVal increments a Redis value
   */
  async incrementAnalyticsVal(key: string, amount: number): Promise<number> {
    try {
      const pipeline = this.redis.pipeline();
      pipeline.incrby(key, amount);
      pipeline.expire(key, 24 * 60 * 60); // 24 hours
      const results = await pipeline.exec();
      // Return the incremented value from first command
      return (results?.[0]?.[1] as number) ?? 0;
    } catch (error) {
      this.logger.error(
        `IncrementAnalyticsVal failed for key ${key}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * AddAnalyticsStringType sets a Redis string value
   */
  async addAnalyticsStringType(key: string, value: string): Promise<void> {
    try {
      await this.redis.set(key, value, 'EX', 24 * 60 * 60); // 24 hours
    } catch (error) {
      this.logger.error(
        `AddAnalyticsStringType failed for key ${key}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * AddAnalyticsUser records a user in the room's analytics user list
   */
  async addAnalyticsUser(
    roomId: string,
    userId: string,
    userInfoJson: string,
  ): Promise<void> {
    const key = `${this.getAnalyticsRoomKeyPrefix(roomId)}:users`;
    try {
      const pipeline = this.redis.pipeline();
      pipeline.hset(key, userId, userInfoJson);
      pipeline.expire(key, 24 * 60 * 60); // 24 hours
      await pipeline.exec();
    } catch (error) {
      this.logger.error(
        `AddAnalyticsUser failed for room ${roomId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * AnalyticsScanKeys finds all analytics keys for a room
   */
  async analyticsScanKeys(pattern: string): Promise<string[]> {
    let keys: string[] = [];
    let cursor = '0';
    try {
      do {
        const [newCursor, scannedKeys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = newCursor;
        keys = keys.concat(scannedKeys);
      } while (cursor !== '0');
      return keys;
    } catch (error) {
      this.logger.error(
        `AnalyticsScanKeys failed for pattern ${pattern}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * AnalyticsGetAllUsers retrieves all users from a room's analytics user list
   */
  async analyticsGetAllUsers(roomId: string): Promise<Record<string, string>> {
    const key = `${this.getAnalyticsRoomKeyPrefix(roomId)}:users`;
    try {
      return await this.redis.hgetall(key);
    } catch (error) {
      this.logger.error(
        `AnalyticsGetAllUsers failed for room ${roomId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * AnalyticsDeleteKeys deletes multiple keys from Redis
   */
  async analyticsDeleteKeys(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.redis.del(...keys);
    } catch (error) {
      this.logger.error(`AnalyticsDeleteKeys failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * GetAnalyticsAllHashTypeVals retrieves all values from a Redis Hash
   */
  async getAnalyticsAllHashTypeVals(
    key: string,
  ): Promise<Record<string, string>> {
    try {
      return await this.redis.hgetall(key);
    } catch (error) {
      this.logger.error(
        `GetAnalyticsAllHashTypeVals failed for key ${key}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * GetAnalyticsStringTypeVal retrieves a Redis string value
   */
  async getAnalyticsStringTypeVal(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      this.logger.error(
        `GetAnalyticsStringTypeVal failed for key ${key}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * AnalyticsGetKeyType retrieves the type of a Redis key
   */
  async analyticsGetKeyType(key: string): Promise<string> {
    try {
      return await this.redis.type(key);
    } catch (error) {
      this.logger.error(
        `AnalyticsGetKeyType failed for key ${key}: ${error.message}`,
      );
      throw error;
    }
  }
}
