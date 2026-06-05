/**
 * Analytics Service
 *
 * Processes real-time telemetry events and exports them as artifacts
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import * as fs from 'fs';
import { create, toJsonString, fromJsonString } from '@bufbuild/protobuf';
import {
  AnalyticsDataMsg,
  AnalyticsEventType,
  AnalyticsEvents,
  AnalyticsRedisUserInfoSchema,
  AnalyticsResultSchema,
  AnalyticsRoomInfoSchema,
  AnalyticsUserInfo,
  AnalyticsUserInfoSchema,
  AnalyticsEventData,
  AnalyticsEventDataSchema,
  AnalyticsEventValueSchema,
  RoomMetadata,
  RoomArtifactType,
  CommonNotifyEvent,
  RoomArtifactMetadataSchema,
} from '@workspace/protocol';
import { RedisAnalyticsService } from '@server/meet/infrastructure/redis/redis-analytics.service';
import { NatsService } from '@server/meet/infrastructure/nats/nats.service';
import { PrismaService, AppConfigService } from '@server/shared';
import { RedisLockService } from '@server/meet/infrastructure/redis/redis-lock.service';
import { NatsRoomService } from '@server/meet/infrastructure/nats/nats-room.service';
import { ArtifactsService } from '@server/meet/modules/artifacts/artifacts.service';
import { WebhookNotifierService } from '@server/meet/infrastructure/webhook/webhook-notifier.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly redisAnalytics: RedisAnalyticsService,
    private readonly natsService: NatsService,
    private readonly prisma: PrismaService,
    private readonly redisLock: RedisLockService,
    @Inject(forwardRef(() => NatsRoomService))
    private readonly natsRoomService: NatsRoomService,
    @Inject(forwardRef(() => ArtifactsService))
    private readonly artifactsService: ArtifactsService,
    @Inject(forwardRef(() => WebhookNotifierService))
    private readonly webhookNotifier: WebhookNotifierService,
  ) {}

  /**
   * HandleEvent processes an incoming analytics event
   */
  async handleEvent(d: AnalyticsDataMsg): Promise<void> {
    const enabled = this.appConfig.analytics.enabled;
    if (!enabled) return;

    // Always set time to now in milliseconds
    d.time = Date.now().toString();

    switch (d.eventType) {
      case AnalyticsEventType.ROOM:
        await this.handleRoomTypeEvents(d);
        break;
      case AnalyticsEventType.USER:
        await this.handleUserTypeEvents(d);
        break;
    }
  }

  /**
   * handleRoomTypeEvents processes events that are scoped to a room
   */
  private async handleRoomTypeEvents(d: AnalyticsDataMsg): Promise<void> {
    if (d.eventName === AnalyticsEvents.ANALYTICS_EVENT_UNKNOWN) return;

    const key = this.redisAnalytics.getAnalyticsRoomKeyPrefix(d.roomId);

    switch (d.eventName) {
      case AnalyticsEvents.ANALYTICS_EVENT_USER_JOINED:
        await this.handleFirstTimeUserJoined(d, key);
        break;
      default:
        await this.insertEventData(d, key);
    }
  }

  /**
   * handleUserTypeEvents processes events that are scoped to a specific user
   */
  private async handleUserTypeEvents(d: AnalyticsDataMsg): Promise<void> {
    if (d.eventName === AnalyticsEvents.ANALYTICS_EVENT_UNKNOWN) return;
    if (!d.userId) return;

    const key = this.redisAnalytics.getAnalyticsUserKeyPrefix(
      d.roomId,
      d.userId,
    );
    await this.insertEventData(d, key);
  }

  /**
   * insertEventData stores an analytics event in Redis
   */
  private async insertEventData(
    d: AnalyticsDataMsg,
    key: string,
  ): Promise<void> {
    const eventKey = `${key}:${AnalyticsEvents[d.eventName]}`;

    if (d.eventValueInteger === undefined && d.eventValueString === undefined) {
      // HSET type
      const val: Record<string, string> = {};
      const timeStr = d.time.toString();
      val[timeStr] = d.hsetValue ?? timeStr;

      await this.redisAnalytics.addAnalyticsHSETType(eventKey, val);
    } else if (d.eventValueInteger !== undefined) {
      // INCRBY
      await this.redisAnalytics.incrementAnalyticsVal(
        eventKey,
        Number(d.eventValueInteger),
      );
    } else if (d.eventValueString !== undefined) {
      // SET
      await this.redisAnalytics.addAnalyticsStringType(
        eventKey,
        d.eventValueString,
      );
    }
  }

  /**
   * handleFirstTimeUserJoined records a user's information the first time they join
   */
  private async handleFirstTimeUserJoined(
    d: AnalyticsDataMsg,
    key: string,
  ): Promise<void> {
    if (!d.userId) return;

    let umeta: any = {};
    if (d.extraData) {
      try {
        umeta = this.natsService.unmarshalUserMetadata(d.extraData);
      } catch (error) {
        this.logger.warn(
          `Failed to unmarshal user metadata for analytics: ${error.message}`,
        );
      }
    }

    const uInfo = create(AnalyticsRedisUserInfoSchema, {
      name: d.userName,
      isAdmin: umeta.isAdmin ?? false,
      exUserId: umeta.exUserId,
    });

    const userInfoJson = toJsonString(AnalyticsRedisUserInfoSchema, uInfo);
    await this.redisAnalytics.addAnalyticsUser(
      d.roomId,
      d.userId,
      userInfoJson,
    );

    // Also record the join event
    const userEventKey = this.redisAnalytics.getAnalyticsUserKeyPrefix(
      d.roomId,
      d.userId,
    );
    await this.insertEventData(d, userEventKey);
  }

  /**
   * PrepareToExportAnalytics builds the analytics report and saves it
   */
  async prepareToExportAnalytics(
    roomId: string,
    sid: string,
    metaJson: string,
  ): Promise<void> {
    const enabled = this.appConfig.analytics.enabled;
    if (!enabled) return;

    if (!metaJson || !sid) {
      this.logger.warn(
        `Metadata or SID is empty for room ${roomId}, skipping analytics export`,
      );
      return;
    }

    const metadata = this.natsService.unmarshalRoomMetadata(metaJson);

    // Acquire lock
    const lock = await this.redisLock.lockRoomCreation(roomId, 60000);
    if (!lock.acquired) return;

    try {
      // Check if room was re-created
      const natsInfo = await this.natsRoomService.getRoomInfo(roomId);
      if (natsInfo && natsInfo.roomSid !== sid) {
        this.logger.log(
          `Room ${roomId} was likely re-created, skipping analytics export for sid ${sid}`,
        );
        return;
      }

      // Get room from DB
      const room = await this.prisma.roomInfo.findFirst({
        where: { sid: sid },
      });

      if (!room) {
        this.logger.warn(
          `Could not find ended room ${sid} in DB, skipping analytics export`,
        );
        return;
      }

      const jsonData = await this.exportAnalyticsToJson(room, metadata);
      if (!jsonData) return;

      if (metadata.roomFeatures?.enableAnalytics) {
        // Create artifact using standardized service
        const artifact = await this.createAnalyticsArtifact(
          Number(room.id),
          room.roomId,
          room.sid,
          jsonData,
        );

        // Notify via webhook
        await this.sendToWebhookNotifier(
          room.roomId,
          room.sid,
          'analytics_proceeded',
          artifact.artifactId,
        );
      } else {
        this.logger.debug(
          `Analytics feature not enabled for room ${roomId}, report not saved`,
        );
      }
    } finally {
      // Cleanup webhook and release lock
      await this.webhookNotifier.deleteWebhook(roomId);
      await this.redisLock.unlockRoomCreation(roomId, lock.lockValue);
    }
  }

  /**
   * exportAnalyticsToJson builds the report structure and cleans up Redis
   */
  private async exportAnalyticsToJson(
    room: any,
    metadata: RoomMetadata,
  ): Promise<Uint8Array | null> {
    const roomInfo = create(AnalyticsRoomInfoSchema, {
      roomId: room.roomId,
      roomTitle: room.roomTitle,
      roomTotalUsers: '0',
      roomCreation: Math.floor(room.created.getTime() / 1000).toString(),
      roomEnded: room.ended
        ? Math.floor(room.ended.getTime() / 1000).toString()
        : Math.floor(Date.now() / 1000).toString(),
      roomDuration: '0',
      enabledE2ee:
        metadata.roomFeatures?.endToEndEncryptionFeatures?.isEnabled ?? false,
      events: [],
    });

    const creation = BigInt(roomInfo.roomCreation);
    const ended = BigInt(roomInfo.roomEnded);
    roomInfo.roomDuration = (ended - creation).toString();

    const scanPattern = `wajlc:analytics:${room.roomId}:*`;
    const allKeys = await this.redisAnalytics.analyticsScanKeys(scanPattern);

    if (allKeys.length === 0) {
      this.logger.log(`No analytics keys found for room ${room.roomId}`);
    }

    // Process room-level events
    const roomKeyPrefix = this.redisAnalytics.getAnalyticsRoomKeyPrefix(
      room.roomId,
    );
    for (const key of allKeys) {
      if (key.startsWith(roomKeyPrefix) && !key.includes(':user:')) {
        const event = await this.processEventKey(key, roomKeyPrefix);
        if (event) roomInfo.events.push(event);
      }
    }

    // Process users
    const users = await this.redisAnalytics.analyticsGetAllUsers(room.roomId);
    roomInfo.roomTotalUsers = Object.keys(users).length.toString();

    const usersInfo: AnalyticsUserInfo[] = [];
    for (const [userId, userInfoJson] of Object.entries(users)) {
      const redisUserInfo = fromJsonString(
        AnalyticsRedisUserInfoSchema,
        userInfoJson,
      );
      const userInfo = create(AnalyticsUserInfoSchema, {
        userId,
        name: redisUserInfo.name ?? '',
        isAdmin: redisUserInfo.isAdmin,
        exUserId: redisUserInfo.exUserId,
        events: [],
      });

      const userKeyPrefix = this.redisAnalytics.getAnalyticsUserKeyPrefix(
        room.roomId,
        userId,
      );
      for (const key of allKeys) {
        if (key.startsWith(userKeyPrefix)) {
          const event = await this.processEventKey(key, userKeyPrefix);
          if (event) userInfo.events.push(event);
        }
      }
      usersInfo.push(userInfo);
    }

    let resultData: Uint8Array | null = null;
    if (metadata.roomFeatures?.enableAnalytics) {
      const result = create(AnalyticsResultSchema, {
        room: roomInfo,
        users: usersInfo,
      });
      resultData = new TextEncoder().encode(
        toJsonString(AnalyticsResultSchema, result),
      );
    }

    // Cleanup Redis
    const keysToDelete = [...allKeys, `${roomKeyPrefix}:users`];
    await this.redisAnalytics.analyticsDeleteKeys(keysToDelete);

    return resultData;
  }

  /**
   * processEventKey builds an AnalyticsEventData from a Redis key
   */
  private async processEventKey(
    key: string,
    prefix: string,
  ): Promise<AnalyticsEventData | null> {
    const eventNameWithPrefix = key.substring(prefix.length + 1);
    let eventName = '';

    if (eventNameWithPrefix.startsWith('ANALYTICS_EVENT_ROOM_')) {
      eventName = eventNameWithPrefix
        .replace('ANALYTICS_EVENT_ROOM_', '')
        .toLowerCase();
    } else if (eventNameWithPrefix.startsWith('ANALYTICS_EVENT_USER_')) {
      eventName = eventNameWithPrefix
        .replace('ANALYTICS_EVENT_USER_', '')
        .toLowerCase();
    } else {
      return null;
    }

    const eventData = create(AnalyticsEventDataSchema, {
      name: eventName,
      total: 0,
      values: [],
    });

    const type = await this.redisAnalytics.analyticsGetKeyType(key);
    if (type === 'hash') {
      const hashVals =
        await this.redisAnalytics.getAnalyticsAllHashTypeVals(key);
      for (const [t, v] of Object.entries(hashVals)) {
        eventData.values.push(
          create(AnalyticsEventValueSchema, {
            time: t,
            value: v,
          }),
        );
      }
      eventData.total = eventData.values.length;
    } else if (type === 'string') {
      const val = await this.redisAnalytics.getAnalyticsStringTypeVal(key);
      if (val) {
        const num = parseInt(val, 10);
        if (isNaN(num)) {
          eventData.total = 1;
          eventData.values.push(
            create(AnalyticsEventValueSchema, {
              value: val,
            }),
          );
        } else {
          eventData.total = num;
        }
      }
    }

    return eventData;
  }

  /**
   * createAnalyticsArtifact saves the report to disk and creates a DB record
   */
  private async createAnalyticsArtifact(
    roomTableId: number,
    roomId: string,
    roomSid: string,
    jsonData: Uint8Array,
  ): Promise<any> {
    const fileName = `${roomId}-${Date.now()}-analytics.json`;
    const { relativePath, absolutePath } =
      await this.artifactsService.buildPath(
        fileName,
        roomId,
        RoomArtifactType.MEETING_ANALYTICS,
      );

    try {
      await fs.promises.writeFile(absolutePath, jsonData);
    } catch (error) {
      this.logger.error(`Failed to write analytics file: ${error.message}`);
      throw new Error(`failed to write analytics file: ${error.message}`);
    }

    const metadata = create(RoomArtifactMetadataSchema, {
      fileInfo: {
        filePath: relativePath,
        fileSize: BigInt(jsonData.length).toString(),
        mimeType: 'application/json',
      },
    });

    return await this.artifactsService.createAndSaveArtifact(
      roomId,
      roomSid,
      roomTableId,
      RoomArtifactType.MEETING_ANALYTICS,
      metadata,
    );
  }

  /**
   * sendToWebhookNotifier sends analytics-related webhook notifications
   */
  private async sendToWebhookNotifier(
    roomId: string,
    roomSid: string,
    task: string,
    fileId: string,
  ): Promise<void> {
    const msg = {
      event: task,
      room: {
        sid: roomSid,
        roomId: roomId,
      },
      analytics: {
        fileId: fileId,
      },
    } as CommonNotifyEvent;

    try {
      await this.webhookNotifier.sendWebhookEvent(msg);
    } catch (error) {
      this.logger.error(`Failed to send analytics webhook: ${error.message}`);
    }
  }
}
