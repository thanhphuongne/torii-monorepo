/**
 * Room User Service
 * Handles user/participant operations within rooms
 */

import { Injectable, Logger } from '@nestjs/common';
import { RoomInfoService } from './room-info.service';
import { LiveKitService } from '@server/meet/infrastructure/livekit/livekit.service';
import { NatsUserInfoService } from '@server/meet/infrastructure/nats/nats-user-info.service';
import { NatsUserService } from '@server/meet/infrastructure/nats/nats-user.service';
import { NatsSystemEventsService } from '@server/meet/infrastructure/nats/nats-system-events.service';
import { RedisLockService } from '@server/meet/infrastructure/redis/redis-lock.service';
import { waitUntilRoomCreationCompletes } from './room-lock.helper';
import {
  SwitchPresenterTask,
  NatsMsgServerToClientEvents,
  TrackSource,
  ParticipantInfo_State,
  LockSettingsSchema,
} from '@workspace/protocol';
import { v4 as uuidv4 } from 'uuid';
import { create } from '@bufbuild/protobuf';
import { NatsRoomService } from '@server/meet/infrastructure/nats/nats-room.service';
import { NatsRoomEventsService } from '@server/meet/infrastructure/nats/nats-room-events.service';
import { WajlcAuthService } from '@server/meet/modules/auth/wajlc-auth.service';
import { AnalyticsService } from '@server/meet/modules/analytics/analytics.service';
import {
  AnalyticsDataMsgSchema,
  AnalyticsEventType,
  AnalyticsEvents,
} from '@workspace/protocol';

/**
 * RoomUserService handles business logic for user operations within rooms
 */
@Injectable()
export class RoomUserService {
  private readonly logger = new Logger(RoomUserService.name);

  constructor(
    private readonly roomInfoService: RoomInfoService,
    private readonly livekitService: LiveKitService,
    private readonly natsUserInfo: NatsUserInfoService,
    private readonly natsUser: NatsUserService,
    private readonly natsSystemEvents: NatsSystemEventsService,
    private readonly redisLock: RedisLockService,
    private readonly natsRoom: NatsRoomService,
    private readonly natsRoomEvents: NatsRoomEventsService,
    private readonly authService: WajlcAuthService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /**
   * Check if user is in block list
   */
  async isUserInBlockList(roomId: string, userId: string): Promise<boolean> {
    this.logger.log(
      `Checking if user is in block list: ${userId} in room ${roomId}`,
    );

    try {
      const isBlocked = await this.natsUserInfo.isUserExistInBlockList(
        roomId,
        userId,
      );
      this.logger.log(
        `Block list check result: ${userId} blocked=${isBlocked}`,
      );
      return isBlocked;
    } catch (error) {
      this.logger.error(`Error checking block list: ${error.message}`);
      return false;
    }
  }

  /**
   * Get user online status
   */
  async getUserStatus(roomId: string, userId: string): Promise<string> {
    // Use NATS user info service to follow logic: cache → KV lookup → watcher
    return this.natsUserInfo.getRoomUserStatus(roomId, userId);
  }

  /**
   * Get online users count
   */
  async getOnlineUsersCount(roomId: string): Promise<number> {
    const userIds = await this.natsUserInfo.getOnlineUsersId(roomId);
    return userIds.length;
  }

  /**
   * Generate Wajlc join token for a user
   *
   * This is the main entry point for users joining a room
   */
  async getWajlcJoinToken(req: any): Promise<{ token: string }> {
    const roomId = req.roomId;
    const userId = req.userInfo?.userId;
    const userName = req.userInfo?.name;
    const isAdmin = req.userInfo?.isAdmin || false;

    this.logger.log(
      `Request to generate join token: room=${roomId}, user=${userId}, name=${userName}, admin=${isAdmin}`,
    );

    try {
      // Step 1: Wait until any ongoing room creation process is complete to avoid race conditions
      await waitUntilRoomCreationCompletes(this.redisLock, roomId, this.logger);

      // Step 2: Validate the user's name to prevent conflicts with reserved system names
      const RECORDER_USER_AUTH_NAME = 'WAJLC_RECORDER_AUTH';
      if (userName === RECORDER_USER_AUTH_NAME) {
        throw new Error(
          `Tên ${RECORDER_USER_AUTH_NAME} được dành cho hệ thống`,
        );
      }
      // Logic for internal user ID check (internal users like system bots)
      if (this.isUserIdInternal(userId)) {
        throw new Error(`user_id ${userId} được dành cho hệ thống`);
      }

      // Step 3: Fetch the current room information and metadata from NATS
      const roomInfo = await this.natsRoom.getRoomInfoWithMetadata(roomId);
      if (!roomInfo || !roomInfo.metadata) {
        throw new Error('Không tìm thấy thông tin phòng hợp lệ');
      }

      const rInfo = roomInfo.info;
      const meta = roomInfo.metadata;

      // Step 4: Ensure the room is not in an ended state
      if (rInfo?.status === 'ended') {
        throw new Error('Phòng đã kết thúc, cần tạo lại phòng');
      }

      // Step 5: Initialize user metadata if not provided
      if (!req.userInfo.userMetadata) {
        req.userInfo.userMetadata = {};
      }

      // If no external user ID is provided, use the internal user ID as the default
      if (
        !req.userInfo.userMetadata.exUserId ||
        req.userInfo.userMetadata.exUserId === ''
      ) {
        req.userInfo.userMetadata.exUserId = userId;
      }

      // Step 6: Handle user ID generation and duplicate user checks
      const RECORDER_BOT = 'RECORDER_BOT';
      const RTMP_BOT = 'RTMP_BOT';

      if (meta.roomFeatures?.autoGenUserId) {
        // Auto-generate user ID (except for bots)
        if (
          req.userInfo.userId !== 'RECORDER_BOT' &&
          req.userInfo.userId !== 'RTMP_BOT'
        ) {
          const newUserId = uuidv4();
          this.logger.log(
            `Room has auto-gen userId enabled, assigning: ${newUserId} (ex: ${req.userInfo.userMetadata.exUserId})`,
          );
          req.userInfo.userId = newUserId;
        }
      } else {
        // Check if user with same ID is already online
        const status = await this.natsUserInfo.getRoomUserStatus(
          roomId,
          req.userInfo.userId,
        );
        if (status === 'online') {
          this.logger.warn(
            'Same user found in online status, removing before re-generating token',
          );

          // Remove the existing participant
          await this.handleRemoveParticipant({
            sid: roomId,
            roomId: roomId,
            userId: req.userInfo.userId,
            msg: 'Phiên cũ bị ngắt vì cùng tài khoản đã tham gia từ nơi khác.',
          });

          // Wait for user to be fully offline
          await this.waitForUserToBeOffline(roomId, req.userInfo.userId);
        }
      }

      // Step 7: Validate the format of the final user ID
      const validUserIdRegex = /^[a-zA-Z0-9-_]+$/;
      if (!validUserIdRegex.test(req.userInfo.userId)) {
        throw new Error(
          'user_id chỉ được gồm chữ ASCII (a-z, A-Z), số (0-9) hoặc - _',
        );
      }
      // Add an extra check to ensure our chosen separator pattern is not present.
      // Assuming UserKeyFieldPrefix is 'field_' (implied by context of NATS keys)
      if (req.userInfo.userId.includes('field_')) {
        throw new Error("user_id không được chứa mẫu dành riêng 'field_'");
      }
      // Assuming UserKeyPrefix is 'user_'
      if (req.userInfo.userId.startsWith('user_')) {
        throw new Error(
          "user_id không được bắt đầu bằng mẫu dành riêng 'user_'",
        );
      }

      // Step 8: Assign permissions and lock settings based on whether the user is an admin
      if (isAdmin) {
        req.userInfo.userMetadata.isAdmin = true;
        req.userInfo.userMetadata.waitForApproval = false;

        // Check current room users to make presenter
        await this.createNewPresenter(req);

        // By default, no lock for admin user
        req.userInfo.userMetadata.lockSettings = create(LockSettingsSchema, {});

        // Except for whiteboard (follows room settings for non-presenter)
        if (!req.userInfo.userMetadata.isPresenter) {
          req.userInfo.userMetadata.lockSettings.lockWhiteboard =
            meta.defaultLockSettings?.lockWhiteboard || false;
        }
      } else {
        // Assign lock settings to user
        this.assignLockSettingsToUser(meta, req);

        // If waiting room features active, require approval
        if (meta.roomFeatures?.waitingRoomFeatures?.isActive) {
          req.userInfo.userMetadata.waitForApproval = true;
        }
      }

      if (req.userInfo.userMetadata.recordWebcam === undefined) {
        req.userInfo.userMetadata.recordWebcam = true;
      }

      // Step 9: Add the user's information to the NATS key-value store
      await this.natsUser.addUser(
        roomId,
        req.userInfo.userId,
        req.userInfo.name,
        req.userInfo.isAdmin || false,
        req.userInfo.userMetadata.isPresenter || false,
        req.userInfo.userMetadata,
      );

      // Step 10: Generate and return the final JWT token
      const token = this.authService.generateWajlcJoinToken({
        name: req.userInfo.name,
        userId: req.userInfo.userId,
        roomId: roomId,
        isAdmin: req.userInfo.isAdmin,
        isHidden: req.userInfo.isHidden || false,
      });

      this.logger.log('Successfully generated Wajlc join token');

      return { token };
    } catch (error) {
      this.logger.error(`Failed to generate join token: ${error.message}`);
      throw error;
    }
  }

  /**
     * Wait for user to be offline

     */
  private async waitForUserToBeOffline(
    roomId: string,
    userId: string,
  ): Promise<void> {
    const maxWaitMs = 5000; // 5 seconds
    const pollIntervalMs = 200; // 200ms
    const startTime = Date.now();

    this.logger.log(
      `Waiting for user ${userId} to be offline in room ${roomId}`,
    );

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const status = await this.natsUserInfo.getRoomUserStatus(
          roomId,
          userId,
        );
        if (status !== 'online') {
          this.logger.log(`User is now offline, status: ${status}`);
          return;
        }
      } catch (error) {
        // Error (e.g., key not found) implies user is gone
        this.logger.log('User is offline (key not found)');
        return;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    this.logger.warn('Timed out waiting for user to go offline');
  }

  /**
   * Check if user ID is internal
   */
  private isUserIdInternal(userId: string): boolean {
    // Internal user IDs are reserved for system bots and agents.
    return (
      userId.startsWith('ingres_') ||
      userId.startsWith('wajlc_agent-') ||
      userId.startsWith('wajlc_tts_agent-') ||
      userId.startsWith('sip_') ||
      userId === 'RECORDER_BOT' ||
      userId === 'RTMP_BOT' ||
      userId === 'system'
    );
  }

  /**
     * Assign lock settings to user (for non-admin users during join)

     */
  private assignLockSettingsToUser(meta: any, req: any): void {
    if (!req.userInfo.userMetadata.lockSettings) {
      req.userInfo.userMetadata.lockSettings = create(LockSettingsSchema, {});
    }
    if (!meta.defaultLockSettings) {
      return;
    }
    this.applyDefaultLockSettings(
      meta.defaultLockSettings,
      req.userInfo.userMetadata.lockSettings,
    );
  }

  /**
     * Apply default lock settings using property merging

     */
  private applyDefaultLockSettings(defaultLocks: any, userLocks: any): void {
    // Merge default lock settings into user lock settings
    // Only set fields that are null/undefined in userLocks
    for (const key in defaultLocks) {
      if (defaultLocks[key] !== undefined && userLocks[key] === undefined) {
        userLocks[key] = defaultLocks[key];
      }
    }
  }

  /**
     * Update user lock settings

     */
  async updateUserLockSettings(data: {
    roomId: string;
    userId: string;
    service: string;
    direction: 'lock' | 'unlock';
    requestedUserId?: string;
  }): Promise<{ status: boolean; msg: string }> {
    this.logger.log(
      `Updating lock settings: room=${data.roomId}, user=${data.userId}, service=${data.service}, direction=${data.direction}`,
    );

    try {
      if (data.userId === 'all') {
        // Handle batch update for entire room
        await this.handleUpdateAllUsersLockSettings(data);
        return { status: true, msg: 'Đã cập nhật khóa cho tất cả người tham gia.' };
      } else {
        // For a single user, perform the update and broadcast immediately
        this.logger.log('Request to update single user lock settings');
        await this.updateAndBroadcastUserLock(
          data.roomId,
          data.userId,
          data.service,
          data.direction,
        );
        return { status: true, msg: 'Đã cập nhật khóa cho người tham gia.' };
      }
    } catch (error) {
      this.logger.error(
        `Failed to update user lock settings: ${error.message}`,
      );
      return { status: false, msg: error.message };
    }
  }

  /**
     * Handle update for all users in room

     */
  private async handleUpdateAllUsersLockSettings(data: {
    roomId: string;
    service: string;
    direction: string;
    requestedUserId?: string;
  }): Promise<void> {
    this.logger.log('Request to update all users lock settings');

    // First, update the room's default settings for any future users
    try {
      await this.updateDefaultRoomLockSettings(data);
    } catch (error) {
      // Log the error but continue, as updating existing users is also important
      this.logger.error(
        `Failed to update default room lock settings: ${error.message}`,
      );
    }

    // Get the list of all online users to update them
    const userIds = await this.natsUserInfo.getOnlineUsersId(data.roomId);

    for (const userId of userIds) {
      if (userId === data.requestedUserId) {
        // nothing for requested user (admin making the change)
        continue;
      }

      try {
        await this.updateAndBroadcastUserLock(
          data.roomId,
          userId,
          data.service,
          data.direction,
        );
      } catch (error) {
        this.logger.error(
          `Failed to update user ${userId} lock settings during all-user change: ${error.message}`,
        );
      }
    }
  }

  /**
     * Update and broadcast user lock - the single, reusable worker function

     */
  private async updateAndBroadcastUserLock(
    roomId: string,
    userId: string,
    service: string,
    direction: string,
  ): Promise<void> {
    // Get user metadata
    const metadata = await this.natsUserInfo.getUserMetadataStruct(
      roomId,
      userId,
    );
    if (!metadata) {
      throw new Error('Không tìm thấy metadata người dùng');
    }

    // No lock for admin (except whiteboard)
    if (metadata.isAdmin && service !== 'whiteboard') {
      return;
    }

    // Apply the new setting to the struct
    this.assignNewLockSetting(service, direction, metadata.lockSettings);

    // Persist the change and notify the clients
    await this.natsUser.updateAndBroadcastUserMetadata(
      roomId,
      userId,
      metadata,
      undefined,
    );
  }

  /**
     * Update default room lock settings for future users

     */
  private async updateDefaultRoomLockSettings(data: {
    roomId: string;
    service: string;
    direction: string;
  }): Promise<void> {
    // Get room metadata
    const metadata = await this.natsRoom.getRoomMetadataStruct(data.roomId);
    if (!metadata) {
      throw new Error('Thông tin metadata phòng không hợp lệ hoặc trống');
    }

    // Update default lock settings
    this.assignNewLockSetting(
      data.service,
      data.direction,
      metadata.defaultLockSettings,
    );

    // Update the room metadata and broadcast the change
    await this.natsRoomEvents.updateAndBroadcastRoomMetadata(
      data.roomId,
      metadata,
    );
  }

  /**
     * Lock setting map - maps service strings to lock setting fields

     */
  private readonly lockSettingMap: Record<
    string,
    (lockSettings: any, val: boolean) => void
  > = {
    mic: (l, val) => (l.lockMicrophone = val),
    webcam: (l, val) => (l.lockWebcam = val),
    screenShare: (l, val) => (l.lockScreenSharing = val),
    chat: (l, val) => (l.lockChat = val),
    sendChatMsg: (l, val) => (l.lockChatSendMessage = val),
    chatFile: (l, val) => (l.lockChatFileShare = val),
    privateChat: (l, val) => (l.lockPrivateChat = val),
    whiteboard: (l, val) => (l.lockWhiteboard = val),
    sharedNotepad: (l, val) => (l.lockSharedNotepad = val),
  };

  /**
     * Assign new lock setting

     */
  private assignNewLockSetting(
    service: string,
    direction: string,
    lockSettings: any,
  ): void {
    const setter = this.lockSettingMap[service];
    if (setter) {
      const lock = direction === 'lock';
      setter(lockSettings, lock);
    }
  }

  /**
   * Mute/unmute user track
   *
   * If trackSid not provided, will find microphone track automatically
   */
  async handleMuteUnMuteTrack(data: {
    roomId: string;
    userId: string;
    trackSid?: string;
    muted: boolean;
    requestedUserId?: string;
  }): Promise<{ status: boolean; msg: string }> {
    this.logger.log(
      `Request to mute/unmute track: room=${data.roomId}, user=${data.userId}, muted=${data.muted}`,
    );

    try {
      // Handle "all" users case
      if (data.userId === 'all') {
        await this.muteUnmuteAllMic(data);
        return { status: true, msg: 'Đã tắt/bật mic cho tất cả người tham gia.' };
      }

      // Step 1: Load participant info from LiveKit
      const participant = await this.livekitService.loadParticipantInfo(
        data.roomId,
        data.userId,
      );

      // Step 2: Verify participant exists and is ACTIVE
      if (!participant || participant.state !== ParticipantInfo_State.ACTIVE) {
        // ✅ Using LiveKit enum
        this.logger.warn('Participant not found or not active');
        return { status: false, msg: 'Người dùng không hoạt động' };
      }

      // Step 3: Find track SID if not provided (auto-find microphone)
      let trackSid = data.trackSid;

      if (!trackSid) {
        this.logger.log('No trackSid provided, searching for microphone track');
        for (const track of participant.tracks || []) {
          if (track.source === TrackSource.MICROPHONE) {
            // ✅ Using LiveKit enum
            trackSid = track.sid;
            this.logger.log(`Found microphone track: ${trackSid}`);
            break;
          }
        }
      }

      if (!trackSid) {
        return { status: false, msg: 'Không tìm thấy track phù hợp để tắt/bật tiếng' };
      }

      // Step 4: Mute/unmute the track via LiveKit
      await this.livekitService.muteUnMuteTrack(
        data.roomId,
        data.userId,
        trackSid,
        data.muted,
      );

      this.logger.log('Successfully muted/unmuted track');
      return { status: true, msg: 'Đã cập nhật trạng thái tắt/bật tiếng.' };
    } catch (error) {
      this.logger.error(`Failed to mute/unmute track: ${error.message}`);
      return { status: false, msg: error.message };
    }
  }

  /**
     * Mute/unmute all microphones in room

     */
  private async muteUnmuteAllMic(data: {
    roomId: string;
    muted: boolean;
    requestedUserId?: string;
  }): Promise<void> {
    this.logger.log('Request to mute/unmute all microphones');

    // Load all participants in the room
    const participants = await this.livekitService.loadParticipants(
      data.roomId,
    );

    if (!participants || participants.length === 0) {
      throw new Error('Không có người dùng đang hoạt động');
    }

    // Mute/unmute each participant's microphone
    for (const participant of participants) {
      // Skip the admin who requested the action
      if (participant.identity === data.requestedUserId) {
        continue;
      }

      // Only process active participants
      if (participant.state !== ParticipantInfo_State.ACTIVE) {
        // ✅ Using LiveKit enum
        continue;
      }

      // Find and mute/unmute microphone track
      for (const track of participant.tracks || []) {
        if (track.source === TrackSource.MICROPHONE) {
          // ✅ Using LiveKit enum
          try {
            await this.livekitService.muteUnMuteTrack(
              data.roomId,
              participant.identity,
              track.sid,
              data.muted,
            );
            this.logger.log(
              `${data.muted ? 'Muted' : 'Unmuted'} microphone for ${participant.identity}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to mute/unmute track for ${participant.identity}: ${error.message}`,
            );
          }
          break; // Only one microphone track per participant
        }
      }
    }

    this.logger.log(
      'Successfully processed mute/unmute all microphones request',
    );
  }

  /**
   * Remove participant from room
   *
   * Removes a participant from the room, with option to block them from rejoining.
   */
  async handleRemoveParticipant(data: {
    sid: string;
    roomId: string;
    userId: string;
    msg?: string;
    blockUser?: boolean;
  }): Promise<{ status: boolean; msg: string }> {
    this.logger.log(
      `Removing participant: ${data.userId} from room ${data.roomId}`,
    );

    try {
      // Step 1: Check if user is online
      const status = await this.natsUserInfo.getRoomUserStatus(
        data.roomId,
        data.userId,
      );
      if (status !== 'online') {
        this.logger.warn('User not online');
        return { status: false, msg: 'Người dùng không hoạt động' };
      }

      // Step 2: Notify user with error message
      if (data.msg) {
        try {
          await this.natsSystemEvents.notifyErrorMsg(
            data.roomId,
            data.msg,
            data.userId,
          );
        } catch (error) {
          this.logger.error(
            `Error notifying user with custom message: ${error.message}`,
          );
        }
      }

      // Step 3: Broadcast SESSION_ENDED event
      try {
        await this.natsSystemEvents.broadcastSystemEventToRoom(
          NatsMsgServerToClientEvents.SESSION_ENDED,
          data.roomId,
          'Bạn đã bị đưa ra khỏi phòng.',
          data.userId,
        );
      } catch (error) {
        this.logger.error(
          `Error broadcasting SESSION_ENDED event: ${error.message}`,
        );
      }

      // Step 4: Remove participant from LiveKit
      try {
        await this.livekitService.removeParticipant(data.roomId, data.userId);
      } catch (error) {
        this.logger.error(
          `Error removing user from livekit, keep continuing: ${error.message}`,
        );
      }

      // Step 5: Block user if requested
      if (data.blockUser) {
        this.logger.log('Blocking user');
        try {
          await this.natsUser.addUserToBlockList(data.roomId, data.userId);
        } catch (error) {
          this.logger.error(
            `Error adding user to block list: ${error.message}`,
          );
        }
      }

      this.logger.log('Participant removed successfully');
      return { status: true, msg: 'Đã đưa người tham gia ra khỏi phòng thành công.' };
    } catch (error) {
      this.logger.error(`Error removing participant: ${error.message}`);
      return { status: false, msg: error.message };
    }
  }

  /**
     * Switch presenter in room

     */
  async handleSwitchPresenter(data: {
    roomId: string;
    userId: string;
    requestedUserId: string;
    task: SwitchPresenterTask;
  }): Promise<{ status: boolean; msg: string }> {
    this.logger.log(
      `Switching presenter in room: ${data.roomId}, task: ${data.task}`,
    );

    try {
      await this.switchPresenter(data);
      return { status: true, msg: 'Đã chuyển người trình bày thành công.' };
    } catch (error) {
      this.logger.error(`Failed to switch presenter: ${error.message}`);
      return { status: false, msg: error.message };
    }
  }

  /**
     * Create new presenter - verify if any presenter already online or not
     * If not, promote requested admin to be presenter

     */
  private async createNewPresenter(req: any): Promise<void> {
    const roomId = req.roomId;
    const userId = req.userInfo.userId;

    this.logger.log(
      `Request to check for new presenter: room=${roomId}, user=${userId}`,
    );

    // Find current presenter
    const presenter = await this.findCurrentPresenter(roomId);
    if (presenter) {
      this.logger.log(
        `Session already has an online presenter (${presenter}), skipping`,
      );
      return;
    }

    // No presenter found, make this user presenter
    this.logger.log('No presenter found, making this user presenter');
    req.userInfo.userMetadata.isPresenter = true;
  }

  /**
     * Switch presenter - promotes the new presenter BEFORE demoting the old one
     * Ensures room is never left without a presenter

     */
  private async switchPresenter(req: {
    roomId: string;
    userId: string;
    requestedUserId: string;
    task: SwitchPresenterTask;
  }): Promise<void> {
    this.logger.log(
      `Request to switch presenter: room=${req.roomId}, userId=${req.userId}, task=${req.task}`,
    );

    let newPresenterId: string;
    let oldPresenterId: string = '';

    if (req.task === SwitchPresenterTask.PROMOTE) {
      newPresenterId = req.userId;
      // Find the current presenter so we can demote them later
      try {
        const currentPresenter = await this.findCurrentPresenter(req.roomId);
        oldPresenterId = currentPresenter || '';
      } catch (error) {
        this.logger.warn(
          `Could not find current presenter to demote: ${error.message}`,
        );
      }
    } else if (req.task === SwitchPresenterTask.DEMOTE) {
      oldPresenterId = req.userId;
      // The admin making the request is the safe fallback to prevent a presenter-less room
      newPresenterId = req.requestedUserId;
    } else {
      throw new Error(`Tác vụ không hợp lệ: ${req.task}`);
    }

    // Step 1: Promote the new presenter first
    try {
      await this.updatePresenterStatus(req.roomId, newPresenterId, true);
    } catch (error) {
      // If we can't even promote the new presenter, we must stop
      this.logger.error(
        `Failed to promote new presenter ${newPresenterId}: ${error.message}`,
      );
      throw error;
    }

    // Step 2: Only after successful promotion, demote the old presenter
    // Ensure we don't accidentally demote the person we just promoted
    if (oldPresenterId && oldPresenterId !== newPresenterId) {
      try {
        await this.updatePresenterStatus(req.roomId, oldPresenterId, false);
      } catch (error) {
        // This is not a fatal error. The room now has two presenters,
        // which is better than zero. We should log it as a warning.
        this.logger.warn(
          `Successfully promoted new presenter but failed to demote old one (${oldPresenterId}): ${error.message}`,
        );
      }
    }

    this.logger.log('Presenter switch process completed successfully');
  }

  /**
     * Find current presenter - check all online users to find the current presenter

     */
  private async findCurrentPresenter(roomId: string): Promise<string | null> {
    // Get online users
    const userIds = await this.natsUserInfo.getOnlineUsersId(roomId);
    if (!userIds || userIds.length === 0) {
      return null;
    }

    // Check each user to find presenter
    for (const userId of userIds) {
      const isPresenter = await this.natsUserInfo.isUserPresenter(
        roomId,
        userId,
      );
      if (isPresenter) {
        return userId;
      }
    }

    return null; // No presenter found
  }

  /**
   * Update presenter status - performs the complete, two-step update for a user's presenter status
   */
  private async updatePresenterStatus(
    roomId: string,
    userId: string,
    isPresenter: boolean,
  ): Promise<void> {
    // Step 1: Update the primary Key-Value store first
    try {
      await this.natsUser.updateUserKeyValue(
        roomId,
        userId,
        'is_presenter',
        String(isPresenter),
      );
    } catch (error) {
      throw new Error(
        `Cập nhật key-value cho ${userId} thất bại: ${error.message}`,
      );
    }

    // Step 2: Fetch the current metadata, update it, and then broadcast the change to clients
    let metadata;
    try {
      metadata = await this.natsUserInfo.getUserMetadataStruct(roomId, userId);
    } catch (error) {
      throw new Error(
        `Không lấy được metadata người dùng ${userId}: ${error.message}`,
      );
    }

    if (!metadata) {
      throw new Error(`Không có metadata cho người dùng ${userId}`);
    }

    // Update metadata
    metadata.isPresenter = isPresenter;

    // Broadcast the change
    try {
      await this.natsUser.updateAndBroadcastUserMetadata(
        roomId,
        userId,
        metadata,
        undefined,
      );
    } catch (error) {
      throw new Error(
        `Cập nhật và phát metadata cho ${userId} thất bại: ${error.message}`,
      );
    }

    this.logger.log(
      `Successfully set is_presenter=${isPresenter} for user ${userId} and broadcasted change`,
    );
  }

  /**
   * RaisedHand - User raises hand
   */
  async raisedHand(roomId: string, userId: string, msg: string): Promise<void> {
    this.logger.log(`User raised hand: ${userId} in room ${roomId}`);

    try {
      // Get user metadata
      const metadata = await this.natsUserInfo.getUserMetadataStruct(
        roomId,
        userId,
      );
      if (!metadata) {
        this.logger.warn(`User metadata not found for ${userId}`);
        return;
      }

      // Update raised hand status
      metadata.raisedHand = true;

      // Update and broadcast
      await this.natsUser.updateAndBroadcastUserMetadata(
        roomId,
        userId,
        metadata,
        undefined,
      );

      // Notify all admins (except the user who raised hand)
      const participants = await this.natsUserInfo.getOnlineUsersList(roomId);
      if (participants) {
        for (const participant of participants) {
          if (participant.isAdmin && participant.userId !== userId) {
            await this.natsSystemEvents.notifyInfoMsg(
              roomId,
              msg,
              true,
              participant.userId,
            );
          }
        }
      }

      // Analytics
      await this.analyticsService.handleEvent(
        create(AnalyticsDataMsgSchema, {
          eventType: AnalyticsEventType.USER,
          eventName: AnalyticsEvents.ANALYTICS_EVENT_USER_RAISE_HAND,
          roomId: roomId,
          userId: userId,
        }),
      );

      this.logger.log(`Hand raised successfully for ${userId}`);
    } catch (error) {
      this.logger.error(`Error raising hand for ${userId}: ${error.message}`);
    }
  }

  /**
   * LowerHand - Lower raised hand
   */
  async lowerHand(roomId: string, userId: string): Promise<void> {
    this.logger.log(`Lowering hand for user: ${userId} in room ${roomId}`);

    try {
      // Get user metadata
      const metadata = await this.natsUserInfo.getUserMetadataStruct(
        roomId,
        userId,
      );
      if (!metadata) {
        this.logger.warn(`User metadata not found for ${userId}`);
        return;
      }

      // Update raised hand status
      metadata.raisedHand = false;

      // Update and broadcast
      await this.natsUser.updateAndBroadcastUserMetadata(
        roomId,
        userId,
        metadata,
        undefined,
      );

      this.logger.log(`Hand lowered successfully for ${userId}`);
    } catch (error) {
      this.logger.error(`Error lowering hand for ${userId}: ${error.message}`);
    }
  }
}
