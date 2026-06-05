/**
 * Room Duration Service
 *
 * Handles room duration management and tracking
 */

import { Injectable, Logger } from '@nestjs/common';
import type { RoomMetadata } from '@workspace/protocol';
import { NatsRoomService } from '@server/meet/infrastructure/nats/nats-room.service';
import { NatsRoomEventsService } from '@server/meet/infrastructure/nats/nats-room-events.service';
import { RedisRoomService } from '@server/meet/infrastructure/redis/redis-room.service';

/**
 * Room duration information structure
 */
export interface RoomDurationInfo {
  duration: number; // Duration in minutes
  startedAt: number; // Unix timestamp
}

/**
 * RoomDurationService handles room duration operations
 */
@Injectable()
export class RoomDurationService {
  private readonly logger = new Logger(RoomDurationService.name);

  constructor(
    private readonly natsRoomService: NatsRoomService,
    private readonly natsRoomEvents: NatsRoomEventsService,
    private readonly redisRoom: RedisRoomService,
  ) {}

  /**
   * AddRoomWithDurationInfo adds room with duration info to tracking
   *
   * @param roomId - Room ID
   * @param info - Duration information
   */
  async addRoomWithDurationInfo(
    roomId: string,
    r: RoomDurationInfo,
  ): Promise<void> {
    this.logger.log(`Adding room with duration info: ${roomId}`);

    // Use Redis service to store duration info
    await this.redisRoom.addRoomWithDurationInfo(roomId, r);

    this.logger.log(`Successfully added room with duration info: ${roomId}`);
  }

  /**
     * DeleteRoomWithDuration removes room from duration tracking

     * 
     * @param roomId - Room ID to remove
     */
  async deleteRoomWithDuration(roomId: string): Promise<void> {
    this.logger.log(`Deleting room with duration: ${roomId}`);

    // Use Redis service to delete duration info
    await this.redisRoom.deleteRoomWithDuration(roomId);

    this.logger.log(`Successfully deleted room with duration: ${roomId}`);
  }

  /**
   * GetRoomsWithDurationMap retrieves all rooms with duration info
   * @returns Map of roomId to RoomDurationInfo
   */
  async getRoomsWithDurationMap(): Promise<Record<string, RoomDurationInfo>> {
    const keys = await this.redisRoom.getRoomsWithDurationKeys();
    const out: Record<string, RoomDurationInfo> = {};

    // This prefix matches REDIS_PREFIX + 'roomWithDurationInfo:' in redis-room.service.ts
    // wajlc:roomWithDurationInfo:
    const keyPrefix = 'wajlc:roomWithDurationInfo:';

    for (const key of keys) {
      try {
        const val = await this.redisRoom.getRoomWithDurationInfoByKey(key);
        if (!val) {
          continue;
        }

        // Extract roomId from key
        const roomId = key.replace(keyPrefix, '');
        out[roomId] = val;
      } catch {
        continue;
      }
    }

    return out;
  }

  /**
   * GetRoomDurationInfo retrieves duration info for a room
   * Used by IncreaseRoomDuration and CompareDurationWithParentRoom
   *
   * @param roomId - Room ID
   * @returns RoomDurationInfo or null if not found
   */
  async getRoomDurationInfo(roomId: string): Promise<RoomDurationInfo | null> {
    this.logger.debug(`Getting room duration info: ${roomId}`);

    // Use Redis service to retrieve duration info
    return await this.redisRoom.getRoomWithDurationInfo(roomId);
  }

  /**
   * IncreaseRoomDuration
   * (IncreaseRoomDuration): order info → meta → breakout checks → HIncrBy → metadata → rollback.
   */
  async increaseRoomDuration(
    roomId: string,
    duration: number,
  ): Promise<number> {
    this.logger.log(
      `Request to increase room duration: ${roomId}, duration: ${duration}`,
    );

    // 1. Redis duration info
    const rawInfo = await this.getRoomDurationInfo(roomId);
    const info = rawInfo ?? { duration: 0, startedAt: 0 };

    // 2. Metadata
    const meta = await this.natsRoomService.getRoomMetadataStruct(roomId);
    if (!meta) {
      throw new Error('invalid nil room metadata information');
    }

    // 3. Breakout room
    if (meta.isBreakoutRoom) {
      if (info.startedAt === 0) {
        const err = new Error(
          "can't increase duration as breakout room is not running",
        );
        this.logger.warn(err.message);
        throw err;
      }
      if (info.duration === 0) {
        const err = new Error(
          "can't increase duration as breakout room has unlimited duration",
        );
        this.logger.warn(err.message);
        throw err;
      }
      this.logger.log('breakout room has duration, will compare with parent room');
      const now = Math.floor(Date.now() / 1000);
      const valid = info.startedAt + info.duration * 60;
      const d = Math.floor((valid - now) / 60) + duration;
      await this.compareDurationWithParentRoom(meta.parentRoomId, d);
    }

    // 4. Redis HIncrBy
    const newTotalDuration = await this.redisRoom.updateRoomDuration(
      roomId,
      'duration',
      duration,
    );

    if (!meta.roomFeatures) {
      meta.roomFeatures = {} as any;
    }
    meta.roomFeatures!.roomDuration = String(newTotalDuration);

    try {
      await this.natsRoomEvents.updateAndBroadcastRoomMetadata(roomId, meta);
    } catch (error) {
      this.logger.error(
        `Failed to update and broadcast room metadata, rolling back Redis change: ${error.message}`,
      );
      await this.redisRoom.setRoomDuration(
        roomId,
        'duration',
        newTotalDuration - duration,
      );
      throw error;
    }

    this.logger.log(
      `Successfully increased room duration to ${newTotalDuration} minutes`,
    );
    return newTotalDuration;
  }

  /**
     * CompareDurationWithParentRoom validates breakout room duration against parent

     * 
     * Ensures breakout room duration doesn't exceed parent room's remaining time
     * 
     * @param mainRoomId - Parent room ID
     * @param duration - Proposed duration for breakout room (minutes)
     */
  async compareDurationWithParentRoom(
    mainRoomId: string,
    duration: number,
  ): Promise<void> {
    this.logger.log(
      `Comparing breakout room duration with parent room: ${mainRoomId}, duration: ${duration}`,
    );

    // Get parent room duration info
    const info = await this.getRoomDurationInfo(mainRoomId);

    if (!info) {
      // No info found - parent has no duration limit
      this.logger.log('Parent room has no duration limit, comparison skipped');
      return;
    }

    if (info.duration === 0) {
      // Parent room has unlimited duration
      this.logger.log('Parent room has no duration limit, comparison skipped');
      return;
    }

    // Calculate parent room's remaining time
    const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    const valid = info.startedAt + info.duration * 60;
    const minutesLeft = Math.floor((valid - now) / 60);

    this.logger.log(
      `Parent room duration check - minutes left: ${minutesLeft}`,
    );

    // if left < duration → print("breakout room's duration (%d) can't be more than parent room's remaining duration (%d)", duration, left)
    if (minutesLeft < duration) {
      const msg = `breakout room's duration (${duration}) can't be more than parent room's remaining duration (${minutesLeft})`;
      this.logger.warn(msg);
      throw new Error(msg);
    }

    this.logger.log('Breakout room duration validation passed');
  }
}
