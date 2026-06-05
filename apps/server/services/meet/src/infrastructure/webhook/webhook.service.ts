/**
 * Webhook Service
 *
 * Handles all webhook event processing logic
 * - Room events (started, finished)
 * - Participant events (joined, left)
 * - Track events (published, unpublished)
 */

import { Injectable, Logger } from '@nestjs/common';
import { NatsRoomService } from '@server/meet/infrastructure/nats/nats-room.service';
import { NatsUserInfoService } from '@server/meet/infrastructure/nats/nats-user-info.service';
import { NatsUserService } from '@server/meet/infrastructure/nats/nats-user.service';
import { NatsService } from '@server/meet/infrastructure/nats/nats.service';
import { RedisRoomService } from '../../infrastructure/redis/redis-room.service';
import { WebhookNotifierService } from './webhook-notifier.service';
import {
  AnalyticsEventType,
  AnalyticsEvents,
  AnalyticsStatus,
  SpeechServiceUserStatusTasks,
  AnalyticsDataMsgSchema,
  SpeechServiceUserStatusReqSchema,
  RoomEndReqSchema,
  RecorderToWajlc,
  CommonNotifyEventSchema,
  NotifyEventRoomSchema,
} from '@workspace/protocol';
import { create } from '@bufbuild/protobuf';
import type { WebhookEvent } from '@livekit/protocol';
import { TrackSource } from '@livekit/protocol';

import { LiveKitService } from '@server/meet/infrastructure/livekit/livekit.service';
import {
  ROOM_STATUS_ACTIVE,
  ROOM_STATUS_ENDED,
} from '@server/meet/infrastructure/nats/nats-room.service';
import { RoomDurationService } from '@server/meet/modules/room/room-duration.service';
import { RoomInfoService } from '@server/meet/modules/room/room-info.service';
import { NatsRoomEventsService } from '@server/meet/infrastructure/nats/nats-room-events.service';
import { AnalyticsService } from '@server/meet/modules/analytics/analytics.service';
import { SpeechToTextService } from '@server/meet/modules/speech-to-text/speech-to-text.service';
import { RoomEndService } from '@server/meet/modules/room/room-end.service';
import { BreakoutService } from '@server/meet/modules/breakout/breakout.service';
import { Inject, forwardRef } from '@nestjs/common';

// Constants
const INGRESS_USER_ID_PREFIX = 'ingres_';
const TTS_AGENT_USER_ID_PREFIX = 'wajlc_tts_agent-';
const SIP_USER_ID_PREFIX = 'sip_';
const AGENT_USER_USER_ID_PREFIX = 'wajlc_agent-';

const WAIT_BEFORE_TRIGGER_ON_AFTER_ROOM_ENDED = 2000; // 2 seconds in ms

/**
 * WebhookService handles processing of LiveKit webhook events
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @Inject(forwardRef(() => NatsRoomService))
    private readonly natsRoomService: NatsRoomService,
    @Inject(forwardRef(() => NatsUserInfoService))
    private readonly natsUserInfoService: NatsUserInfoService,
    @Inject(forwardRef(() => NatsUserService))
    private readonly natsUserService: NatsUserService,
    @Inject(forwardRef(() => NatsService))
    private readonly natsService: NatsService,
    private readonly redisRoomService: RedisRoomService,
    private readonly livekitService: LiveKitService,
    @Inject(forwardRef(() => RoomDurationService))
    private readonly roomDurationService: RoomDurationService,
    @Inject(forwardRef(() => RoomInfoService))
    private readonly roomInfoService: RoomInfoService,
    @Inject(forwardRef(() => NatsRoomEventsService))
    private readonly natsRoomEventsService: NatsRoomEventsService,
    private readonly webhookNotifierService: WebhookNotifierService,
    @Inject(forwardRef(() => AnalyticsService))
    private readonly analyticsService: AnalyticsService,
    @Inject(forwardRef(() => SpeechToTextService))
    private readonly speechService: SpeechToTextService,
    @Inject(forwardRef(() => RoomEndService))
    private readonly roomEndService: RoomEndService,
    @Inject(forwardRef(() => BreakoutService))
    private readonly breakoutService: BreakoutService,
  ) {}

  // ============================================================================
  // Room Events
  // ============================================================================

  /**
   * roomStarted handles room_started webhook event
   */
  async roomStarted(event: WebhookEvent): Promise<void> {
    if (!event.room) {
      this.logger.warn('Received room_started webhook with nil room info');
      return;
    }

    const roomId = event.room.name;
    const log = this.logger;
    log.log(`Handling room_started webhook for room: ${roomId}`);

    // Get room info from NATS KV
    let rInfo: any;
    let meta: any;
    try {
      rInfo = await this.natsRoomService.getRoomInfo(roomId);
      if (rInfo) {
        const metadataStr = rInfo.metadata;
        meta = metadataStr
          ? this.natsService.unmarshalRoomMetadata(metadataStr)
          : null;
      }
    } catch (error) {
      log.error(`Failed to get room info from NATS: ${error.message}`);
      return;
    }

    if (!rInfo || !meta) {
      // Room not found in NATS store, forcefully end it
      log.warn('Room not found in wajlc NATS store, forcing room termination');
      try {
        await this.livekitService.endRoom(roomId);
      } catch (error) {
        log.error(`Failed to forcefully end room in LiveKit: ${error.message}`);
      }
      return;
    }

    // Update room status to active if needed
    if (rInfo.status !== ROOM_STATUS_ACTIVE) {
      log.log(`Updating room status to active (current: ${rInfo.status})`);
      try {
        await this.natsRoomService.updateRoomStatus(roomId, ROOM_STATUS_ACTIVE);
      } catch (error) {
        log.error(`Failed to update room status: ${error.message}`);
        return;
      }
    }

    // Set started timestamp
    meta.startedAt = BigInt(Math.floor(Date.now() / 1000));

    // Handle room duration checker
    if (meta.roomFeatures?.roomDuration && meta.roomFeatures.roomDuration > 0) {
      log.log(
        `Room has duration limit: ${meta.roomFeatures.roomDuration} minutes`,
      );
      // Add room to duration checker
      try {
        await this.roomDurationService.addRoomWithDurationInfo(rInfo.roomId, {
          duration: Number(meta.roomFeatures.roomDuration),
          startedAt: Number(meta.startedAt),
        });
      } catch (error) {
        log.error(`Failed to add room duration info: ${error.message}`);
      }
    }

    // Handle breakout room post-start tasks
    if (meta.isBreakoutRoom) {
      log.log(
        `Room ${roomId} is a breakout room (parent: ${meta.parentRoomId}), running post-start tasks`,
      );
      try {
        await this.breakoutService.postTaskAfterRoomStartWebhook(roomId, meta);
        log.log(`Post-start tasks completed for breakout room: ${roomId}`);
      } catch (error) {
        log.error(
          `Failed to run breakout room post-start tasks for ${roomId}: ${error.message}`,
        );
      }
    } else {
      log.debug(
        `Room ${roomId} is not a breakout room, skipping post-start tasks`,
      );
    }

    // Update and broadcast room metadata
    try {
      const updatedMetadata = this.natsService.marshalRoomMetadata(meta);
      await this.natsRoomService.updateRoomMetadata(roomId, updatedMetadata);
      // Broadcast to clients
      await this.natsRoomEventsService.broadcastRoomMetadata(
        roomId,
        updatedMetadata,
      );
    } catch (error) {
      log.error(
        `Failed to update and broadcast room metadata: ${error.message}`,
      );
    }

    // Populate event with room info for webhook notification
    event.room.metadata = rInfo.metadata;
    event.room.sid = rInfo.roomSid;
    event.room.maxParticipants = Number(rInfo.maxParticipants);
    event.room.emptyTimeout = Number(rInfo.emptyTimeout);

    // Send to webhook notifier
    this.sendToWebhookNotifier(event);
    log.log('Successfully processed room_started webhook');
  }

  /**
   * roomFinished handles room_finished webhook event
   */
  async roomFinished(event: WebhookEvent): Promise<void> {
    if (!event.room) {
      this.logger.warn('Received room_finished webhook with nil room info');
      return;
    }

    const roomId = event.room.name;
    if (!roomId || roomId.trim() === '') {
      this.logger.warn('Received room_finished webhook with empty room name');
      return;
    }
    const log = this.logger;
    log.log(`Handling room_finished webhook for room: ${roomId}`);

    // Get room info from NATS KV, fallback to Redis
    let rInfo: any;
    try {
      rInfo = await this.natsRoomService.getRoomInfo(roomId);
    } catch (error) {
      log.error(
        `Failed to get room info from NATS: ${error.message}, falling back to Redis`,
      );
    }

    if (!rInfo) {
      // Fallback to Redis
      rInfo = await this.redisRoomService.getTemporaryRoomData(roomId);
      if (!rInfo) {
        log.warn(
          'Room not found in NATS or Redis, skipping room_finished tasks',
        );
        return;
      }
      rInfo.status = ROOM_STATUS_ENDED;
    }

    if (!rInfo.roomId || !rInfo.roomSid) {
      log.warn(
        `Invalid room info during room_finished cleanup for room "${roomId}" (roomId="${rInfo.roomId}", roomSid="${rInfo.roomSid}")`,
      );
      return;
    }

    // Populate event with room info
    event.room.metadata = rInfo.metadata;
    event.room.sid = rInfo.roomSid;
    event.room.maxParticipants = Number(rInfo.maxParticipants);
    event.room.emptyTimeout = Number(rInfo.emptyTimeout);

    // Send custom "session_ended" webhook notification
    this.sendCustomTypeWebhook(event, 'session_ended');

    // If room was not ended via API, trigger cleanup
    if (rInfo.status !== ROOM_STATUS_ENDED) {
      log.warn('Room was not ended via API, triggering wajlc EndRoom flow');

      // Update status to ended
      try {
        await this.natsRoomService.updateRoomStatus(roomId, ROOM_STATUS_ENDED);
      } catch (error) {
        log.error(`Failed to update room status to ended: ${error.message}`);
      }

      // Trigger wajlc EndRoom flow
      try {
        await this.roomEndService.endRoom(
          create(RoomEndReqSchema, {
            roomId: roomId,
          }),
        );
      } catch (error) {
        log.error(`Failed to trigger endRoom flow: ${error.message}`);
      }
    }

    // Wait before triggering cleanup tasks
    await new Promise((resolve) =>
      setTimeout(resolve, WAIT_BEFORE_TRIGGER_ON_AFTER_ROOM_ENDED),
    );

    // Send final webhook notification
    this.sendToWebhookNotifier(event);

    // Clean up webhook registration for this room
    try {
      await this.webhookNotifierService.deleteWebhook(roomId);
    } catch (error) {
      log.error(`Failed to delete webhook registration: ${error.message}`);
    }

    log.log('Successfully processed room_finished webhook');
  }

  // ============================================================================
  // Participant Events
  // ============================================================================

  // ============================================================================
  // Participant Events
  // ============================================================================

  /**
   * participantJoined handles participant_joined webhook event
   */
  async participantJoined(event: WebhookEvent): Promise<void> {
    if (!event.room || !event.participant) {
      this.logger.warn(
        'Received participant_joined webhook with nil room or participant info',
      );
      return;
    }

    const roomId = event.room.name;

    const participantId = event.participant.identity;

    const log = this.logger;
    log.log(
      `Handling participant_joined webhook: room=${roomId}, participant=${participantId}`,
    );

    // Get room info from NATS
    let rInfo: any;
    try {
      rInfo = await this.natsRoomService.getRoomInfo(roomId);
    } catch (error) {
      log.error(`Failed to get room info from NATS: ${error.message}`);
      return;
    }

    if (!rInfo) {
      log.warn('Room not found in NATS, skipping participant_joined tasks');
      return;
    }

    if (!rInfo.roomId || !rInfo.roomSid) {
      log.warn(
        `Invalid room info in participant_joined for room "${roomId}" (roomId="${rInfo.roomId}", roomSid="${rInfo.roomSid}")`,
      );
      return;
    }

    // Populate event with room info
    event.room.sid = rInfo.roomSid;
    event.room.metadata = rInfo.metadata;
    event.room.maxParticipants = Number(rInfo.maxParticipants);
    event.room.emptyTimeout = Number(rInfo.emptyTimeout);

    // Increment participant count in database
    try {
      log.log(
        `[PARTICIPANT_COUNT] Incrementing participant count for room ${roomId} (sid: ${rInfo.roomSid})`,
      );
      const rowsAffected =
        await this.roomInfoService.incrementOrDecrementNumParticipants(
          rInfo.roomSid,
          '+',
        );
      log.log(
        `[PARTICIPANT_COUNT] Increment successful, rows affected: ${rowsAffected}`,
      );
    } catch (error) {
      log.error(
        `[PARTICIPANT_COUNT] Error incrementing participant count: ${error.message}`,
        error.stack,
      );
    }

    // Handle internal agent users (ingress, TTS, SIP)
    if (this.isRequireManualTrigger(participantId)) {
      let processedParticipantId = participantId;
      if (participantId.startsWith(SIP_USER_ID_PREFIX)) {
        // Special case SIP: replace '+' if present
        processedParticipantId = participantId.replace(/\+/g, '');
        event.participant.identity = processedParticipantId;

        log.log(
          `Triggering OnAfterUserJoined manually for SIP user: ${processedParticipantId}`,
        );
        await this.natsUserService.addUserManuallyAndBroadcast(
          roomId,
          processedParticipantId,
          event.participant.name,
          false,
          false,
        );
      }

      log.log(
        `Internal agent participant joined, triggering OnAfterUserJoined manually: ${processedParticipantId}`,
      );
      // Trigger NATS OnAfterUserJoined event
      await this.natsUserService.onAfterUserJoined(
        roomId,
        processedParticipantId,
      );
    }

    // Send webhook notification
    this.sendToWebhookNotifier(event);
    log.log('Successfully processed participant_joined webhook');
  }

  /**
   * participantLeft handles participant_left webhook event
   */
  async participantLeft(event: WebhookEvent): Promise<void> {
    if (!event.room || !event.participant) {
      this.logger.warn(
        'Received participant_left webhook with nil room or participant info',
      );
      return;
    }

    const roomId = event.room.name;

    const participantId = event.participant.identity;
    const log = this.logger;
    log.log(
      `Handling participant_left webhook: room=${roomId}, participant=${participantId}`,
    );

    // Get room info from NATS
    let rInfo: any;
    try {
      rInfo = await this.natsRoomService.getRoomInfo(roomId);
    } catch (error) {
      log.error(`Failed to get room info from NATS: ${error.message}`);
      return;
    }

    if (!rInfo) {
      log.warn('Room not found in NATS, skipping participant_left tasks');
      return;
    }

    if (!rInfo.roomId || !rInfo.roomSid) {
      log.warn(
        `Invalid room info in participant_left for room "${roomId}" (roomId="${rInfo.roomId}", roomSid="${rInfo.roomSid}")`,
      );
      return;
    }

    // Populate event with room info
    event.room.sid = rInfo.roomSid;
    event.room.metadata = rInfo.metadata;
    event.room.maxParticipants = Number(rInfo.maxParticipants);
    event.room.emptyTimeout = Number(rInfo.emptyTimeout);

    // Decrement participant count in database
    try {
      log.log(
        `[PARTICIPANT_COUNT] Decrementing participant count for room ${roomId} (sid: ${rInfo.roomSid})`,
      );
      const rowsAffected =
        await this.roomInfoService.incrementOrDecrementNumParticipants(
          rInfo.roomSid,
          '-',
        );
      log.log(
        `[PARTICIPANT_COUNT] Decrement successful, rows affected: ${rowsAffected}`,
      );
    } catch (error) {
      log.error(
        `[PARTICIPANT_COUNT] Error decrementing participant count: ${error.message}`,
        error.stack,
      );
    }

    // Handle internal agent users (ingress, TTS, SIP)
    if (this.isRequireManualTrigger(participantId)) {
      let processedParticipantId = participantId;
      if (participantId.startsWith(SIP_USER_ID_PREFIX)) {
        processedParticipantId = participantId.replace(/\+/g, '');
        event.participant.identity = processedParticipantId;
      }

      log.log(
        `Internal agent participant left, triggering OnAfterUserDisconnected manually: ${processedParticipantId}`,
      );
      // Trigger NATS OnAfterUserDisconnected event
      await this.natsUserService.onAfterUserDisconnected(
        roomId,
        processedParticipantId,
      );
    }

    // Send webhook notification
    this.sendToWebhookNotifier(event);

    // Handle speech service usage stat for sudden disconnection
    try {
      await this.speechService.speechServiceUserStatus(
        rInfo.roomId,
        participantId,
        create(SpeechServiceUserStatusReqSchema, {
          roomSid: rInfo.roomSid,
          task: SpeechServiceUserStatusTasks.SPEECH_TO_TEXT_SESSION_ENDED,
        }),
      );
    } catch (error) {
      log.error(`Failed to send speech service usage status: ${error.message}`);
    }

    log.log('Successfully processed participant_left webhook');

    // Ensure user is marked as offline (safety net)
    this.ensureUserIsOffline(event);
  }

  /**
   * ensureUserIsOffline acts as a safety net for marking users offline
   */
  private async ensureUserIsOffline(event: WebhookEvent): Promise<void> {
    // Non-null assertions safe here as participantLeft already validated these fields
    const participantId = event.participant!.identity;
    const roomId = event.room!.name;

    // Skip for manual trigger users (Ingress, TTS, SIP)
    if (this.isRequireManualTrigger(participantId)) {
      return;
    }

    const nowUnix = BigInt(Date.now());

    // Wait 8 seconds before checking
    await new Promise((resolve) => setTimeout(resolve, 8000));

    // Safety net to ensure users are marked offline correctly
    try {
      const status = await this.natsUserInfoService.getRoomUserStatus(
        roomId,
        participantId,
      );
      if (status === 'online') {
        const userInfo = await this.natsUserInfoService.getUserInfo(
          roomId,
          participantId,
        );
        if (!userInfo) {
          return;
        }

        if (
          userInfo.reconnectedAt &&
          BigInt(userInfo.reconnectedAt) > nowUnix
        ) {
          const diff = Number(BigInt(userInfo.reconnectedAt) - nowUnix);
          this.logger.log(
            `User reconnected after ${diff}ms, skipping manual disconnect`,
          );
          return;
        }

        // User should be offline but status remains online
        this.logger.warn(
          'User status remains online, triggering OnAfterUserDisconnected manually',
        );
        // Trigger NATS OnAfterUserDisconnected event
        await this.natsUserService.onAfterUserDisconnected(
          roomId,
          participantId,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to check user status: ${error.message}`);
    }
  }

  /**
   * Checks if the user requires manual trigger (Ingress, TTS, SIP)
   */
  private isRequireManualTrigger(userId: string): boolean {
    return (
      userId.startsWith(INGRESS_USER_ID_PREFIX) ||
      userId.startsWith(TTS_AGENT_USER_ID_PREFIX) ||
      userId.startsWith(SIP_USER_ID_PREFIX) ||
      userId.startsWith(AGENT_USER_USER_ID_PREFIX)
    );
  }

  // ============================================================================
  // Track Events
  // ============================================================================

  /**
   * trackPublished handles track_published webhook event
   */
  async trackPublished(event: WebhookEvent): Promise<void> {
    if (!event.room || !event.track || !event.participant) {
      this.logger.warn(
        'Received track_published webhook with nil room, track, or participant info',
      );
      return;
    }

    const roomId = event.room.name;
    const participantId = event.participant.identity;
    const trackSid = event.track.sid;
    const log = this.logger;
    log.log(
      `Handling track_published webhook: room=${roomId}, participant=${participantId}, track=${trackSid}`,
    );

    // Get room info from NATS
    let rInfo: any;
    try {
      rInfo = await this.natsRoomService.getRoomInfo(roomId);
    } catch (error) {
      log.error(`Failed to get room info from NATS: ${error.message}`);
      return;
    }

    if (!rInfo) {
      log.warn('Room not found in NATS, skipping track_published tasks');
      return;
    }

    // Populate event with room info
    event.room.sid = rInfo.roomSid;
    event.room.metadata = rInfo.metadata;
    event.room.maxParticipants = Number(rInfo.maxParticipants);
    event.room.emptyTimeout = Number(rInfo.emptyTimeout);

    // Send webhook notification
    this.sendToWebhookNotifier(event);

    // Send analytics event
    this.sendTrackAnalytics(event, 'STARTED');

    log.log('Successfully processed track_published webhook');
  }

  /**
   * trackUnpublished handles track_unpublished webhook event
   */
  async trackUnpublished(event: WebhookEvent): Promise<void> {
    if (!event.room || !event.track || !event.participant) {
      this.logger.warn(
        'Received track_unpublished webhook with nil room, track, or participant info',
      );
      return;
    }

    const roomId = event.room.name;
    const participantId = event.participant.identity;
    const trackSid = event.track.sid;
    const log = this.logger;
    log.log(
      `Handling track_unpublished webhook: room=${roomId}, participant=${participantId}, track=${trackSid}`,
    );

    // Get room info from NATS
    let rInfo: any;
    try {
      rInfo = await this.natsRoomService.getRoomInfo(roomId);
    } catch (error) {
      log.error(`Failed to get room info from NATS: ${error.message}`);
      return;
    }

    if (!rInfo) {
      log.warn('Room not found in NATS, skipping track_unpublished tasks');
      return;
    }

    // Populate event with room info
    event.room.sid = rInfo.roomSid;
    event.room.metadata = rInfo.metadata;
    event.room.maxParticipants = Number(rInfo.maxParticipants);
    event.room.emptyTimeout = Number(rInfo.emptyTimeout);

    // Send webhook notification
    this.sendToWebhookNotifier(event);

    // Send analytics event
    this.sendTrackAnalytics(event, 'ENDED');

    log.log('Successfully processed track_unpublished webhook');
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * sendTrackAnalytics sends analytics for track events
   */
  private sendTrackAnalytics(
    event: WebhookEvent,
    status: 'STARTED' | 'ENDED',
  ): void {
    let val: string;
    let eventName: AnalyticsEvents;

    const trackSource = event.track?.source;

    // Use LiveKit TrackSource enum values
    switch (trackSource) {
      case TrackSource.MICROPHONE:
        val =
          status === 'STARTED'
            ? AnalyticsStatus.STARTED.toString()
            : AnalyticsStatus.ENDED.toString();
        eventName = AnalyticsEvents.ANALYTICS_EVENT_USER_MIC_STATUS;
        break;
      case TrackSource.CAMERA:
        val =
          status === 'STARTED'
            ? AnalyticsStatus.STARTED.toString()
            : AnalyticsStatus.ENDED.toString();
        eventName = AnalyticsEvents.ANALYTICS_EVENT_USER_WEBCAM_STATUS;
        break;
      case TrackSource.SCREEN_SHARE:
      case TrackSource.SCREEN_SHARE_AUDIO:
        val =
          status === 'STARTED'
            ? AnalyticsStatus.STARTED.toString()
            : AnalyticsStatus.ENDED.toString();
        eventName = AnalyticsEvents.ANALYTICS_EVENT_USER_SCREEN_SHARE_STATUS;
        break;
      default:
        return; // Unknown track source
    }

    // Send analytics via NATS
    // After early returns above, we know event.room and event.participant are non-null
    const data = create(AnalyticsDataMsgSchema, {
      eventType: AnalyticsEventType.USER,
      eventName,
      roomId: event.room!.name,
      userId: event.participant!.identity,
      hsetValue: val,
    });

    this.analyticsService.handleEvent(data).catch((err) => {
      this.logger.error(`Failed to send track analytics: ${err.message}`);
    });
  }

  /**
   * sendToWebhookNotifier sends event to webhook notifier
   */
  private sendToWebhookNotifier(event: WebhookEvent): void {
    if (!event || !this.webhookNotifierService) {
      return;
    }

    if (!event.room) {
      this.logger.error(`Empty room info for event: ${event.event}`);
      return;
    }

    // Convert LiveKit WebhookEvent to format compatible with webhookNotifierService
    // LiveKit events are plain JS objects, we pass them as-is
    // The service will handle conversion internally
    try {
      this.webhookNotifierService.sendWebhookEvent(event as any);
    } catch (error) {
      this.logger.error(
        `Failed to send webhook notification: ${error.message}`,
      );
    }
  }

  /**
   * sendCustomTypeWebhook sends custom event type to webhook notifier
   */
  private sendCustomTypeWebhook(event: WebhookEvent, eventName: string): void {
    if (!event || !this.webhookNotifierService) {
      return;
    }

    if (!event.room) {
      this.logger.error(`Empty room info for event: ${event.event}`);
      return;
    }

    // Clone event and change event name
    const customEvent = { ...event, event: eventName };

    // Prepare and send webhook notification
    try {
      this.webhookNotifierService.sendWebhookEvent(customEvent as any);
    } catch (error) {
      this.logger.error(
        `Failed to send custom webhook notification: ${error.message}`,
      );
    }
  }

  /**
   * sendRoomRecordingNotification sends webhook for recording events
   */
  async sendRoomRecordingNotification(
    r: RecorderToWajlc,
    event: string,
  ): Promise<void> {
    const msg = create(CommonNotifyEventSchema, {
      event: event,
      room: create(NotifyEventRoomSchema, {
        roomId: r.roomId,
        sid: r.roomSid,
      }),
      recordingInfo: {
        recordId: r.recordingId,
        recorderId: r.recorderId,
        filePath: r.filePath,
        fileSize: r.fileSize,
      },
    });

    try {
      await this.webhookNotifierService.sendWebhookEvent(msg);
      this.logger.log(
        `Room recording webhook sent: ${r.roomId}, event: ${event}`,
      );
    } catch (error) {
      this.logger.error(`Error sending recording webhook: ${error.message}`);
    }
  }
}
