import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { NatsRoomService } from '@server/meet/infrastructure/nats/nats-room.service';
import { NatsSystemEventsService } from '@server/meet/infrastructure/nats/nats-system-events.service';
import {
  CreateBreakoutRoomsReq,
  BreakoutRoom,
  NatsMsgServerToClientEvents,
  RoomMetadata,
  RoomMetadataSchema,
  BreakoutRoomSchema,
  JoinBreakoutRoomReq,
  EndBreakoutRoomReq,
  RoomEndReqSchema,
  BroadcastBreakoutRoomMsgReq,
  IncreaseBreakoutRoomDurationReq,
  CreateRoomReqSchema,
  RoomCreateFeaturesSchema,
  BreakoutRoomFeaturesSchema,
} from '@workspace/protocol';
import { RoomCreateService } from '@server/meet/modules/room/room-create.service';
import { RoomEndService } from '@server/meet/modules/room/room-end.service';
import { RoomUserService } from '@server/meet/modules/room/room-user.service';
import { create, fromJsonString } from '@bufbuild/protobuf';
import { RoomDurationService } from '@server/meet/modules/room/room-duration.service';
import { NatsService } from '@server/meet/infrastructure/nats/nats.service';
import { NatsRoomEventsService } from '@server/meet/infrastructure/nats/nats-room-events.service';
import {
  NatsUserService,
  USER_STATUS_ONLINE,
} from '@server/meet/infrastructure/nats/nats-user.service';
import { LiveKitService } from '@server/meet/infrastructure/livekit/livekit.service';
import { AnalyticsService } from '@server/meet/modules/analytics/analytics.service';
import {
  AnalyticsDataMsgSchema,
  AnalyticsEventType,
  AnalyticsEvents,
} from '@workspace/protocol';
import { RedisBreakoutService } from '@server/meet/infrastructure/redis/redis-breakout.service';

const BREAKOUT_ROOM_FORMAT = '%s-%s';

@Injectable()
export class BreakoutService {
  private readonly logger = new Logger(BreakoutService.name);
  private readonly waitBeforePostStart = 2000; // 2 seconds

  constructor(
    @Inject(forwardRef(() => NatsRoomService))
    private readonly natsRoomService: NatsRoomService,
    @Inject(forwardRef(() => NatsSystemEventsService))
    private readonly natsSystemEvents: NatsSystemEventsService,
    @Inject(forwardRef(() => RoomCreateService))
    private readonly roomCreateService: RoomCreateService,
    @Inject(forwardRef(() => RoomEndService))
    private readonly roomEndService: RoomEndService,
    @Inject(forwardRef(() => RoomDurationService))
    private readonly roomDurationService: RoomDurationService,
    @Inject(forwardRef(() => NatsService))
    private readonly natsService: NatsService,
    @Inject(forwardRef(() => NatsUserService))
    private readonly natsUserService: NatsUserService,
    @Inject(forwardRef(() => LiveKitService))
    private readonly liveKitService: LiveKitService,
    @Inject(forwardRef(() => AnalyticsService))
    private readonly analyticsService: AnalyticsService,
    @Inject(forwardRef(() => NatsRoomEventsService))
    private readonly natsRoomEventsService: NatsRoomEventsService,
    @Inject(forwardRef(() => RoomUserService))
    private readonly roomUserService: RoomUserService,
    private readonly redisBreakoutService: RedisBreakoutService,
  ) {}

  /**
   * CreateBreakoutRooms creates multiple breakout rooms under a parent room
   */
  async createBreakoutRooms(req: CreateBreakoutRoomsReq): Promise<void> {
    this.logger.log(
      `Creating breakout rooms for parent room: ${req.roomId}, count: ${req.rooms.length}`,
    );

    // 1. Get Parent Room Info & Metadata
    const { info: mainRoom, metadata: meta } =
      await this.natsRoomService.getRoomInfoWithMetadata(req.roomId);

    if (!mainRoom || !meta) {
      throw new Error('Thông tin phòng cha không hợp lệ');
    }

    // 2. Duration Check
    if (
      meta.roomFeatures?.roomDuration &&
      Number(meta.roomFeatures.roomDuration) > 0
    ) {
      await this.roomDurationService.compareDurationWithParentRoom(
        req.roomId,
        Number(req.duration),
      );
    }

    // 3. Prepare Sub-Room Metadata Template
    const bMeta = create(RoomMetadataSchema, meta);
    if (!bMeta.roomFeatures)
      bMeta.roomFeatures = create(RoomCreateFeaturesSchema, {});

    bMeta.roomFeatures.roomDuration = req.duration.toString();
    bMeta.isBreakoutRoom = true;
    bMeta.welcomeMessage = req.welcomeMsg;
    bMeta.parentRoomId = req.roomId;

    // disable few features
    if (!bMeta.roomFeatures.breakoutRoomFeatures) {
      bMeta.roomFeatures.breakoutRoomFeatures = create(
        BreakoutRoomFeaturesSchema,
        {},
      );
    }
    bMeta.roomFeatures.breakoutRoomFeatures.isAllow = false;

    if (bMeta.roomFeatures.waitingRoomFeatures)
      bMeta.roomFeatures.waitingRoomFeatures.isActive = false;

    if (bMeta.roomFeatures.recordingFeatures)
      bMeta.roomFeatures.recordingFeatures.isAllow = false;

    bMeta.roomFeatures.allowRtmp = false;

    if (bMeta.roomFeatures.displayExternalLinkFeatures)
      bMeta.roomFeatures.displayExternalLinkFeatures.isActive = false;
    if (bMeta.roomFeatures.externalMediaPlayerFeatures)
      bMeta.roomFeatures.externalMediaPlayerFeatures.isActive = false;

    const e: Record<string, boolean> = {};

    for (const room of req.rooms) {
      const bRoomId = `${req.roomId}-${room.id}`;

      const bRoomReq = create(CreateRoomReqSchema, {
        roomId: bRoomId,
        metadata: create(RoomMetadataSchema, {
          ...bMeta,
          roomTitle: room.title,
        }),
      });

      try {
        await this.roomCreateService.createRoom(bRoomReq);

        room.duration = req.duration.toString();
        room.created = Math.floor(Date.now() / 1000).toString();

        const roomJson = this.natsService.marshalToProtoJson(
          room,
          BreakoutRoomSchema,
        );
        // [MIGRATED] Use Redis instead of NATS for breakout room storage
        await this.redisBreakoutService.insertOrUpdateBreakoutRoom(
          req.roomId,
          bRoomId,
          Buffer.from(roomJson),
        );

        // send invitation notification
        for (const u of room.users) {
          await this.natsSystemEvents.broadcastSystemEventToRoom(
            NatsMsgServerToClientEvents.JOIN_BREAKOUT_ROOM,
            req.roomId,
            bRoomId, // payload
            u.id,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to create breakout room ${bRoomId}: ${error.message}`,
        );
        e[bRoomId] = true;
        continue;
      }
    }

    if (Object.keys(e).length === req.rooms.length) {
      throw new Error('Không tạo được phòng nhóm nào');
    }

    // Update parent room metadata
    let origMeta: RoomMetadata;
    try {
      origMeta = fromJsonString(RoomMetadataSchema, mainRoom.metadata ?? '', {
        ignoreUnknownFields: true,
      });
    } catch (error) {
      const msg = `failed to unmarshal original parent room metadata: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    if (!origMeta.roomFeatures)
      origMeta.roomFeatures = create(RoomCreateFeaturesSchema, {});
    if (!origMeta.roomFeatures.breakoutRoomFeatures) {
      origMeta.roomFeatures.breakoutRoomFeatures = create(
        BreakoutRoomFeaturesSchema,
        {},
      );
    }
    origMeta.roomFeatures.breakoutRoomFeatures.isActive = true;

    let parentMetadataUpdateError: Error | undefined;
    try {
      await this.natsRoomEventsService.updateAndBroadcastRoomMetadata(
        req.roomId,
        origMeta,
      );
    } catch (error) {
      parentMetadataUpdateError =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to update parent room metadata: ${parentMetadataUpdateError.message}`,
      );
    }

    // Send analytics (always after update attempt, even if update failed)
    const analyticsData = create(AnalyticsDataMsgSchema, {
      eventType: AnalyticsEventType.ROOM,
      eventName: AnalyticsEvents.ANALYTICS_EVENT_ROOM_BREAKOUT_ROOM,
      roomId: req.roomId,
    });
    this.analyticsService.handleEvent(analyticsData);

    this.logger.log('Finished creating breakout rooms');

    if (parentMetadataUpdateError) {
      throw parentMetadataUpdateError;
    }
  }

  /**
   * JoinBreakoutRoom validates and generates token for joining a breakout room
   */
  async joinBreakoutRoom(req: JoinBreakoutRoomReq): Promise<string> {
    this.logger.log(
      `User ${req.userId} requesting to join breakout room ${req.breakoutRoomId}`,
    );

    // 1. Check if user already joined
    const status = await this.natsUserService.getRoomUserStatus(
      req.breakoutRoomId,
      req.userId,
    );
    if (status === USER_STATUS_ONLINE) {
      throw new Error('Người dùng đã tham gia phòng nhóm này');
    }

    // 2. Fetch Breakout Room Info
    const roomStr = await this.redisBreakoutService.getBreakoutRoom(
      req.roomId,
      req.breakoutRoomId,
    );
    if (!roomStr) {
      throw new Error('Không lấy được thông tin phòng nhóm');
    }

    const room = fromJsonString(BreakoutRoomSchema, roomStr);

    // 3. Authorization Check (Unless Admin)
    if (!req.isAdmin) {
      const canJoin = room.users.some((u) => u.id === req.userId);
      if (!canJoin) {
        throw new Error('Bạn không được phép vào phòng nhóm này');
      }
    }

    // 4. Get User Info from Parent Room
    const pInfo = await this.natsUserService.getUserInfo(
      req.roomId,
      req.userId,
    );
    const pMeta = await this.natsUserService.getUserMetadataStruct(
      req.roomId,
      req.userId,
    );
    if (!pInfo || !pMeta) {
      throw new Error('Không lấy được thông tin người dùng từ phòng chính');
    }

    const joinReq = {
      roomId: req.breakoutRoomId,
      userInfo: {
        userId: req.userId,
        name: pInfo.name,
        isAdmin: pMeta.isAdmin,
        userMetadata: pMeta,
      },
    };

    const { token } = await this.roomUserService.getWajlcJoinToken(joinReq);
    return token;
  }

  /**
   * EndBreakoutRoom ends a specific breakout room via RoomEndService
   */
  async endBreakoutRoom(req: EndBreakoutRoomReq): Promise<void> {
    this.logger.log(
      `Ending breakout room ${req.breakoutRoomId} for parent ${req.roomId}`,
    );

    // [MIGRATED] Use Redis
    const rm = await this.redisBreakoutService.getBreakoutRoom(
      req.roomId,
      req.breakoutRoomId,
    );
    if (!rm) {
      throw new Error('Không tìm thấy phòng nhóm');
    }

    // Use core end room logic
    await this.roomEndService.endRoom(
      create(RoomEndReqSchema, { roomId: req.breakoutRoomId }),
    );

    // [MIGRATED] Use Redis instead of NATS KV
    await this.redisBreakoutService.deleteBreakoutRoom(
      req.roomId,
      req.breakoutRoomId,
    );

    // Post-End Cleanup & Notification
    await this.onAfterBkRoomEnded(req.roomId, req.breakoutRoomId);
  }

  /**
   * EndAllBreakoutRooms ends all sub-rooms for a parent room
   */
  async endAllBreakoutRooms(parentRoomId: string): Promise<void> {
    this.logger.log(`Ending all breakout rooms for ${parentRoomId}`);

    // [MIGRATED] Use Redis
    const ids =
      await this.redisBreakoutService.getBreakoutRoomIdsByParentRoomId(
        parentRoomId,
      );
    if (!ids || ids.length === 0) {
      await this.updateParentRoomMetadataOnEnd(parentRoomId);
      return;
    }

    for (const id of ids) {
      await this.roomEndService.endRoom(
        create(RoomEndReqSchema, { roomId: id }),
      );
      // [MIGRATED] Use Redis
      await this.redisBreakoutService.deleteBreakoutRoom(parentRoomId, id);
      await this.onAfterBkRoomEnded(parentRoomId, id);
    }
  }

  /**
   * GetBreakoutRoomsInfo returns list of breakout rooms
   */
  async getBreakoutRoomsInfo(roomId: string): Promise<BreakoutRoom[]> {
    // [MIGRATED] Use Redis
    const roomsData =
      await this.redisBreakoutService.getAllBreakoutRoomsByParentRoomId(roomId);
    const result: BreakoutRoom[] = [];

    for (const [key, val] of Object.entries(roomsData)) {
      try {
        const room = fromJsonString(BreakoutRoomSchema, val);
        room.id = key; // Ensure ID matches map key

        // Check online status of users
        if (room.started) {
          for (const u of room.users) {
            const status = await this.natsUserService.getRoomUserStatus(
              key,
              u.id,
            );
            if (status === USER_STATUS_ONLINE) {
              u.joined = true;
            }
          }
        }
        result.push(room);
      } catch (e) {
        this.logger.warn(`Failed to parse breakout room ${key}: ${e.message}`);
      }
    }

    if (result.length === 0) {
      throw new Error('Không có phòng nhóm nào');
    }

    return result;
  }

  /**
   * GetMyBreakoutRoom gets the breakout room a user belongs to
   */
  async getMyBreakoutRoom(
    roomId: string,
    userId: string,
  ): Promise<BreakoutRoom | undefined> {
    const breakoutRooms = await this.getBreakoutRoomsInfo(roomId).catch(
      () => [],
    );
    if (!breakoutRooms || breakoutRooms.length === 0) {
      throw new Error('Không có phòng nhóm nào');
    }

    for (const rr of breakoutRooms) {
      for (const u of rr.users) {
        if (u.id === userId) {
          return rr;
        }
      }
    }

    throw new Error('Không tìm thấy');
  }

  /**
   * IncreaseBreakoutRoomDuration extends duration
   */
  async increaseBreakoutRoomDuration(
    req: IncreaseBreakoutRoomDurationReq,
  ): Promise<void> {
    const log = this.logger;
    log.log(
      `request to increase breakout room duration for parentRoomId: ${req.roomId}, breakoutRoomId: ${req.breakoutRoomId}, duration: ${req.duration}`,
    );

    // [MIGRATED] Use Redis
    const roomStr = await this.redisBreakoutService.getBreakoutRoom(
      req.roomId,
      req.breakoutRoomId,
    );
    if (!roomStr) {
      log.error('failed to fetch breakout room info');
      throw new Error('Không tìm thấy phòng nhóm');
    }

    const room = fromJsonString(BreakoutRoomSchema, roomStr);

    // Update active duration checker
    log.log('increasing duration in room duration checker');
    let newDuration = 0;
    try {
      newDuration = await this.roomDurationService.increaseRoomDuration(
        req.breakoutRoomId,
        Number(req.duration),
      );
    } catch (e) {
      log.error(`failed to increase room duration: ${e.message}`);
      throw e;
    }

    // Update KV
    log.log('updating breakout room info in redis');
    room.duration = newDuration.toString();
    const jsonStr = this.natsService.marshalToProtoJson(
      room,
      BreakoutRoomSchema,
    );

    try {
      // [MIGRATED] Use Redis
      await this.redisBreakoutService.insertOrUpdateBreakoutRoom(
        req.roomId,
        req.breakoutRoomId,
        jsonStr,
      );
    } catch (e) {
      log.error(`failed to update breakout room in redis: ${e.message}`);
      throw e;
    }

    log.log(`successfully increased breakout room duration to ${newDuration}`);
  }

  /**
   * BroadcastBreakoutRoomMsg sends a system message to all breakout rooms
   */
  async broadcastBreakoutRoomMsg(
    req: BroadcastBreakoutRoomMsgReq,
  ): Promise<void> {
    const log = this.logger;
    log.log(`request to send message to all breakout rooms: ${req.roomId}`);

    const rooms = await this.getBreakoutRoomsInfo(req.roomId);
    if (!rooms || rooms.length === 0) {
      log.log('no active breakout rooms found to send message');
      return;
    }

    for (const r of rooms) {
      try {
        await this.natsSystemEvents.broadcastSystemEventToRoom(
          NatsMsgServerToClientEvents.SYSTEM_CHAT_MSG,
          r.id,
          req.msg,
        );
      } catch (e) {
        log.error(
          `failed to broadcast message to breakout room ${r.id}: ${e.message}`,
        );
      }
    }

    log.log('successfully broadcasted message to all breakout rooms');
  }

  /**
   * PostTaskAfterRoomStartWebhook handles post-start updates (setting created time, etc.)
   */
  async postTaskAfterRoomStartWebhook(
    roomId: string,
    metadata: RoomMetadata,
  ): Promise<boolean> {
    if (!metadata.isBreakoutRoom || !metadata.parentRoomId) return false;

    const parentRoomId = metadata.parentRoomId;

    // always wait a bit before fetching breakout
    // room record from Redis, because LiveKit room can start before Redis
    // insertion completes.
    await new Promise((resolve) => setTimeout(resolve, this.waitBeforePostStart));

    // Retry multiple times to avoid "started flag never updated" when Redis
    // insertion is delayed under load.
    const maxAttempts = 5; // ~2s + (maxAttempts-1)*2s = ~10s total
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // [MIGRATED] Use Redis
      const roomStr = await this.redisBreakoutService.getBreakoutRoom(
        parentRoomId,
        roomId,
      );

      if (roomStr) {
        const room = fromJsonString(BreakoutRoomSchema, roomStr);
        if (room.started) return false; // already started (idempotent)

        const startedAt =
          (metadata as any).startedAt ?? BigInt(Math.floor(Date.now() / 1000));

        this.logger.log(
          `Updating breakout room ${roomId} status to started: true`,
        );
        room.created = startedAt.toString();
        room.started = true;

        const jsonStr = this.natsService.marshalToProtoJson(
          room,
          BreakoutRoomSchema,
        );
        // [MIGRATED] Use Redis
        await this.redisBreakoutService.insertOrUpdateBreakoutRoom(
          parentRoomId,
          roomId,
          jsonStr,
        );

        return true;
      }

      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.waitBeforePostStart),
        );
      }
    }

    this.logger.warn(
      `Breakout room ${roomId} not found in Redis for parent ${parentRoomId}, skipping postPR-start tasks`,
    );
    return false;
  }

  /**
   * PostTaskAfterRoomEndWebhook handles cleanup when a room ends
   */
  async postTaskAfterRoomEndWebhook(
    roomId: string,
    metadata: string,
  ): Promise<void> {
    if (!metadata) return;

    const meta = this.natsService.unmarshalRoomMetadata(metadata);

    if (meta.isBreakoutRoom && meta.parentRoomId) {
      // A single breakout room ended
      // [MIGRATED] Use Redis
      await this.redisBreakoutService.deleteBreakoutRoom(
        meta.parentRoomId,
        roomId,
      );
      await this.onAfterBkRoomEnded(meta.parentRoomId, roomId);
    } else {
      // Parent room ended, kill all sub-rooms
      await this.endAllBreakoutRooms(roomId);
    }
  }

  // ================= PRIVATE METHODS =================

  private async onAfterBkRoomEnded(parentRoomId: string, bkRoomId: string) {
    // [MIGRATED] Use Redis
    const count =
      await this.redisBreakoutService.countBreakoutRooms(parentRoomId);

    if (count === 0) {
      // No rooms left, cleanup parent metadata
      // [MIGRATED] Use Redis
      await this.redisBreakoutService.deleteAllBreakoutRoomsByParentRoomId(
        parentRoomId,
      );
      await this.updateParentRoomMetadataOnEnd(parentRoomId);
    }

    // Notify parent room
    await this.natsSystemEvents.broadcastSystemEventToRoom(
      NatsMsgServerToClientEvents.BREAKOUT_ROOM_ENDED,
      parentRoomId,
      bkRoomId,
    );
  }

  private async updateParentRoomMetadataOnEnd(parentRoomId: string) {
    const meta = await this.natsRoomService.getRoomMetadataStruct(parentRoomId);
    if (!meta) return;

    if (meta.roomFeatures?.breakoutRoomFeatures?.isActive) {
      meta.roomFeatures.breakoutRoomFeatures.isActive = false;

      await this.natsRoomEventsService.updateAndBroadcastRoomMetadata(
        parentRoomId,
        meta,
      );
    }
  }
}
