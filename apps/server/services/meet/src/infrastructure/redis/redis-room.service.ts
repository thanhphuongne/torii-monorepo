/**
 * Redis Room Service
 *
 * Handles temporary room data caching in Redis
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@server/shared';
import type { NatsKvRoomInfo } from '@workspace/protocol';

const REDIS_PREFIX = 'wajlc:'; // Customized prefix
const TEMPORARY_ROOM_DATA_KEY = `${REDIS_PREFIX}temporaryRoomData:%s`;
const ROOM_WITH_DURATION_INFO_KEY = `${REDIS_PREFIX}roomWithDurationInfo`;
const DEFAULT_TTL = 60 * 60 * 24; // 24 hours in seconds

/**
 * RedisRoomService handles room-related Redis operations
 */
@Injectable()
export class RedisRoomService {
  private readonly logger = new Logger(RedisRoomService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * HoldTemporaryRoomData stores room data temporarily for 1 minute
   *
   * @param info - NatsKvRoomInfo to cache
   */
  async holdTemporaryRoomData(info: NatsKvRoomInfo): Promise<void> {
    this.logger.log(
      `Holding temporary room data: ${info.roomId}, sid: ${info.roomSid}`,
    );

    try {
      const jsonData = JSON.stringify(info);
      const key = TEMPORARY_ROOM_DATA_KEY.replace('%s', info.roomId);

      // Store with 1 minute TTL using SET if not exists (SETNX behavior)
      const result = await this.redis.set(key, jsonData, 'EX', 60, 'NX');

      if (!result) {
        this.logger.debug(
          `Temporary room data already exists for: ${info.roomId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `holdTemporaryRoomData failed for room ${info.roomId}: ${error.message}`,
      );
    }
  }

  /**
   * GetTemporaryRoomData retrieves cached room data
   *
   * @param roomId - Room ID to retrieve
   * @returns NatsKvRoomInfo or null if not found
   */
  async getTemporaryRoomData(roomId: string): Promise<NatsKvRoomInfo | null> {
    try {
      const key = TEMPORARY_ROOM_DATA_KEY.replace('%s', roomId);
      const val = await this.redis.get(key);

      if (!val) return null;

      const info = JSON.parse(val) as NatsKvRoomInfo;
      // Set status to 'ended' to prevent looping
      info.status = 'ended';

      return info;
    } catch (error) {
      this.logger.error(
        `getTemporaryRoomData failed for room ${roomId}: ${error.message}`,
      );
      return null;
    }
  }

  // ============================================================================
  // Room Duration Methods
  // ============================================================================

  /**
   * AddRoomWithDurationInfo adds room with duration info to Redis
   * @param roomId - Room ID
   * @param info - RoomDurationInfo object
   */
  async addRoomWithDurationInfo(
    roomId: string,
    info: { duration: number; startedAt: number },
  ): Promise<void> {
    const key = `${ROOM_WITH_DURATION_INFO_KEY}:${roomId}`;
    try {
      const pipeline = this.redis.pipeline();
      pipeline.hset(key, info);
      pipeline.expire(key, DEFAULT_TTL);
      await pipeline.exec();
    } catch (error) {
      this.logger.error(
        `addRoomWithDurationInfo failed for ${roomId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * SetRoomDuration sets a specific duration field
   */
  async setRoomDuration(
    roomId: string,
    durationField: string,
    value: number,
  ): Promise<void> {
    const key = `${ROOM_WITH_DURATION_INFO_KEY}:${roomId}`;
    try {
      const pipeline = this.redis.pipeline();
      pipeline.hset(key, durationField, value);
      pipeline.expire(key, DEFAULT_TTL);
      await pipeline.exec();
    } catch (error) {
      this.logger.error(
        `setRoomDuration failed for ${roomId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * UpdateRoomDuration increments the duration field
   */
  async updateRoomDuration(
    roomId: string,
    durationField: string,
    amount: number,
  ): Promise<number> {
    const key = `${ROOM_WITH_DURATION_INFO_KEY}:${roomId}`;
    try {
      return await this.redis.hincrby(key, durationField, amount);
    } catch (error) {
      this.logger.error(
        `updateRoomDuration failed for ${roomId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * GetRoomWithDurationInfo retrieves room duration info
   */
  async getRoomWithDurationInfo(
    roomId: string,
  ): Promise<{ duration: number; startedAt: number } | null> {
    const key = `${ROOM_WITH_DURATION_INFO_KEY}:${roomId}`;
    try {
      const result = await this.redis.hgetall(key);
      if (!result || Object.keys(result).length === 0) return null;

      return {
        duration: parseInt(result.duration || '0', 10),
        startedAt: parseInt(result.startedAt || '0', 10),
      };
    } catch (error) {
      this.logger.error(
        `getRoomWithDurationInfo failed for ${roomId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * DeleteRoomWithDuration removes room duration info
   */
  async deleteRoomWithDuration(roomId: string): Promise<void> {
    const key = `${ROOM_WITH_DURATION_INFO_KEY}:${roomId}`;
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(
        `deleteRoomWithDuration failed for ${roomId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * GetRoomsWithDurationKeys retrieves all room duration keys
   */
  async getRoomsWithDurationKeys(): Promise<string[]> {
    try {
      return await this.redis.keys(`${ROOM_WITH_DURATION_INFO_KEY}:*`);
    } catch (error) {
      this.logger.error(`getRoomsWithDurationKeys failed: ${error.message}`);
      return [];
    }
  }

  /**
   * GetRoomWithDurationInfoByKey retrieves room duration info by full key
   */
  async getRoomWithDurationInfoByKey(
    key: string,
  ): Promise<{ duration: number; startedAt: number } | null> {
    try {
      const result = await this.redis.hgetall(key);
      if (!result || Object.keys(result).length === 0) return null;

      return {
        duration: parseInt(result.duration || '0', 10),
        startedAt: parseInt(result.startedAt || '0', 10),
      };
    } catch (error) {
      this.logger.error(
        `getRoomWithDurationInfoByKey failed: ${error.message}`,
      );
      return null;
    }
  }
}
