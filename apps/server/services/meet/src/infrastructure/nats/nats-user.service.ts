/**
 * NATS User Service
 *
 * Handles NATS KV operations for user information and modification.
 *  (wajlc-room-{roomId}).
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { create } from '@bufbuild/protobuf';
import { v4 as uuidv4 } from 'uuid';
import {
  UserMetadata,
  UserMetadataSchema,
  NatsMsgServerToClientEvents,
  AnalyticsEventType,
  AnalyticsEvents,
  AnalyticsDataMsg,
  NatsKvUserInfo,
  NatsKvUserInfoSchema,
  NatsUserMetadataUpdateSchema,
} from '@workspace/protocol';
import { toJsonString } from '@bufbuild/protobuf';
import { NatsService } from '@server/meet/infrastructure/nats/nats.service';
import { NatsConsumerService } from '@server/meet/infrastructure/nats/nats-consumer.service';
import {
  NatsRoomService,
  ROOM_STATUS_ENDED,
} from '@server/meet/infrastructure/nats/nats-room.service';
import { NatsSystemEventsService } from '@server/meet/infrastructure/nats/nats-system-events.service';
import { AnalyticsService } from '@server/meet/modules/analytics/analytics.service';
import { LiveKitService } from '@server/meet/infrastructure/livekit/livekit.service';

// User status constants
export const USER_STATUS_ADDED = 'added';
export const USER_STATUS_ONLINE = 'online';
export const USER_STATUS_DISCONNECTED = 'disconnected';
export const USER_STATUS_OFFLINE = 'offline';

@Injectable()
export class NatsUserService {
  private readonly logger = new Logger(NatsUserService.name);

  constructor(
    private readonly natsService: NatsService,
    private readonly natsConsumerService: NatsConsumerService,
    @Inject(forwardRef(() => NatsRoomService))
    private readonly natsRoomService: NatsRoomService,
    @Inject(forwardRef(() => NatsSystemEventsService))
    private readonly natsSystemEvents: NatsSystemEventsService,
    @Inject(forwardRef(() => AnalyticsService))
    private readonly analyticsService: AnalyticsService,
    private readonly livekitService: LiveKitService,
  ) {}

  /**
   * GetRoomUserStatus retrieves the status of a user in a specific room.
   */
  async getRoomUserStatus(roomId: string, userId: string): Promise<string> {
    const cached = this.natsService
      .getCacheService()
      .getCachedRoomUserStatus(roomId, userId);
    if (cached) return cached.status;

    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);
    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);
      return await this.natsService.getStringValue(
        kv,
        this.natsService.formatUserKey(userId, 'status'),
      );
    } catch (error) {
      return '';
    }
  }

  /**
   * GetUserInfo retrieves detailed information about a user in a specific room.
   */
  async getUserInfo(
    roomId: string,
    userId: string,
  ): Promise<NatsKvUserInfo | null> {
    this.logger.debug(`Getting user info: user=${userId}, room=${roomId}`);

    // Step 1: Try cache first
    const cache = this.natsService.getCacheService();
    const cached = cache.getUserInfo(roomId, userId);
    if (cached) return create(NatsKvUserInfoSchema, cached);

    // Step 2: Cache miss - read from consolidated bucket
    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);

    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);

      // Fetch room status to see if we should start a watcher
      const roomInfo = await this.natsRoomService.getRoomInfo(roomId);
      if (roomInfo && roomInfo.status !== ROOM_STATUS_ENDED) {
        // Ensure room watcher is running (which handles all users too)
        cache.addRoomWatcher(kv, bucket, roomId);
      }

      // Reconstruct user info from multiple keys in consolidated bucket
      const info = create(NatsKvUserInfoSchema, {
        userId: await this.natsService.getStringValue(
          kv,
          this.natsService.formatUserKey(userId, 'id'),
        ),
        userSid: await this.natsService.getStringValue(
          kv,
          this.natsService.formatUserKey(userId, 'sid'),
        ),
        name: await this.natsService.getStringValue(
          kv,
          this.natsService.formatUserKey(userId, 'name'),
        ),
        roomId: await this.natsService.getStringValue(
          kv,
          this.natsService.formatUserKey(userId, 'room_id'),
        ),
        metadata: await this.natsService.getStringValue(
          kv,
          this.natsService.formatUserKey(userId, 'metadata'),
        ),
        isAdmin: await this.natsService.getBoolValue(
          kv,
          this.natsService.formatUserKey(userId, 'is_admin'),
        ),
        isPresenter: await this.natsService.getBoolValue(
          kv,
          this.natsService.formatUserKey(userId, 'is_presenter'),
        ),
        joinedAt: await this.natsService.getUint64Value(
          kv,
          this.natsService.formatUserKey(userId, 'joined_at'),
        ),
        reconnectedAt: await this.natsService.getUint64Value(
          kv,
          this.natsService.formatUserKey(userId, 'reconnected_at'),
        ),
        disconnectedAt: await this.natsService.getUint64Value(
          kv,
          this.natsService.formatUserKey(userId, 'disconnected_at'),
        ),
      });

      // If userId is empty, user doesn't exist in this bucket
      if (!info.userId) return null;

      return info;
    } catch (error) {
      return null;
    }
  }

  /**
   * GetOnlineUsersId retrieves the IDs of users who are currently online.
   */
  async getOnlineUsersId(roomId: string): Promise<string[]> {
    const cachedIds = this.natsService
      .getCacheService()
      .getUsersIdFromRoomStatusBucket(roomId, USER_STATUS_ONLINE);

    if (
      this.natsService.getCacheService().isRoomWatched(roomId) ||
      cachedIds.length > 0
    ) {
      return cachedIds;
    }

    // Fallback to NATS only during initial room startup or if cache is not active
    try {
      const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);
      const keys = await kv.keys();
      const userIds: string[] = [];

      const userPrefix = NatsService.USER_KEY_PREFIX;
      const fieldPrefix = NatsService.USER_KEY_FIELD_PREFIX;

      for await (const k of keys) {
        if (k.startsWith(userPrefix)) {
          const trimmed = k.substring(userPrefix.length);
          const parts = trimmed.split(fieldPrefix);
          if (parts.length === 2 && parts[1] === 'status') {
            const entry = await kv.get(k);
            if (
              entry &&
              new TextDecoder().decode(entry.value) === USER_STATUS_ONLINE
            ) {
              userIds.push(parts[0]);
            }
          }
        }
      }
      return userIds;
    } catch (error) {
      return [];
    }
  }

  /**
   * GetRoomUserIds retrieves all user IDs for a given room.
   */
  async getRoomUserIds(roomId: string): Promise<string[]> {
    const cachedIds = this.natsService
      .getCacheService()
      .getUsersIdFromRoomStatusBucket(roomId, '');
    if (cachedIds.length > 0) return cachedIds;

    try {
      const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);
      const keys = await kv.keys();
      const userIds = new Set<string>();

      const userPrefix = NatsService.USER_KEY_PREFIX;
      const fieldPrefix = NatsService.USER_KEY_FIELD_PREFIX;

      for await (const k of keys) {
        if (k.startsWith(userPrefix)) {
          const trimmed = k.substring(userPrefix.length);
          const parts = trimmed.split(fieldPrefix);
          if (parts.length === 2) {
            userIds.add(parts[0]);
          }
        }
      }
      return Array.from(userIds);
    } catch (error) {
      return [];
    }
  }

  /**
   * GetOnlineUsersList retrieves detailed information about all online users.
   */
  async getOnlineUsersList(roomId: string): Promise<NatsKvUserInfo[]> {
    const userIds = await this.getOnlineUsersId(roomId);
    const users: NatsKvUserInfo[] = [];
    for (const id of userIds) {
      const info = await this.getUserInfo(roomId, id);
      if (info) users.push(info);
    }
    return users;
  }

  /**
   * GetOnlineUsersListAsJson retrieves online users as JSON string.
   */
  async getOnlineUsersListAsJson(roomId: string): Promise<string | null> {
    const users = await this.getOnlineUsersList(roomId);
    if (users.length === 0) return null;

    const jsonArray = users.map((u) =>
      this.natsService.marshalToProtoJson(u, NatsKvUserInfoSchema),
    );
    return `[${jsonArray.join(',')}]`;
  }

  /**
   * GetUserMetadataStruct retrieves user metadata as structured object.
   */
  async getUserMetadataStruct(
    roomId: string,
    userId: string,
  ): Promise<UserMetadata | null> {
    // Try cache first (if you had a direct cache for metadata, but we reuse getUserInfo cache usually)
    const infoCache = this.natsService
      .getCacheService()
      .getUserInfo(roomId, userId);
    if (infoCache && infoCache.metadata) {
      return this.natsService.unmarshalUserMetadata(infoCache.metadata);
    }

    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);
    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);
      const metadataStr = await this.natsService.getStringValue(
        kv,
        this.natsService.formatUserKey(userId, 'metadata'),
      );

      if (!metadataStr) return null;
      return this.natsService.unmarshalUserMetadata(metadataStr);
    } catch (error) {
      return null;
    }
  }

  /**
   * GetUserWithMetadata retrieves user info along with parsed metadata.
   */
  async getUserWithMetadata(
    roomId: string,
    userId: string,
  ): Promise<{ info: NatsKvUserInfo | null; metadata: UserMetadata | null }> {
    const info = await this.getUserInfo(roomId, userId);
    if (!info) return { info: null, metadata: null };
    const metadata = this.natsService.unmarshalUserMetadata(info.metadata);
    return { info, metadata };
  }

  /**
   * GetUserLastPing retrieves last ping timestamp for a user.
   */
  async getUserLastPing(roomId: string, userId: string): Promise<number> {
    const cached = this.natsService
      .getCacheService()
      .getUserLastPingAt(roomId, userId);
    if (cached > 0) return cached;

    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);
    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);
      const val = await this.natsService.getStringValue(
        kv,
        this.natsService.formatUserKey(userId, 'last_ping_at'),
      );
      return parseInt(val, 10) || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * IsUserPresenter checks if a user is a presenter.
   */
  async isUserPresenter(roomId: string, userId: string): Promise<boolean> {
    const infoCache = this.natsService
      .getCacheService()
      .getUserInfo(roomId, userId);
    if (infoCache) {
      return infoCache.isPresenter;
    }

    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);
    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);
      return await this.natsService.getBoolValue(
        kv,
        this.natsService.formatUserKey(userId, 'is_presenter'),
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * IsUserExistInBlockList checks if a user is in the block list.
   */
  async isUserExistInBlockList(
    roomId: string,
    userId: string,
  ): Promise<boolean> {
    // Check cache first
    const cacheResult = this.natsService
      .getCacheService()
      .isUserBlacklistedFromCache(roomId, userId);
    if (cacheResult.found) {
      return cacheResult.isBlacklisted;
    }

    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);
    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);
      return await this.natsService.getBoolValue(
        kv,
        this.natsService.formatUserKey(userId, 'is_blacklisted'),
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * GetUserKeyValue retrieves a specific key-value entry for a user
   */
  async getUserKeyValue(
    roomId: string,
    userId: string,
    key: string,
  ): Promise<any | null> {
    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);
    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);
      return await kv.get(this.natsService.formatUserKey(userId, key));
    } catch (error) {
      return null;
    }
  }

  /**
   * AddUser creates a new user entry in the consolidated room bucket
   */
  async addUser(
    roomId: string,
    userId: string,
    name: string,
    isAdmin: boolean,
    isPresenter: boolean,
    metadata?: UserMetadata,
  ): Promise<void> {
    this.logger.log(
      `Adding user to consolidated NATS KV: ${userId}, room: ${roomId}`,
    );

    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);

    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);

      const mt = this.natsService.marshalUserMetadata(
        metadata || create(UserMetadataSchema, {}),
      );

      // Prepare user data map
      const data: Record<string, string> = {
        [this.natsService.formatUserKey(userId, 'id')]: userId,
        [this.natsService.formatUserKey(userId, 'sid')]: uuidv4(),
        [this.natsService.formatUserKey(userId, 'name')]: name,
        [this.natsService.formatUserKey(userId, 'room_id')]: roomId,
        [this.natsService.formatUserKey(userId, 'is_admin')]:
          isAdmin.toString(),
        [this.natsService.formatUserKey(userId, 'is_presenter')]:
          isPresenter.toString(),
        [this.natsService.formatUserKey(userId, 'metadata')]: mt,
        [this.natsService.formatUserKey(userId, 'last_ping_at')]: '0',
        [this.natsService.formatUserKey(userId, 'status')]: USER_STATUS_ADDED,
        [this.natsService.formatUserKey(userId, 'is_blacklisted')]: 'false',
      };

      // Store each key
      for (const [key, value] of Object.entries(data)) {
        await kv.put(key, new TextEncoder().encode(value));
      }

      this.logger.log(
        `User added successfully to consolidated bucket: ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Error adding user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * AddUserManuallyAndBroadcast adds a user manually (e.g. ingress) and broadcasts the event.
   */
  async addUserManuallyAndBroadcast(
    roomId: string,
    userId: string,
    name: string,
    isAdmin: boolean,
    broadcast: boolean,
  ): Promise<NatsKvUserInfo | null> {
    // Create default metadata for manual user (e.g. ingress)
    const mt = create(UserMetadataSchema, {
      isAdmin: isAdmin,
      recordWebcam: false,
      waitForApproval: false,
      lockSettings: {
        lockWebcam: false,
        lockMicrophone: false,
      },
    });

    try {
      // 1. Add User
      await this.addUser(roomId, userId, name, isAdmin, false, mt);

      if (!broadcast) {
        return null;
      }

      // 2. Update status to Online
      await this.updateUserStatus(roomId, userId, USER_STATUS_ONLINE);

      // 3. Get User Info
      const userInfo = await this.getUserInfo(roomId, userId);
      if (!userInfo) {
        return null;
      }

      // 4. Broadcast Event
      await this.natsSystemEvents.broadcastSystemEventToEveryoneExceptUserId(
        NatsMsgServerToClientEvents.USER_JOINED,
        roomId,
        userInfo,
        userId,
      );

      return userInfo;
    } catch (error) {
      this.logger.error(
        `Failed to add user manually and broadcast: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * UpdateUserStatus updates user status and maintains timestamps
   */
  async updateUserStatus(
    roomId: string,
    userId: string,
    status: string,
  ): Promise<void> {
    this.logger.debug(`Updating user status: user=${userId}, status=${status}`);

    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);

    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);

      await kv.put(
        this.natsService.formatUserKey(userId, 'status'),
        new TextEncoder().encode(status),
      );

      const now = Date.now().toString();
      if (status === USER_STATUS_ONLINE) {
        // Check if already joined
        const joinedAt = await this.natsService.getStringValue(
          kv,
          this.natsService.formatUserKey(userId, 'joined_at'),
        );
        if (joinedAt && joinedAt !== '0') {
          await kv.put(
            this.natsService.formatUserKey(userId, 'reconnected_at'),
            new TextEncoder().encode(now),
          );
        } else {
          await kv.put(
            this.natsService.formatUserKey(userId, 'joined_at'),
            new TextEncoder().encode(now),
          );
        }
      } else if (
        status === USER_STATUS_DISCONNECTED ||
        status === USER_STATUS_OFFLINE
      ) {
        await kv.put(
          this.natsService.formatUserKey(userId, 'disconnected_at'),
          new TextEncoder().encode(now),
        );
      }
    } catch (error) {
      this.logger.error(
        `Error updating user status for ${userId}: ${error.message}`,
      );
    }
  }

  /**
   * UpdateUserMetadata updates user metadata string
   */
  async updateUserMetadata(
    roomId: string,
    userId: string,
    metadata: UserMetadata | string,
  ): Promise<string> {
    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);
    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);

      let mt: string;
      if (typeof metadata === 'string') {
        mt = metadata;
      } else {
        mt = this.natsService.marshalUserMetadata(metadata);
      }

      await kv.put(
        this.natsService.formatUserKey(userId, 'metadata'),
        new TextEncoder().encode(mt),
      );

      return mt;
    } catch (error) {
      throw new Error(`Failed to update user metadata: ${error.message}`);
    }
  }

  /**
   * BroadcastUserMetadata broadcasts user metadata update.
   */
  async broadcastUserMetadata(
    roomId: string,
    userId: string,
    metadata?: string,
    toUser?: string,
  ): Promise<void> {
    if (!metadata) {
      const result = await this.getUserInfo(roomId, userId);
      if (!result) {
        throw new Error('user not found');
      }
      metadata = result.metadata;
    }

    const data = create(NatsUserMetadataUpdateSchema, {
      metadata: metadata,
      userId: userId,
    });

    // Convert to generic object/JSON for the broadcast method which handles serialization
    // Note: broadcastSystemEventToRoom handles generic objects by JSON stringifying them,
    // but for specific proto messages we might want to ensure it matches what client expects.
    // NatsUserMetadataUpdate is a proto message.
    // The broadcastSystemEventToRoom in NatsSystemEventsService serializes data as JSON string if passed as object.

    // Use proper Protobuf marshal options
    const msg = this.natsService.marshalToProtoJson(
      data,
      NatsUserMetadataUpdateSchema,
    );

    await this.natsSystemEvents.broadcastSystemEventToRoom(
      NatsMsgServerToClientEvents.USER_METADATA_UPDATE,
      roomId,
      msg,
      toUser,
    );
  }

  /**
   * UpdateAndBroadcastUserMetadata updates and broadcasts user metadata.
   */
  async updateAndBroadcastUserMetadata(
    roomId: string,
    userId: string,
    meta: UserMetadata | string,
    toUserId?: string,
  ): Promise<void> {
    if (!meta) {
      throw new Error('metadata cannot be nil');
    }

    const mt = await this.updateUserMetadata(roomId, userId, meta);
    await this.broadcastUserMetadata(roomId, userId, mt, toUserId);
  }

  /**
   * BroadcastUserInfoToRoom broadcasts user info event.
   */
  async broadcastUserInfoToRoom(
    event: NatsMsgServerToClientEvents,
    roomId: string,
    userId: string,
    userInfo?: NatsKvUserInfo,
  ): Promise<void> {
    if (!userInfo) {
      const info = await this.getUserInfo(roomId, userId);
      if (!info) {
        return;
      }
      userInfo = info;
    }

    const msg = this.natsService.marshalToProtoJson(
      userInfo,
      NatsKvUserInfoSchema,
    );
    await this.natsSystemEvents.broadcastSystemEventToRoom(event, roomId, msg);
  }

  /**
   * UpdateUserLastPing updating the last ping timestamp
   */
  async updateUserLastPing(roomId: string, userId: string): Promise<void> {
    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);
    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);
      const now = Date.now().toString();
      await kv.put(
        this.natsService.formatUserKey(userId, 'last_ping_at'),
        new TextEncoder().encode(now),
      );
    } catch (error) {}
  }

  /**
   * DeleteUser marks user as offline (Logical delete)
   */
  async deleteUser(roomId: string, userId: string): Promise<void> {
    await this.updateUserStatus(roomId, userId, USER_STATUS_OFFLINE);
  }

  /**
   * DeleteAllRoomUsersWithConsumer cleans up consumers and user info
   */
  async deleteAllRoomUsersWithConsumer(roomId: string): Promise<void> {
    this.logger.log(`Deleting all users and consumers for room: ${roomId}`);

    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);

    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);

      const keys = await kv.keys();
      const deletedUsers = new Set<string>();

      const userPrefix = NatsService.USER_KEY_PREFIX;
      const fieldPrefix = NatsService.USER_KEY_FIELD_PREFIX;

      for await (const k of keys) {
        if (k.startsWith(userPrefix)) {
          // user_<userId>-FIELD_<field>
          const trimmed = k.substring(userPrefix.length);
          const parts = trimmed.split(fieldPrefix);

          if (parts.length === 2) {
            const userId = parts[0];
            if (!deletedUsers.has(userId)) {
              // Delete the single consumer per user
              await this.natsConsumerService.deleteConsumer(roomId, userId);
              deletedUsers.add(userId);
            }
          }
        }
      }

      this.logger.log(
        `Cleanup complete for ${deletedUsers.size} users in room ${roomId}`,
      );
    } catch (error) {
      if (
        error.message &&
        (error.message.includes('bucket not found') ||
          error.message.includes('stream not found'))
      ) {
        return;
      }
      this.logger.error(
        `Error deleting room users for ${roomId}: ${error.message}`,
      );
    }
  }

  /**
   * UpdateUserKeyValue updates a specific key-value pair for a user
   */
  async updateUserKeyValue(
    roomId: string,
    userId: string,
    key: string,
    value: string,
  ): Promise<void> {
    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);
    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);
      await kv.put(
        this.natsService.formatUserKey(userId, key),
        new TextEncoder().encode(value),
      );
    } catch (error) {}
  }

  /**
   * AddUserToBlockList sets the is_blacklisted flag for a user to true.
   */
  async addUserToBlockList(roomId: string, userId: string): Promise<void> {
    this.logger.log(`Adding user ${userId} to block list for room ${roomId}`);
    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);
    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);
      await kv.put(
        this.natsService.formatUserKey(userId, 'is_blacklisted'),
        new TextEncoder().encode('true'),
      );
    } catch (error) {}
  }

  // ============================================================================
  // User Lifecycle Event Handlers (High-level wrappers)
  // ============================================================================

  async onAfterUserJoined(roomId: string, userId: string): Promise<void> {
    this.logger.log(
      `Handling user joined event: room=${roomId}, user=${userId}`,
    );

    // Try cache first, then fallback to KV if cache not ready
    const status = this.natsService
      .getCacheService()
      .getCachedRoomUserStatus(roomId, userId);
    if (!status) {
      // Cache might not be ready yet, read directly from NATS KV as fallback
      try {
        const statusStr = await this.getRoomUserStatus(roomId, userId);
        if (statusStr === USER_STATUS_ONLINE) {
          this.logger.debug(
            `User ${userId} already online (from KV fallback), skipping broadcast`,
          );
          return;
        }
      } catch (error) {
        // Continue if we can't read from KV - better to broadcast than miss the event
        this.logger.warn(
          `Could not read user status from KV: ${error.message}`,
        );
      }
    } else if (status.status === USER_STATUS_ONLINE) {
      this.logger.debug(
        `User ${userId} already online (from cache), skipping broadcast`,
      );
      return;
    }

    await this.updateUserStatus(roomId, userId, USER_STATUS_ONLINE);
    const userInfo = await this.getUserInfo(roomId, userId);
    if (userInfo) {
      const userInfoMsg = this.natsService.marshalToProtoJson(
        userInfo,
        NatsKvUserInfoSchema,
      );
      // Non-blocking broadcast to avoid clogging the worker pool
      this.natsSystemEvents
        .broadcastSystemEventToEveryoneExceptUserId(
          NatsMsgServerToClientEvents.USER_JOINED,
          roomId,
          userInfoMsg,
          userId,
        )
        .catch(() => {});

      // Non-blocking analytics
      this.analyticsService
        .handleEvent({
          eventType: AnalyticsEventType.ROOM,
          eventName: AnalyticsEvents.ANALYTICS_EVENT_USER_JOINED,
          roomId,
          userId,
          userName: userInfo.name,
          extraData: userInfo.metadata,
          hsetValue: Date.now().toString(),
        } as AnalyticsDataMsg)
        .catch((err) => this.logger.error(`Analytics error: ${err.message}`));
    }
  }

  async onAfterUserDisconnected(roomId: string, userId: string): Promise<void> {
    this.logger.log(
      `Handling user disconnected event: room=${roomId}, user=${userId}`,
    );
    await this.updateUserStatus(roomId, userId, USER_STATUS_DISCONNECTED);

    // Immediate analytics for user left
    // Non-blocking analytics
    this.analyticsService
      .handleEvent({
        eventType: AnalyticsEventType.USER,
        eventName: AnalyticsEvents.ANALYTICS_EVENT_USER_LEFT,
        roomId,
        userId,
        hsetValue: Date.now().toString(),
      } as AnalyticsDataMsg)
      .catch((err) => this.logger.error(`Analytics error: ${err.message}`));

    const userInfo =
      (await this.getUserInfo(roomId, userId)) ||
      create(NatsKvUserInfoSchema, { userId, roomId });
    const userInfoMsg = this.natsService.marshalToProtoJson(
      userInfo,
      NatsKvUserInfoSchema,
    );

    // Non-blocking broadcast
    this.natsSystemEvents
      .broadcastSystemEventToEveryoneExceptUserId(
        NatsMsgServerToClientEvents.USER_DISCONNECTED,
        roomId,
        userInfoMsg,
        userId,
      )
      .catch(() => {});

    setImmediate(() =>
      this.handleDelayedOfflineTasks(roomId, userId, userInfo),
    );
  }

  private async handleDelayedOfflineTasks(
    roomId: string,
    userId: string,
    userInfo: any,
  ): Promise<void> {
    // Stage 1: Wait for the reconnection grace period (5 seconds)
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const status = await this.natsService
      .getCacheService()
      .getCachedRoomUserStatus(roomId, userId);
    if (status?.status === USER_STATUS_ONLINE) {
      this.logger.debug(
        `User ${userId} reconnected within grace period, aborting offline tasks`,
      );
      return;
    }

    // Mark as offline
    await this.updateUserStatus(roomId, userId, USER_STATUS_OFFLINE);

    // Broadcast final offline status
    const userInfoObj =
      userInfo || create(NatsKvUserInfoSchema, { userId, roomId });
    const userInfoMsg = this.natsService.marshalToProtoJson(
      userInfoObj,
      NatsKvUserInfoSchema,
    );

    // Non-blocking broadcast
    this.natsSystemEvents
      .broadcastSystemEventToEveryoneExceptUserId(
        NatsMsgServerToClientEvents.USER_OFFLINE,
        roomId,
        userInfoMsg,
        userId,
      )
      .catch(() => {});

    // Stage 2: Wait a bit longer before final cleanup (30 seconds)
    await new Promise((resolve) => setTimeout(resolve, 30000));

    const finalStatus = await this.natsService
      .getCacheService()
      .getCachedRoomUserStatus(roomId, userId);
    if (finalStatus?.status === USER_STATUS_ONLINE) {
      this.logger.debug(
        `User ${userId} reconnected before final cleanup, cleanup aborted`,
      );
      return;
    }

    // Silently remove from LiveKit
    try {
      await this.livekitService.removeParticipant(roomId, userId);
    } catch (error) {
      // Ignore errors if participant already removed
    }

    // Final cleanup: Delete NATS consumer
    await this.natsConsumerService.deleteConsumer(roomId, userId).catch(() => {});
    this.logger.log(`User ${userId} offline tasks completed for room ${roomId}`);
  }
}
