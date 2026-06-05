/**
 * Room Create Service
 *
 * Handles room creation logic with all validation and defaults
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { create } from '@bufbuild/protobuf';
import type {
  CreateRoomReq,
  ActiveRoomInfo,
  RoomMetadata,
} from '@workspace/protocol';
import {
  ActiveRoomInfoSchema,
  CopyrightConfSchema,
  CommonNotifyEventSchema,
  NotifyEventRoomSchema,
} from '@workspace/protocol';
import {
  prepareDefaultRoomFeatures,
  setCreateRoomDefaultValues,
  setRoomDefaultLockSettings,
  setDefaultRoomSettings,
  type RoomDefaultSettings,
  AppConfigService,
} from '@server/shared';
import { RedisLockService } from '@server/meet/infrastructure/redis/redis-lock.service';
import { NatsStreamService } from '@server/meet/infrastructure/nats/nats-stream.service';
import { NatsRoomService } from '@server/meet/infrastructure/nats/nats-room.service';
import { WebhookNotifierService } from '@server/meet/infrastructure/webhook/webhook-notifier.service';
import { RoomInfoService } from '@server/meet/modules/room/room-info.service';
import { FileService } from '@server/meet/modules/file/file.service';
import { acquireRoomCreationLockWithRetry } from '@server/meet/modules/room/room-lock.helper';

import { RoomDurationService } from '@server/meet/modules/room/room-duration.service';
import { NatsRoomEventsService } from '@server/meet/infrastructure/nats/nats-room-events.service';

/**
 * RoomCreateService handles the creation of new rooms
 */
@Injectable()
export class RoomCreateService {
  private readonly logger = new Logger(RoomCreateService.name);

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly redisLock: RedisLockService,
    @Inject(forwardRef(() => NatsStreamService))
    private readonly natsStream: NatsStreamService,
    @Inject(forwardRef(() => NatsRoomService))
    private readonly natsRoom: NatsRoomService,
    @Inject(forwardRef(() => WebhookNotifierService))
    private readonly webhookNotifier: WebhookNotifierService,
    private readonly roomInfoService: RoomInfoService,
    @Inject(forwardRef(() => FileService))
    private readonly fileService: FileService,
    private readonly roomDurationService: RoomDurationService,
    @Inject(forwardRef(() => NatsRoomEventsService))
    private readonly natsRoomEvents: NatsRoomEventsService,
  ) {}

  /**
   * CreateRoom creates a new room
   */
  async createRoom(req: CreateRoomReq): Promise<ActiveRoomInfo> {
    this.logger.log(
      `Create room request: ${req.roomId}, breakout: ${req.metadata?.isBreakoutRoom}`,
    );

    // Validate the roomId to ensure it doesn't contain our internal patterns.
    const userKeyFieldPrefix = '-FIELD_';
    const userKeyPrefix = 'user_';

    if (req.roomId.includes(userKeyFieldPrefix)) {
      throw new Error(
        `roomId không được chứa mẫu dành riêng '${userKeyFieldPrefix}'`,
      );
    }
    if (req.roomId.startsWith(userKeyPrefix)) {
      throw new Error(
        `roomId không được bắt đầu bằng mẫu dành riêng '${userKeyPrefix}'`,
      );
    }

    // Step 1: Acquire room creation lock (prevent duplicate creation)
    // Using helper with retry and exponential backoff
    const lockValue = await acquireRoomCreationLockWithRetry(
      this.redisLock,
      req.roomId,
      this.logger,
    );

    try {
      // Step 2: Check if room already exists in DB
      // Using RoomInfoService which matches source DatabaseService
      const roomDbInfo = await this.roomInfoService.getRoomInfoByRoomId(
        req.roomId,
        true,
      );

      // Step 3: Handle existing room logic
      if (roomDbInfo && roomDbInfo.sid) {
        this.logger.log(`Found existing active room in DB: ${req.roomId}`);
        const existingRoom = await this.handleExistingRoom(req, roomDbInfo);
        if (existingRoom) {
          this.logger.log(`Successfully handled existing room: ${req.roomId}`);
          return existingRoom;
        }
        this.logger.log(
          `Existing room was stale, proceeding to create new session`,
        );
      }

      // Step 4: Initialize room defaults
      this.setRoomDefaults(req);

      // Step 5: Prepare DB model
      const { roomInfo, sid } = this.prepareRoomDbInfo(req, roomDbInfo);

      // Step 6: Save to database using atomic upsert
      // Returns full object with ID
      const savedRoomInfo = await this.roomInfoService.insertOrUpdateRoomInfo({
        id: roomInfo.id,
        roomTitle: roomInfo.roomTitle,
        roomId: roomInfo.roomId,
        sid: roomInfo.sid,
        joinedParticipants: roomInfo.joinedParticipants,
        isRunning: roomInfo.isRunning,
        webhookUrl: roomInfo.webhookUrl,
        isBreakoutRoom: roomInfo.isBreakoutRoom ? true : false,
        parentRoomId: roomInfo.parentRoomId,
        creationTime: BigInt(roomInfo.creationTime),
      });

      this.logger.log(
        `Room info saved to DB: ${req.roomId}, sid: ${sid}, webhook: ${savedRoomInfo.webhookUrl}`,
      );

      // Step 7: Create room in NATS bucket
      // Use savedRoomInfo.id to ensure we have the DB auto-increment ID
      const mt = await this.natsRoom.addRoom(
        savedRoomInfo.id,
        req.roomId,
        sid,
        req.emptyTimeout,
        req.maxParticipants,
        req.metadata,
      );
      this.logger.log(
        `Room added to NATS: ${req.roomId}, tableId: ${savedRoomInfo.id}`,
      );

      // Step 8: Preload whiteboard file if needed (async)
      if (!req.metadata?.isBreakoutRoom) {
        this.prepareWhiteboardPreloadFile(req.metadata!, req.roomId, sid).catch(
          (err) => {
            this.logger.error(
              `Failed to prepare whiteboard preload file: ${err.message}`,
            );
          },
        );
      }

      // Step 9: Build response
      const activeRoomInfo = create(ActiveRoomInfoSchema, {
        roomId: req.roomId,
        sid: sid,
        roomTitle: roomInfo.roomTitle,
        isRunning: 1,
        creationTime: roomInfo.creationTime.toString(),
        webhookUrl: roomInfo.webhookUrl,
        metadata: mt,
      });

      // Step 12: Send room created webhook (async)
      this.sendRoomCreatedWebhook(
        activeRoomInfo,
        req.emptyTimeout,
        req.maxParticipants,
      ).catch((err) => {
        this.logger.error(
          `Failed to send room created webhook: ${err.message}`,
        );
      });

      this.logger.log(`Successfully created new room: ${req.roomId}`);
      return activeRoomInfo;
    } finally {
      // Always release lock
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(
          () => reject(new Error('Unlock timeout after 5 seconds')),
          5000,
        );
      });

      const unlockPromise = this.redisLock.unlockRoomCreation(
        req.roomId,
        lockValue,
      );

      try {
        await Promise.race([unlockPromise, timeoutPromise]);
        this.logger.log(`Room creation lock released: ${req.roomId}`);
      } catch (unlockErr) {
        // Swallow unlock errors, only log
        this.logger.error(
          `Error trying to clean up room creation lock for ${req.roomId}: ${unlockErr instanceof Error ? unlockErr.message : unlockErr}`,
        );
      }
    }
  }

  /**
   * handleExistingRoom handles logic if room already exists
   */
  private async handleExistingRoom(
    req: CreateRoomReq,
    roomDbInfo: any,
  ): Promise<ActiveRoomInfo | null> {
    this.logger.log(`Checking NATS for live room info: ${req.roomId}`);

    // Get room info from NATS
    const rInfo = await this.natsRoom.getRoomInfo(req.roomId);

    if (!rInfo) {
      this.logger.log(
        `No active room found in NATS, proceeding to create new session`,
      );
      return null;
    }

    // Check if NATS room matches DB record
    // NOTE: dbTableId from NATS is a string (uint64), roomDbInfo.id is a number
    // We must convert for proper comparison
    const natsDbId = parseInt(rInfo.dbTableId, 10);
    if (natsDbId !== roomDbInfo.id) {
      this.logger.warn(
        `NATS room info does not match DB record (nats_id: ${natsDbId}, db_id: ${roomDbInfo.id}), proceeding to create new session`,
      );
      return null;
    }

    // Room is active and matches DB record
    this.logger.log(`Found matching active room in NATS, updating status`);

    await this.natsRoom.updateRoomStatus(req.roomId, 'active');

    return create(ActiveRoomInfoSchema, {
      roomId: rInfo.roomId,
      sid: rInfo.roomSid,
      roomTitle: roomDbInfo.roomTitle,
      isRunning: 1,
      creationTime: roomDbInfo.creationTime.toString(),
      webhookUrl: roomDbInfo.webhookUrl,
      metadata: rInfo.metadata,
    });
  }

  /**
   * setRoomDefaults sets default values and metadata
   */
  private setRoomDefaults(req: CreateRoomReq): void {
    // Step 1: Prepare default room features
    prepareDefaultRoomFeatures(req);

    // Get config values
    const maxFileSize = this.appConfig.upload.maxFileSizeBytes;
    const maxWhiteboardFileSize = this.appConfig.upload.maxWhiteboardFileSizeMb;
    const allowedFileTypes = this.appConfig.upload.allowedTypes;
    const sharedNotepadEnabled = this.appConfig.room.sharedNotepadEnabled;

    // Step 2: Set create room default values based on config
    setCreateRoomDefaultValues(
      req,
      maxFileSize.toString(), // uint64 as string
      maxWhiteboardFileSize.toString(), // uint64 as string
      allowedFileTypes,
      sharedNotepadEnabled,
    );

    // Step 3: Set default lock settings
    setRoomDefaultLockSettings(req);

    // Step 4: Set default room settings (max participants, duration, etc.)
    const roomDefaultSettings: RoomDefaultSettings = {
      maxParticipants: this.appConfig.room.defaultMaxParticipants,
      maxDuration: this.appConfig.room.defaultMaxDuration,
      maxNumBreakoutRooms: this.appConfig.room.defaultMaxNumBreakoutRooms,
    };
    setDefaultRoomSettings(roomDefaultSettings, req);

    // Step 5: Copyright logic
    const copyright = this.appConfig.room.copyright;

    const defaultCopyright = create(CopyrightConfSchema, {
      display: copyright.display,
      text: copyright.text,
    });

    if (!req.metadata!.copyrightConf) {
      req.metadata!.copyrightConf = defaultCopyright;
    } else if (!copyright.allowOverride) {
      // Override user's copyright if not allowed to override
      req.metadata!.copyrightConf = defaultCopyright;
    }

    // Step 6: Breakout room analytics
    if (
      req.metadata?.isBreakoutRoom &&
      req.metadata?.roomFeatures?.enableAnalytics
    ) {
      req.metadata.roomFeatures.enableAnalytics = false;
    }

    // Step 7: Insights features configuration
    if (req.metadata?.roomFeatures?.insightsFeatures) {
      const insightsEnabled = this.appConfig.insights.enabled;
      if (
        req.metadata.roomFeatures.insightsFeatures.isAllow &&
        !insightsEnabled
      ) {
        req.metadata.roomFeatures.insightsFeatures.isAllow = false;
      }

      if (req.metadata.roomFeatures.insightsFeatures.isAllow) {
        // Set max selected translation languages from config
        const maxTranscriptionLangs =
          this.appConfig.insights.maxTranscriptionLangs;
        const maxChatTransLangs = this.appConfig.insights.maxChatTransLangs;

        if (req.metadata.roomFeatures.insightsFeatures.transcriptionFeatures) {
          req.metadata.roomFeatures.insightsFeatures.transcriptionFeatures.maxSelectedTransLangs =
            maxTranscriptionLangs;
        }
        if (
          req.metadata.roomFeatures.insightsFeatures.chatTranslationFeatures
        ) {
          req.metadata.roomFeatures.insightsFeatures.chatTranslationFeatures.maxSelectedTransLangs =
            maxChatTransLangs;
        }
      }
    }

    // Step 8: Handle if enabled E2EE
    if (req.metadata?.roomFeatures?.endToEndEncryptionFeatures?.isEnabled) {
      // Disabling features that block E2EE
      // SIP is not supported, so we don't handle its field here
      if (req.metadata.roomFeatures.ingressFeatures) {
        req.metadata.roomFeatures.ingressFeatures.isAllow = false;
      }

      const insightsFeatures = req.metadata.roomFeatures.insightsFeatures;
      if (insightsFeatures?.transcriptionFeatures) {
        insightsFeatures.transcriptionFeatures.isAllow = false;
      }
      if (insightsFeatures?.aiFeatures?.meetingSummarizationFeatures) {
        insightsFeatures.aiFeatures.meetingSummarizationFeatures.isAllow = false;
      }
    }
  }

  /**
   * prepareRoomDbInfo prepares DB model for room
   */
  private prepareRoomDbInfo(
    req: CreateRoomReq,
    existing: any | null,
  ): { roomInfo: any; sid: string } {
    const sid = uuidv4();
    const isBreakoutRoom = req.metadata?.isBreakoutRoom ? 1 : 0;

    if (!existing) {
      existing = {
        roomTitle: req.metadata?.roomTitle || '',
        roomId: req.roomId,
        sid: sid,
        joinedParticipants: 0,
        isRunning: 1,
        webhookUrl: '',
        isBreakoutRoom: isBreakoutRoom,
        parentRoomId: req.metadata?.parentRoomId || '',
        // Convert milliseconds to seconds to match server's int(10) format
        // autoCreateTime creates Unix timestamp in seconds
        creationTime: Math.floor(Date.now() / 1000),
      };
    } else {
      existing.sid = sid;
    }

    if (req.metadata?.webhookUrl) {
      existing.webhookUrl = req.metadata.webhookUrl;
    }

    return { roomInfo: existing, sid };
  }

  /**
   * prepareWhiteboardPreloadFile preloads whiteboard file
   */
  private async prepareWhiteboardPreloadFile(
    metadata: RoomMetadata,
    roomId: string,
    roomSid: string,
  ): Promise<void> {
    const wbf = metadata.roomFeatures?.whiteboardFeatures;
    if (!wbf?.isAllow || !wbf.preloadFile) {
      return;
    }

    const preloadFile = wbf.preloadFile;
    this.logger.log(`Preparing preloaded whiteboard file: ${preloadFile}`);

    try {
      const result = await this.fileService.downloadAndProcessPreUploadWBfile(
        roomId,
        roomSid,
        preloadFile,
      );

      // Update metadata
      metadata.roomFeatures!.whiteboardFeatures!.preloadFile = undefined;
      metadata.roomFeatures!.whiteboardFeatures!.whiteboardFileId =
        result.fileId;
      metadata.roomFeatures!.whiteboardFeatures!.fileName = result.fileName;
      metadata.roomFeatures!.whiteboardFeatures!.filePath = result.filePath;
      metadata.roomFeatures!.whiteboardFeatures!.totalPages = result.totalPages;

      // Update and broadcast room metadata
      await this.natsRoomEvents.updateAndBroadcastRoomMetadata(
        roomId,
        metadata,
      );

      this.logger.log(`Preloaded whiteboard file processed successfully`);
    } catch (error) {
      this.logger.warn(
        `Preloaded whiteboard file failed, notification skipped`,
      );
    }
  }

  /**
   * sendRoomCreatedWebhook sends room created webhook
   */
  private async sendRoomCreatedWebhook(
    info: ActiveRoomInfo,
    emptyTimeout?: number,
    maxParticipants?: number,
  ): Promise<void> {
    // Register webhook for this room
    await this.webhookNotifier.registerWebhook(info.roomId, info.sid);

    const event = 'room_created';
    const creationTime = BigInt(info.creationTime);

    const msg = create(CommonNotifyEventSchema, {
      event: event,
      room: create(NotifyEventRoomSchema, {
        roomId: info.roomId,
        sid: info.sid,
        creationTime: creationTime.toString(), // uint64 as string
        metadata: info.metadata,
        emptyTimeout: emptyTimeout,
        maxParticipants: maxParticipants,
      }),
    });

    try {
      // Send webhook event
      await this.webhookNotifier.sendWebhookEvent(msg);
      this.logger.log(`Room created webhook sent: ${info.roomId}`);
    } catch (error) {
      this.logger.error(
        `Error sending room created webhook: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
