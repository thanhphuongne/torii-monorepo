/**
 * Redis Breakout Service
 *
 * Handles breakout room data in Redis.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@server/shared';

const REDIS_PREFIX = 'wajlc:';
const BREAKOUT_ROOM_HASH_KEY = `${REDIS_PREFIX}breakoutRoom:%s`;
const DEFAULT_TTL = 60 * 60 * 24; // 24 hours in seconds

@Injectable()
export class RedisBreakoutService {
  private readonly logger = new Logger(RedisBreakoutService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Format breakout room hash key
   */
  private formatBreakoutRoomHashKey(parentRoomId: string): string {
    return BREAKOUT_ROOM_HASH_KEY.replace('%s', parentRoomId);
  }

  /**
   * InsertOrUpdateBreakoutRoom adds or updates a breakout room in the parent room's hash.
   */
  async insertOrUpdateBreakoutRoom(
    parentRoomId: string,
    bkRoomId: string,
    val: Buffer | string,
  ): Promise<void> {
    const key = this.formatBreakoutRoomHashKey(parentRoomId);
    try {
      const pipeline = this.redis.pipeline();
      pipeline.hset(key, bkRoomId, val);
      pipeline.expire(key, DEFAULT_TTL);
      await pipeline.exec();
    } catch (error) {
      this.logger.error(
        `InsertOrUpdateBreakoutRoom failed for parentRoomId ${parentRoomId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * DeleteBreakoutRoom removes a specific breakout room from the parent room's hash.
   */
  async deleteBreakoutRoom(
    parentRoomId: string,
    bkRoomId: string,
  ): Promise<void> {
    const key = this.formatBreakoutRoomHashKey(parentRoomId);
    try {
      await this.redis.hdel(key, bkRoomId);
    } catch (error) {
      this.logger.error(
        `DeleteBreakoutRoom failed for parentRoomId ${parentRoomId}, bkRoomId ${bkRoomId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * GetBreakoutRoom retrieves the data for a specific breakout room.
   */
  async getBreakoutRoom(
    parentRoomId: string,
    bkRoomId: string,
  ): Promise<string | null> {
    const key = this.formatBreakoutRoomHashKey(parentRoomId);
    try {
      const val = await this.redis.hget(key, bkRoomId);
      return val || null;
    } catch (error) {
      this.logger.error(
        `GetBreakoutRoom failed for parentRoomId ${parentRoomId}, bkRoomId ${bkRoomId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * CountBreakoutRooms returns the number of breakout rooms.
   */
  async countBreakoutRooms(parentRoomId: string): Promise<number> {
    const key = this.formatBreakoutRoomHashKey(parentRoomId);
    try {
      return await this.redis.hlen(key);
    } catch (error) {
      this.logger.error(
        `CountBreakoutRooms failed for parentRoomId ${parentRoomId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * GetAllBreakoutRoomsByParentRoomId retrieves all breakout rooms from the parent room's hash.
   */
  async getAllBreakoutRoomsByParentRoomId(
    parentRoomId: string,
  ): Promise<Record<string, string>> {
    const key = this.formatBreakoutRoomHashKey(parentRoomId);
    try {
      return await this.redis.hgetall(key);
    } catch (error) {
      this.logger.error(
        `GetAllBreakoutRoomsByParentRoomId failed for parentRoomId ${parentRoomId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * DeleteAllBreakoutRoomsByParentRoomId deletes the entire hash for the parent room.
   */
  async deleteAllBreakoutRoomsByParentRoomId(
    parentRoomId: string,
  ): Promise<void> {
    const key = this.formatBreakoutRoomHashKey(parentRoomId);
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(
        `DeleteAllBreakoutRoomsByParentRoomId failed for parentRoomId ${parentRoomId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * GetBreakoutRoomIdsByParentRoomId retrieves only the IDs of all breakout rooms.
   */
  async getBreakoutRoomIdsByParentRoomId(
    parentRoomId: string,
  ): Promise<string[]> {
    const key = this.formatBreakoutRoomHashKey(parentRoomId);
    try {
      return await this.redis.hkeys(key);
    } catch (error) {
      this.logger.error(
        `GetBreakoutRoomIdsByParentRoomId failed for parentRoomId ${parentRoomId}: ${error.message}`,
      );
      throw error;
    }
  }
}
