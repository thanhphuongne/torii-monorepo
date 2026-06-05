/**
 * NATS System Events Service
 *
 * Handles broadcasting system events to clients via NATS JetStream
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import type { JetStreamClient } from 'nats';
import { v4 as uuidv4 } from 'uuid';
import { create, toBinary, fromJsonString } from '@bufbuild/protobuf';
import {
  NatsMsgServerToClientSchema,
  NatsMsgServerToClientEvents,
  NatsSystemNotificationSchema,
  NatsSystemNotificationTypes,
  NatsInitialDataSchema,
  MediaServerConnInfo,
  MediaServerConnInfoSchema,
  DataChannelMessageSchema,
  DataMsgBodyType,
  ChatMessage,
  ChatMessageSchema,
  NatsMsgClientToServer,
  PrivateDataDeliverySchema,
} from '@workspace/protocol';
import { fromBinary } from '@bufbuild/protobuf';
import { NatsUserInfoService } from '@server/meet/infrastructure/nats/nats-user-info.service';
import { NatsRoomService } from '@server/meet/infrastructure/nats/nats-room.service';
import { LiveKitService } from '@server/meet/infrastructure/livekit/livekit.service';
import { WajlcAuthService } from '@server/meet/modules/auth/wajlc-auth.service';
import {
  NatsUserService,
  USER_STATUS_ONLINE,
} from '@server/meet/infrastructure/nats/nats-user.service';

import { NatsService } from '@server/meet/infrastructure/nats/nats.service';
import { AppConfigService } from '@server/shared';

/**
 * NatsSystemEventsService handles system-wide event broadcasting
 */
@Injectable()
export class NatsSystemEventsService {
  private readonly logger = new Logger(NatsSystemEventsService.name);
  private js: JetStreamClient;
  private subjectSystemPublic: string;
  private subjectSystemPrivate: string;
  private subjectDataChannel: string;
  private subjectChat: string;

  constructor(
    private readonly natsService: NatsService,
    private readonly appConfig: AppConfigService,
    private readonly natsUserInfo: NatsUserInfoService,
    @Inject(forwardRef(() => NatsRoomService))
    private readonly natsRoomService: NatsRoomService,
    private readonly livekitService: LiveKitService,
    private readonly authService: WajlcAuthService,
    @Inject(forwardRef(() => NatsUserService))
    private readonly natsUserService: NatsUserService,
  ) {
    // Initialize subjects from typed config
    const { subjects } = this.appConfig.nats;
    this.subjectSystemPublic = subjects.systemPublic;
    this.subjectSystemPrivate = subjects.systemPrivate;
    this.subjectDataChannel = subjects.dataChannel;
    this.subjectChat = subjects.chat;
  }

  onModuleInit() {
    // Get JetStream client from NatsService
    // Must be done in onModuleInit because NatsService connects in its onModuleInit
    // But to be safe we can access it when needed, or check if connected
    this.js = this.natsService.getJetStream();
    if (!this.js) {
      this.logger.warn(
        'JetStream client not ready yet in constructor, will be fetched in onModuleInit or methods',
      );
    }
  }

  /**
   * BroadcastSystemEventToRoom broadcasts a system event to all clients in a room
   */
  async broadcastSystemEventToRoom(
    event: NatsMsgServerToClientEvents,
    roomId: string,
    data: any,
    toUserId?: string,
  ): Promise<void> {
    // Convert data to string message (prepareNatsServerToClientMsg logic)
    let msg: string;
    if (typeof data === 'string') {
      msg = data;
    } else if (typeof data === 'number') {
      msg = String(data);
    } else if (data instanceof Uint8Array) {
      msg = new TextDecoder().decode(data);
    } else if (typeof data === 'object' && data !== null) {
      // Treat objects as JSON, but explicitly remove $typeName if present
      // (common in Protobuf messages which should have been serialized by caller)
      const { $typeName, ...cleanData } = data;
      msg = JSON.stringify(cleanData);
    } else {
      msg = JSON.stringify(data);
    }

    const payload = create(NatsMsgServerToClientSchema, {
      id: uuidv4(),
      event: event,
      msg: msg,
    });

    const message = toBinary(NatsMsgServerToClientSchema, payload);
    const subject = toUserId
      ? `${this.subjectSystemPrivate}.${roomId}.${toUserId}.system`
      : `${this.subjectSystemPublic}.${roomId}.system`;

    try {
      const js = this.natsService.getJetStream();
      await js.publish(subject, message, {
        expect: { streamName: this.natsService.getRoomStreamName() },
      });
      this.logger.debug(
        `Relible broadcast ${NatsMsgServerToClientEvents[event]} to ${subject}`,
      );
    } catch (error) {
      this.logger.error(`Failed to broadcast event: ${error.message}`);
    }
  }

  /**
   * BroadcastSystemPubSubEventToRoom sends a public message to everyone in the room
   * using core NATS for high-performance, loss-tolerant events.
   */
  async broadcastSystemPubSubEventToRoom(
    event: NatsMsgServerToClientEvents,
    roomId: string,
    data: any,
  ): Promise<void> {
    let msg: string;
    if (typeof data === 'string') {
      msg = data;
    } else if (typeof data === 'number') {
      msg = String(data);
    } else if (data instanceof Uint8Array) {
      msg = new TextDecoder().decode(data);
    } else if (typeof data === 'object' && data !== null) {
      const { $typeName, ...cleanData } = data;
      msg = JSON.stringify(cleanData);
    } else {
      msg = JSON.stringify(data);
    }

    const payload = create(NatsMsgServerToClientSchema, {
      id: uuidv4(),
      event: event,
      msg: msg,
    });

    const message = toBinary(NatsMsgServerToClientSchema, payload);
    const subject = `${this.subjectSystemPublic}.${roomId}`;

    try {
      const nc = this.natsService.getNatsConnection();
      nc.publish(subject, message);
      this.logger.debug(
        `PubSub broadcast ${NatsMsgServerToClientEvents[event]} to ${subject}`,
      );
    } catch (error) {
      this.logger.error(`Failed to pubsub broadcast: ${error.message}`);
    }
  }

  /**
   * BroadcastSystemEventToRoomWithBinMsg sends an event with additional binary data
   */
  async broadcastSystemEventToRoomWithBinMsg(
    event: NatsMsgServerToClientEvents,
    roomId: string,
    msg: string,
    binMsg: Uint8Array,
    toUserId?: string,
  ): Promise<void> {
    const payload = create(NatsMsgServerToClientSchema, {
      id: uuidv4(),
      event: event,
      msg: msg,
      binMsg: binMsg,
    });

    const message = toBinary(NatsMsgServerToClientSchema, payload);
    const subject = toUserId
      ? `${this.subjectSystemPrivate}.${roomId}.${toUserId}.system`
      : `${this.subjectSystemPublic}.${roomId}.system`;

    try {
      const js = this.natsService.getJetStream();
      await js.publish(subject, message, {
        expect: { streamName: this.natsService.getRoomStreamName() },
      });
    } catch (error) {
      this.logger.error(`Failed to broadcast bin event: ${error.message}`);
    }
  }

  /**
   * BroadcastChatEntry broadcasts a ChatMessage entry to the room
   *
   * @param roomId - Room ID
   * @param chatMsg - ChatMessage object
   */
  async broadcastChatEntry(
    roomId: string,
    chatMsg: ChatMessage,
  ): Promise<void> {
    // Marshal to binary protobuf
    const message = toBinary(ChatMessageSchema, chatMsg);

    // Determine subject
    const subject = `${this.subjectChat}.${roomId}`;

    // Ensure JetStream client is ready
    if (!this.js) {
      this.js = this.natsService.getJetStream();
    }

    if (!this.js) {
      this.logger.warn('JetStream client not ready, cannot broadcast chat');
      return;
    }

    // Publish to NATS (Core NATS for Chat)
    try {
      const nc = this.natsService.getNatsConnection();
      nc.publish(subject, message);
      this.logger.debug(`Broadcast chat message ${chatMsg.id} to ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to broadcast chat: ${error.message}`);
      throw error;
    }
  }

  /**
   * BroadcastDataChannelMessage broadcasts a data channel message to valid users
   */
  async broadcastDataChannelMessage(
    roomId: string,
    type: DataMsgBodyType,
    msg: string, // JSON string or simple string
    fromUserId: string = 'system',
    toUserId?: string,
    isAdmin: boolean = false, // if true, can be just from 'system'
  ): Promise<void> {
    const payload = create(DataChannelMessageSchema, {
      id: uuidv4(),
      type: type,
      message: msg,
      fromUserId: fromUserId,
      // toUserId is optional in proto but good to have if directed.
      toUserId: toUserId,
    });

    const binaryMsg = toBinary(DataChannelMessageSchema, payload);

    // Subject format: {dataChannel}.{roomId}
    let subject = `${this.subjectDataChannel}.${roomId}`;
    if (toUserId) {
      subject += `.${toUserId}`;
    }

    if (!this.js) {
      this.js = this.natsService.getJetStream();
      if (!this.js) {
        this.logger.warn('JetStream client not ready');
        return;
      }
    }

    try {
      const nc = this.natsService.getNatsConnection();
      nc.publish(subject, binaryMsg);
      this.logger.debug(
        `Broadcast DataChannel msg type ${DataMsgBodyType[type]} to ${subject}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to broadcast DataChannel msg: ${error.message}`,
      );
    }
  }

  /**
   * BroadcastSystemEventToEveryoneExceptUserId broadcasts to all users except one
   *
   * @param event - Event type
   * @param roomId - Room ID
   * @param data - Event data
   * @param exceptUserId - User ID to exclude
   */
  async broadcastSystemEventToEveryoneExceptUserId(
    event: NatsMsgServerToClientEvents,
    roomId: string,
    data: any,
    exceptUserId: string,
  ): Promise<void> {
    // Get online users from cache first (much faster)
    let userIds = this.natsService
      .getCacheService()
      .getUsersIdFromRoomStatusBucket(roomId, USER_STATUS_ONLINE);

    if (userIds.length === 0) {
      // Fallback to KV only if cache is empty - might be a new room or slow watcher
      userIds = await this.natsUserInfo.getOnlineUsersId(roomId);
    }

    if (!userIds || userIds.length === 0) {
      return;
    }

    // Send to each user except the excluded one
    // We do this non-blocking
    userIds
      .filter((id) => id !== exceptUserId)
      .forEach((id) => {
        this.broadcastSystemEventToRoom(event, roomId, data, id).catch(
          (error) => {
            this.logger.error(
              `Failed to broadcast to user ${id}: ${error.message}`,
            );
          },
        );
      });
  }

  /**
   * BroadcastSystemNotificationToRoom sends a notification to room
   *
   * @param roomId - Room ID
   * @param msg - Notification message
   * @param msgType - Notification type (INFO, WARNING, ERROR)
   * @param withSound - Whether to play sound
   * @param userId - Optional user ID for private notification
   */
  async broadcastSystemNotificationToRoom(
    roomId: string,
    msg: string,
    msgType: NatsSystemNotificationTypes,
    withSound: boolean,
    userId?: string,
  ): Promise<void> {
    const notification = create(NatsSystemNotificationSchema, {
      id: uuidv4(),
      type: msgType,
      msg: msg,
      sentAt: Date.now().toString(), // Convert to string for int64
      withSound: withSound,
    });

    // Convert to JSON string
    const jsonStr = this.natsService.marshalToProtoJson(
      notification,
      NatsSystemNotificationSchema,
    );

    await this.broadcastSystemEventToRoom(
      NatsMsgServerToClientEvents.SYSTEM_NOTIFICATION,
      roomId,
      jsonStr,
      userId,
    );
  }

  /**
   * NotifyInfoMsg sends an info notification
   */
  async notifyInfoMsg(
    roomId: string,
    msg: string,
    withSound: boolean,
    userId?: string,
  ): Promise<void> {
    await this.broadcastSystemNotificationToRoom(
      roomId,
      msg,
      NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_INFO,
      withSound,
      userId,
    );
  }

  /**
   * NotifyWarningMsg sends a warning notification
   */
  async notifyWarningMsg(
    roomId: string,
    msg: string,
    withSound: boolean,
    userId?: string,
  ): Promise<void> {
    await this.broadcastSystemNotificationToRoom(
      roomId,
      msg,
      NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_WARNING,
      withSound,
      userId,
    );
  }

  /**
   * NotifyErrorMsg sends an error notification
   */
  async notifyErrorMsg(
    roomId: string,
    msg: string,
    userId?: string,
  ): Promise<void> {
    await this.broadcastSystemNotificationToRoom(
      roomId,
      msg,
      NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_ERROR,
      true, // always with sound
      userId,
    );
  }

  /**
   * HandleInitialData handles Request for Initial Data
   */
  async handleInitialData(roomId: string, userId: string): Promise<void> {
    this.logger.debug(
      `Handling initial data request for room ${roomId}, user ${userId}`,
    );

    // 1. Get Room Info
    const rInfo = await this.natsRoomService.getRoomInfo(roomId);
    if (!rInfo) {
      this.logger.error(`Room info not found for ${roomId}`);
      await this.notifyErrorMsg(roomId, 'Không tìm thấy thông tin phòng.', userId);
      return;
    }

    // 2. Get User Info
    const userInfo = await this.natsUserInfo.getUserInfo(roomId, userId);
    if (!userInfo) {
      this.logger.error(`User info not found for ${userId} in room ${roomId}`);
      await this.notifyErrorMsg(roomId, 'Không tìm thấy người dùng.', userId);
      return;
    }

    // 3. Create Response
    const initialData = create(NatsInitialDataSchema, {
      room: rInfo,
      localUser: userInfo,
    });

    // 4. Send Response
    // Use marshalToProtoJson for consistent Protobuf JSON serialization
    await this.broadcastSystemEventToRoom(
      NatsMsgServerToClientEvents.RES_INITIAL_DATA,
      roomId,
      this.natsService.marshalToProtoJson(initialData, NatsInitialDataSchema),
      userId,
    );
  }

  /**
   * HandleSendUsersList handles Request for users list
   */
  async handleSendUsersList(
    roomId: string,
    userId: string,
    event: NatsMsgServerToClientEvents = NatsMsgServerToClientEvents.RES_JOINED_USERS_LIST,
  ): Promise<void> {
    this.logger.debug(
      `Handling users list request for room ${roomId}, user ${userId}, event ${NatsMsgServerToClientEvents[event]}`,
    );

    try {
      const usersJson =
        await this.natsUserInfo.getOnlineUsersListAsJson(roomId);
      if (usersJson) {
        await this.broadcastSystemEventToRoom(event, roomId, usersJson, userId);
      }
    } catch (error) {
      this.logger.error(`Failed to get online users list: ${error.message}`);
    }
  }

  /**
   * HandleMediaServerInfo handles Request for media server info (LiveKit token)
   */
  async handleMediaServerInfo(
    roomId: string,
    userId: string,
    userInfo?: any,
    broadcast: boolean = false,
  ): Promise<MediaServerConnInfo | undefined> {
    // Get user info if not provided
    if (!userInfo) {
      const info = await this.natsUserInfo.getUserInfo(roomId, userId);
      if (!info) {
        this.logger.error(
          `User info not found for ${userId} in room ${roomId}`,
        );
        await this.notifyErrorMsg(roomId, 'Không tìm thấy người dùng.', userId);
        return undefined;
      }
      userInfo = info;
    }

    // Generate LiveKit Token
    let token: string;
    try {
      token = await this.livekitService.generateLivekitToken(roomId, userInfo);
    } catch (error) {
      this.logger.error(`Failed to generate livekit token: ${error.message}`);
      await this.notifyErrorMsg(roomId, error.message, userId);
      return undefined;
    }

    // Get LiveKit WebSocket URL for client browser connection
    let lkHost = this.appConfig.livekit.wsUrl;
    if (lkHost.includes('host.docker.internal')) {
      lkHost = lkHost.replace('host.docker.internal', 'localhost');
    }

    const data = create(MediaServerConnInfoSchema, {
      url: lkHost,
      token: token,
    });

    // DEBUG: Log the actual data being sent to client
    this.logger.log(
      `[MediaServerInfo] Sending to user ${userId}: url=${lkHost}, token_length=${token.length}`,
    );

    if (broadcast) {
      // Convert to JSON string using proper Protobuf marshal options
      const msg = this.natsService.marshalToProtoJson(
        data,
        MediaServerConnInfoSchema,
      );
      await this.broadcastSystemEventToRoom(
        NatsMsgServerToClientEvents.RES_MEDIA_SERVER_DATA,
        roomId,
        msg,
        userId,
      );
    }

    return data;
  }

  /**
     * HandleClientPing handles PING from client

     */
  async handleClientPing(roomId: string, userId: string): Promise<void> {
    // Check user status via NatsUserService (circular dependency handled with forwardRef)

    await this.natsUserService.onAfterUserJoined(roomId, userId);

    // Update last ping time

    const now = Date.now().toString();
    try {
      await this.natsUserInfo.updateUserKeyValue(
        roomId,
        userId,
        'last_ping_at',
        now,
      );
    } catch (error) {
      this.logger.error(
        `Error updating user last ping for ${userId}: ${error.message}`,
      );
    }
  }

  /**
   * RenewWajlcToken handles token renewal request
   */
  async renewWajlcToken(
    roomId: string,
    userId: string,
    currentToken: string,
  ): Promise<void> {
    try {
      const newToken = await this.authService.renewWajlcToken(currentToken);

      await this.broadcastSystemEventToRoom(
        NatsMsgServerToClientEvents.RESP_RENEW_WAJLC_TOKEN,
        roomId,
        newToken,
        userId,
      );
    } catch (error) {
      this.logger.error(
        `Error renewing WAJLC token for ${userId}: ${error.message}`,
      );
    }
  }

  /**
   * HandleToDeliveryPrivateData handles delivery of private data between users
   */
  async handleToDeliveryPrivateData(
    roomId: string,
    userId: string,
    req: NatsMsgClientToServer,
  ): Promise<void> {
    try {
      // Unmarshal header from JSON msg using schema
      const header = fromJsonString(PrivateDataDeliverySchema, req.msg);
      const toUserId = header.toUserId;

      if (!toUserId) {
        this.logger.warn('Private data delivery: toUserId is missing');
        return;
      }

      // Send to target user
      // Note: We use req.binMsg directly
      await this.broadcastSystemEventToRoomWithBinMsg(
        NatsMsgServerToClientEvents.DELIVERY_PRIVATE_DATA,
        roomId,
        req.msg,
        req.binMsg,
        toUserId,
      );

      // Echo back to sender if requested
      if (header.echoToSender) {
        await this.broadcastSystemEventToRoomWithBinMsg(
          NatsMsgServerToClientEvents.DELIVERY_PRIVATE_DATA,
          roomId,
          req.msg,
          req.binMsg,
          userId,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to deliver private data: ${error.message}`);
    }
  }
}
