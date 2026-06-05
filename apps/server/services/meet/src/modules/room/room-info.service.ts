/**
 * Room Info Service
 *
 * Handles room information and status queries
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@server/shared';
import type {
  IsRoomActiveReq,
  IsRoomActiveRes,
  GetActiveRoomInfoReq,
  ActiveRoomWithParticipant,
  FetchPastRoomsReq,
  FetchPastRoomsResult,
  PastRoomInfo,
  NatsKvRoomInfo,
  RoomMetadata,
} from '@workspace/protocol';
import {
  IsRoomActiveResSchema,
  ActiveRoomWithParticipantSchema,
  ActiveRoomInfoSchema,
  FetchPastRoomsResultSchema,
  PastRoomInfoSchema,
} from '@workspace/protocol';
import { create } from '@bufbuild/protobuf';
import { NatsService } from '@server/meet/infrastructure/nats/nats.service';
import {
  NatsRoomService,
  ROOM_STATUS_ACTIVE,
  ROOM_STATUS_CREATED,
} from '@server/meet/infrastructure/nats/nats-room.service';
import {
  NatsUserInfoService,
  USER_METADATA_KEY,
} from '@server/meet/infrastructure/nats/nats-user-info.service';
import { RedisLockService } from '@server/meet/infrastructure/redis/redis-lock.service';
import { LiveKitService } from '@server/meet/infrastructure/livekit/livekit.service';
import { waitUntilRoomCreationCompletes } from '@server/meet/modules/room/room-lock.helper';

/**
 * RoomInfoService handles room information and status queries
 */
@Injectable()
export class RoomInfoService {
  private readonly logger = new Logger(RoomInfoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly natsService: NatsService,
    private readonly natsRoomService: NatsRoomService,
    private readonly natsUserInfoService: NatsUserInfoService,
    private readonly redisLock: RedisLockService,
    private readonly livekitService: LiveKitService,
  ) {}

  /**
   * IsRoomActive checks if a room is currently active
   *
   * @returns IsRoomActiveRes, roomDbInfo, rInfo, metadata
   */
  async isRoomActive(req: IsRoomActiveReq): Promise<{
    res: IsRoomActiveRes;
    roomDbInfo: any | null;
    rInfo: NatsKvRoomInfo | null;
    metadata: RoomMetadata | null;
    meta?: RoomMetadata | null;
  }> {
    const res = create(IsRoomActiveResSchema, {
      status: true,
      msg: 'Phòng không hoạt động',
      isActive: false,
    });

    // NATS is the single source of truth for this check.
    const { info: rInfo, metadata } =
      await this.natsRoomService.getRoomInfoWithMetadata(req.roomId);

    if (!rInfo || !metadata) {
      // Room isn't active in NATS.
      return { res, roomDbInfo: null, rInfo: null, metadata: null };
    }

    if (
      rInfo.status === ROOM_STATUS_CREATED ||
      rInfo.status === ROOM_STATUS_ACTIVE
    ) {
      res.isActive = true;
      res.msg = 'Phòng đang hoạt động';
    }
    // If status is "ended" or anything else, it will correctly return IsActive: false and "room is not active".

    // Return full context
    // roomDbInfo is null
    return { res, roomDbInfo: null, rInfo, metadata, meta: metadata };
  }

  /**
   * GetActiveRoomInfo gets detailed info about an active room
   *
   * @returns [success, message, roomWithParticipants]
   */
  async getActiveRoomInfo(req: GetActiveRoomInfoReq): Promise<{
    status: boolean;
    msg: string;
    room: ActiveRoomWithParticipant | null;
  }> {
    const log = this.logger;
    log.log(`GetActiveRoomInfo: ${req.roomId}`);

    // Wait until room creation completes
    await waitUntilRoomCreationCompletes(this.redisLock, req.roomId, log);

    // Get room from database
    const roomDbInfo = await this.getRoomInfoByRoomId(req.roomId, true);
    if (!roomDbInfo || !roomDbInfo.id) {
      return { status: false, msg: 'Không tìm thấy phòng', room: null };
    }

    // Get room info from NATS
    const rrr = await this.natsRoomService.getRoomInfo(req.roomId);
    if (
      !rrr ||
      (rrr.status !== ROOM_STATUS_CREATED && rrr.status !== ROOM_STATUS_ACTIVE)
    ) {
      // Room is not in NATS or not active, mark as ended in DB
      log.warn(
        `Room found in DB but not active in NATS (status: ${rrr?.status}), marking as ended`,
      );
      await this.updateRoomStatus(req.roomId, false);
      return { status: false, msg: 'Phòng không hoạt động', room: null };
    }

    // Build response
    const res = create(ActiveRoomWithParticipantSchema, {
      roomInfo: create(ActiveRoomInfoSchema, {
        roomTitle: roomDbInfo.roomTitle,
        roomId: roomDbInfo.roomId,
        sid: roomDbInfo.sid,
        joinedParticipants: roomDbInfo.joinedParticipants,
        isRunning: roomDbInfo.isRunning,
        isRecording: roomDbInfo.isRecording,
        isActiveRtmp: roomDbInfo.isActiveRtmp,
        webhookUrl: roomDbInfo.webhookUrl,
        isBreakoutRoom: roomDbInfo.isBreakoutRoom,
        parentRoomId: roomDbInfo.parentRoomId,
        creationTime: roomDbInfo.creationTime.toString(),
        metadata: rrr.metadata,
      }),
      participantsInfo: [],
    });

    // Load participants from LiveKit
    try {
      const participants = await this.livekitService.loadParticipants(
        roomDbInfo.roomId,
      );
      if (participants && participants.length > 0) {
        for (const participant of participants) {
          // Get user metadata from NATS
          const entry = await this.natsUserInfoService.getUserKeyValue(
            roomDbInfo.roomId,
            participant.identity,
            USER_METADATA_KEY,
          );
          if (entry && entry.value) {
            participant.metadata = new TextDecoder().decode(entry.value);
          }
          res.participantsInfo.push(participant);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to load participants: ${error.message}`);
    }

    return { status: true, msg: 'success', room: res };
  }

  /**
   * GetActiveRoomsInfo gets all active rooms with participants
   *
   * @returns [success, message, rooms]
   */
  async getActiveRoomsInfo(): Promise<{
    status: boolean;
    msg: string;
    rooms: ActiveRoomWithParticipant[] | null;
  }> {
    // Get all active rooms from database
    const roomsInfo = await this.getActiveRoomsFromDb();
    if (!roomsInfo || roomsInfo.length === 0) {
      return { status: false, msg: 'Không có phòng đang hoạt động', rooms: null };
    }

    const res: ActiveRoomWithParticipant[] = [];

    for (const r of roomsInfo) {
      const i = create(ActiveRoomWithParticipantSchema, {
        roomInfo: create(ActiveRoomInfoSchema, {
          roomTitle: r.roomTitle,
          roomId: r.roomId,
          sid: r.sid,
          joinedParticipants: r.joinedParticipants,
          isRunning: r.isRunning,
          isRecording: r.isRecording,
          isActiveRtmp: r.isActiveRtmp,
          webhookUrl: r.webhookUrl,
          isBreakoutRoom: r.isBreakoutRoom,
          parentRoomId: r.parentRoomId,
          creationTime: r.creationTime.toString(),
        }),
        participantsInfo: [],
      });

      // Get room metadata from NATS
      const rri = await this.natsRoomService.getRoomInfo(r.roomId);
      if (!rri) {
        continue;
      }
      i.roomInfo!.metadata = rri.metadata;

      // Load participants from LiveKit
      try {
        const participants = await this.livekitService.loadParticipants(
          r.roomId,
        );
        if (participants && participants.length > 0) {
          for (const participant of participants) {
            // Get user metadata from NATS
            const entry = await this.natsUserInfoService.getUserKeyValue(
              r.roomId,
              participant.identity,
              USER_METADATA_KEY,
            );
            if (entry && entry.value) {
              participant.metadata = new TextDecoder().decode(entry.value);
            }
            i.participantsInfo.push(participant);
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to load participants for room ${r.roomId}: ${error.message}`,
        );
      }

      res.push(i);
    }

    return { status: true, msg: 'success', rooms: res };
  }

  /**
   * FetchPastRooms fetches historical room records with pagination
   */
  async fetchPastRooms(req: FetchPastRoomsReq): Promise<FetchPastRoomsResult> {
    // Validate and set defaults
    let limit = req.limit || 20;
    if (limit > 100) {
      limit = 100;
    }

    const orderBy = req.orderBy || 'DESC';
    const from = req.from || 0;

    // Fetch from database
    const { rooms, total } = await this.getPastRoomsFromDb(
      req.roomIds || [],
      from,
      limit,
      orderBy,
    );

    const list: PastRoomInfo[] = [];

    for (const rr of rooms) {
      const room = create(PastRoomInfoSchema, {
        roomTitle: rr.roomTitle,
        roomId: rr.roomId,
        roomSid: rr.sid,
        joinedParticipants: rr.joinedParticipants,
        webhookUrl: rr.webhookUrl,
        created: rr.created.toISOString(),
        ended: rr.ended.toISOString(),
      });

      // Get analytics file ID if available
      try {
        const analytics = await this.getAnalyticByRoomTableId(rr.id);
        if (analytics) {
          room.analyticsFileId = analytics.artifactId;
        }
      } catch (error) {
        // Silently ignore analytics fetch errors
      }

      list.push(room);
    }

    return create(FetchPastRoomsResultSchema, {
      totalRooms: total.toString(), // uint64 as string
      from: from,
      limit: limit,
      orderBy: orderBy,
      roomsList: list,
    });
  }

  // ============================================================================
  // Private Helper Methods (Database operations)
  // ============================================================================

  /**
   * Get room info by roomId from database
   *
   * Made public for use by RoomEndService
   */
  async getRoomInfoByRoomId(
    roomId: string,
    isRunning: boolean,
  ): Promise<any | null> {
    try {
      return await this.prisma.roomInfo.findFirst({
        where: {
          roomId: roomId,
          isRunning: isRunning ? 1 : 0, // int type: 0 or 1
        },
        orderBy: {
          id: 'desc',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to get room info: ${error.message}`);
      return null;
    }
  }

  /**
   * Get room info by sid (LiveKit session ID) from database
   *
   * Made public for use by controllers
   */
  async getRoomInfoBySid(sid: string, isRunning?: number): Promise<any | null> {
    try {
      const where: any = { sid: sid };

      // Only filter by isRunning if provided
      if (isRunning !== undefined && isRunning !== null) {
        where.isRunning = isRunning;
      }

      return await this.prisma.roomInfo.findFirst({
        where,
        orderBy: {
          id: 'desc',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to get room info by sid: ${error.message}`);
      return null;
    }
  }

  /**
   * Get room info by table ID from database
   *
   * Used by analytics and recorder features
   */
  async getRoomInfoByTableId(tableId: bigint): Promise<any | null> {
    try {
      return await this.prisma.roomInfo.findFirst({
        where: {
          id: Number(tableId),
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get room info by table ID: ${error.message}`,
      );
      return null;
    }
  }

  /**
     * Update room status in database

     * 
     * Made public for use by RoomEndService
     */
  async updateRoomStatus(roomId: string, isRunning: boolean): Promise<void> {
    try {
      const updates: any = {
        isRunning: isRunning ? 1 : 0, // int type: 0 or 1
      };

      // If ending room, also update related fields
      if (!isRunning) {
        updates.isRecording = 0;
        updates.isActiveRtmp = 0;
        updates.ended = new Date();
      }

      await this.prisma.roomInfo.updateMany({
        where: { roomId },
        data: updates,
      });
    } catch (error) {
      this.logger.error(`Failed to update room status: ${error.message}`);
    }
  }

  // Note: getRoomInfoWithMetadata is now handled by NatsRoomService directly
  // No need for private helper method - using natsRoomService.getRoomInfoWithMetadata()

  /**
     * Get all active rooms from database

     */
  private async getActiveRoomsFromDb(): Promise<any[]> {
    try {
      return await this.prisma.roomInfo.findMany({
        where: { isRunning: 1 }, // int type: 1 means active
      });
    } catch (error) {
      this.logger.error(`Failed to get active rooms: ${error.message}`);
      return [];
    }
  }

  /**
     * Get past rooms from database with pagination

     */
  private async getPastRoomsFromDb(
    roomIds: string[],
    from: number,
    limit: number,
    orderBy: string,
  ): Promise<{ rooms: any[]; total: number }> {
    try {
      const where: any = { isRunning: 0 }; // int type: 0 means ended
      if (roomIds.length > 0) {
        where.roomId = { in: roomIds };
      }

      const [rooms, total] = await Promise.all([
        this.prisma.roomInfo.findMany({
          where,
          skip: from,
          take: limit,
          orderBy: { created: orderBy === 'ASC' ? 'asc' : 'desc' },
        }),
        this.prisma.roomInfo.count({ where }),
      ]);

      return { rooms, total };
    } catch (error) {
      this.logger.error(`Failed to get past rooms: ${error.message}`);
      return { rooms: [], total: 0 };
    }
  }

  /**
   * Get analytics by room table ID
   */
  private async getAnalyticByRoomTableId(
    roomTableId: number,
  ): Promise<{ artifactId: string } | null> {
    try {
      // Use RoomArtifact model
      const analytics = await this.prisma.roomArtifact.findFirst({
        where: {
          roomTableId: roomTableId,
          type: 'MEETING_ANALYTICS',
        },
        select: { artifactId: true },
      });
      return analytics;
    } catch (error) {
      this.logger.error(`Failed to get analytics: ${error.message}`);
      return null;
    }
  }

  // ============================================================================
  // Database Modification Methods
  // ============================================================================

  /**
   * insertOrUpdateRoomInfo inserts or updates room info
   *
   * Will insert if sid doesn't exist, otherwise update if ID is provided
   * Returns the full room object with ID
   *
   * @param info - Room info to save
   * @returns Full room object with auto-increment ID
   */
  async insertOrUpdateRoomInfo(info: {
    id?: bigint;
    roomTitle: string;
    roomId: string;
    sid: string;
    joinedParticipants?: number;
    isRunning?: number;
    isRecording?: number;
    isActiveRtmp?: number;
    webhookUrl?: string;
    isBreakoutRoom?: boolean;
    parentRoomId?: string;
    creationTime?: bigint;
    created?: Date;
    modified?: Date;
    ended?: Date;
    recorderId?: string;
    rtmpNodeId?: string;
  }): Promise<any> {
    try {
      // Prisma's upsert based on sid (unique field)
      const result = await this.prisma.roomInfo.upsert({
        where: { sid: info.sid },
        update: {
          roomTitle: info.roomTitle,
          roomId: info.roomId,
          joinedParticipants: info.joinedParticipants ?? 0,
          isRunning: info.isRunning ?? 1,
          isRecording: info.isRecording ?? 0,
          isActiveRtmp: info.isActiveRtmp ?? 0,
          webhookUrl: info.webhookUrl,
          isBreakoutRoom: (info.isBreakoutRoom ?? false) ? 1 : 0,
          parentRoomId: info.parentRoomId,
          modified: new Date(),
          recorderId: info.recorderId,
          rtmpNodeId: info.rtmpNodeId,
        },
        create: {
          roomTitle: info.roomTitle,
          roomId: info.roomId,
          sid: info.sid,
          joinedParticipants: info.joinedParticipants ?? 0,
          isRunning: info.isRunning ?? 1,
          isRecording: info.isRecording ?? 0,
          isActiveRtmp: info.isActiveRtmp ?? 0,
          webhookUrl: info.webhookUrl ?? '',
          isBreakoutRoom: (info.isBreakoutRoom ?? false) ? 1 : 0,
          parentRoomId: info.parentRoomId ?? '',
          creationTime: Number(info.creationTime ?? BigInt(0)),
          created: info.created ?? new Date(),
          modified: new Date(),
          recorderId: info.recorderId ?? '',
          rtmpNodeId: info.rtmpNodeId ?? '',
        },
      });

      this.logger.log(`Inserted/Updated room info: ${info.roomId}`);
      // Return full object with ID
      return result;
    } catch (error) {
      this.logger.error(`Failed to insert/update room info: ${error.message}`);
      throw error;
    }
  }

  /**
   * updateRoomRecordingStatus updates the recording status of a room
   *
   * @param roomTableId - Room table ID
   * @param isRecording - Recording status (0 or 1)
   * @param recorderId - Optional recorder ID
   * @returns Number of rows affected
   */
  async updateRoomRecordingStatus(
    roomTableId: bigint,
    isRecording: number,
    recorderId?: string | null,
  ): Promise<number> {
    try {
      const updates: any = {
        isRecording,
      };

      if (
        recorderId !== null &&
        recorderId !== undefined &&
        recorderId !== ''
      ) {
        updates.recorderId = recorderId;
      }

      const result = await this.prisma.roomInfo.updateMany({
        where: { id: Number(roomTableId) },
        data: updates,
      });

      this.logger.log(
        `Updated recording status for room ID ${roomTableId}: ${result.count} rows`,
      );
      return result.count;
    } catch (error) {
      this.logger.error(`Failed to update recording status: ${error.message}`);
      return 0;
    }
  }

  /**
   * updateRoomRTMPStatus updates the RTMP status of a room
   *
   * @param roomTableId - Room table ID
   * @param isActiveRtmp - RTMP active status (0 or 1)
   * @param rtmpNodeId - Optional RTMP node ID
   * @returns Number of rows affected
   */
  async updateRoomRTMPStatus(
    roomTableId: bigint,
    isActiveRtmp: number,
    rtmpNodeId?: string | null,
  ): Promise<number> {
    try {
      const updates: any = {
        isActiveRtmp,
      };

      if (
        rtmpNodeId !== null &&
        rtmpNodeId !== undefined &&
        rtmpNodeId !== ''
      ) {
        updates.rtmpNodeId = rtmpNodeId;
      }

      const result = await this.prisma.roomInfo.updateMany({
        where: { id: Number(roomTableId) },
        data: updates,
      });

      this.logger.log(
        `Updated RTMP status for room ID ${roomTableId}: ${result.count} rows`,
      );
      return result.count;
    } catch (error) {
      this.logger.error(`Failed to update RTMP status: ${error.message}`);
      return 0;
    }
  }

  /**
   * UpdateNumParticipants sets the participant count to a specific number
   *
   * @param roomSid - Room SID from LiveKit
   * @param num - New participant count
   * @returns Number of rows affected
   */
  async updateNumParticipants(roomSid: string, num: number): Promise<number> {
    try {
      const result = await this.prisma.roomInfo.updateMany({
        where: { sid: roomSid },
        data: { joinedParticipants: num },
      });

      this.logger.log(
        `Updated participant count for room ${roomSid} to ${num}: ${result.count} rows`,
      );
      return result.count;
    } catch (error) {
      this.logger.error(`Failed to update participant count: ${error.message}`);
      return 0;
    }
  }

  /**
   * incrementOrDecrementNumParticipants increments or decrements participant count
   *
   * Uses raw SQL for atomic operation with GREATEST to prevent negative values
   *
   * @param roomSid - Room SID from LiveKit
   * * @param operator - "+" to increment, "-" to decrement
   * @returns Number of rows affected
   */
  async incrementOrDecrementNumParticipants(
    roomSid: string,
    operator: '+' | '-',
  ): Promise<number> {
    try {
      // Use raw SQL for atomic increment/decrement
      // PostgreSQL syntax (different from MySQL)
      // GREATEST ensures value never goes below 0
      const operation = operator === '+' ? '+ 1' : '- 1';

      // PostgreSQL uses INTEGER instead of MySQL's SIGNED
      // Table name is room_info (from Prisma schema @@map directive)
      const result = await this.prisma.$executeRawUnsafe(
        `
                UPDATE "room_info" 
                SET "joined_participants" = GREATEST(CAST("joined_participants" AS INTEGER) ${operation}, 0)
                WHERE "sid" = $1
            `,
        roomSid,
      );

      this.logger.log(
        `${operator === '+' ? 'Incremented' : 'Decremented'} participant count for room ${roomSid}, rows affected: ${result}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to ${operator === '+' ? 'increment' : 'decrement'} participant count: ${error.message}`,
      );
      throw error;
    }
  }
}
