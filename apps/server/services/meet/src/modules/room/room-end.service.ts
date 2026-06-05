/**
 * Room End Service
 *
 * Handles room termination and cleanup operations
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import type { RoomEndReq } from '@workspace/protocol';
import {
  NatsRoomService,
  ROOM_STATUS_ENDED,
  ROOM_STATUS_TRIGGERED_END,
} from '@server/meet/infrastructure/nats/nats-room.service';
import { NatsSystemEventsService } from '@server/meet/infrastructure/nats/nats-system-events.service';
import { NatsStreamService } from '@server/meet/infrastructure/nats/nats-stream.service';
import { NatsUserService } from '@server/meet/infrastructure/nats/nats-user.service';
import { RedisLockService } from '@server/meet/infrastructure/redis/redis-lock.service';
import { RedisRoomService } from '@server/meet/infrastructure/redis/redis-room.service';
import { LiveKitService } from '@server/meet/infrastructure/livekit/livekit.service';
import {
  NatsMsgServerToClientEvents,
  RecordingReqSchema,
} from '@workspace/protocol';
import { create } from '@bufbuild/protobuf';
import { waitUntilRoomCreationCompletes } from '@server/meet/modules/room/room-lock.helper';
import { RoomInfoService } from '@server/meet/modules/room/room-info.service';
import { RoomDurationService } from '@server/meet/modules/room/room-duration.service';
import { PollsService } from '@server/meet/modules/polls/polls.service';
import { AnalyticsService } from '@server/meet/modules/analytics/analytics.service';
import { BreakoutService } from '@server/meet/modules/breakout/breakout.service';
import { FileService } from '@server/meet/modules/file/file.service';
import { InsightsService } from '@server/meet/modules/insights/insights.service';
import { RecordingService } from '@server/meet/modules/recording/recording.service';
import { SpeechToTextService } from '@server/meet/modules/speech-to-text/speech-to-text.service';
import { RecordingTasks } from '@workspace/protocol';
import { AppConfigService } from '@server/shared';

/**
 * RoomEndService handles room termination and cleanup
 */
@Injectable()
export class RoomEndService {
  private readonly logger = new Logger(RoomEndService.name);

  constructor(
    private readonly appConfig: AppConfigService,
    @Inject(forwardRef(() => NatsRoomService))
    private readonly natsRoomService: NatsRoomService,
    @Inject(forwardRef(() => NatsSystemEventsService))
    private readonly natsSystemEvents: NatsSystemEventsService,
    @Inject(forwardRef(() => NatsStreamService))
    private readonly natsStreamService: NatsStreamService,
    @Inject(forwardRef(() => NatsUserService))
    private readonly natsUserService: NatsUserService,
    private readonly redisLock: RedisLockService,
    private readonly redisRoom: RedisRoomService,
    private readonly livekit: LiveKitService,
    private readonly roomInfoService: RoomInfoService,
    private readonly roomDuration: RoomDurationService,
    @Inject(forwardRef(() => PollsService))
    private readonly pollsService: PollsService,
    @Inject(forwardRef(() => AnalyticsService))
    private readonly analyticsService: AnalyticsService,
    @Inject(forwardRef(() => BreakoutService))
    private readonly breakoutService: BreakoutService,
    @Inject(forwardRef(() => FileService))
    private readonly fileService: FileService,
    @Inject(forwardRef(() => InsightsService))
    private readonly insightsService: InsightsService,
    @Inject(forwardRef(() => RecordingService))
    private readonly recordingService: RecordingService,
    @Inject(forwardRef(() => SpeechToTextService))
    private readonly speechToText: SpeechToTextService,
  ) {}

  /**
   * EndRoom terminates a room session
   *
   * Steps:
   * 1. Wait for room creation lock
   * 2. Get room from DB
   * 3. Get room from NATS
   * 4. Cache temporary data in Redis
   * 5. Broadcast SESSION_ENDED event
   * 6. Trigger async cleanup
   *
   * @param req - RoomEndReq request
   * @returns { status: boolean, msg: string }
   */
  async endRoom(req: RoomEndReq): Promise<{ status: boolean; msg: string }> {
    const roomId = req.roomId;
    if (!roomId || roomId.trim() === '') {
      this.logger.warn('EndRoom called with empty roomId, aborting');
      return { status: false, msg: 'roomId không hợp lệ' };
    }
    this.logger.log(`EndRoom called for: ${roomId}`);

    // Step 1: Wait until any ongoing room creation process is complete to avoid race conditions

    try {
      await waitUntilRoomCreationCompletes(this.redisLock, roomId, this.logger);
    } catch (error) {
      this.logger.error(`Cannot end room as it's locked: ${error.message}`);
      return { status: false, msg: `Không thể kết thúc phòng: ${error.message}` };
    }

    this.logger.log(`Proceeding to end room: ${roomId}`);

    // Step 2: Fetch room information from the database
    // Use RoomInfoService instead of direct Prisma call
    const roomDbInfo = await this.roomInfoService.getRoomInfoByRoomId(
      roomId,
      true,
    );

    if (!roomDbInfo) {
      return { status: false, msg: 'Không tìm thấy phòng trong CSDL hoặc phòng không hoạt động' };
    }

    // Step 3: Fetch the live room state from the NATS key-value store
    let natsRoomInfo;
    try {
      natsRoomInfo = await this.natsRoomService.getRoomInfo(roomId);
    } catch (error) {
      this.logger.warn(
        `NATS GetRoomInfo failed during EndRoom: ${error.message}. Proceeding with DB cleanup.`,
      );
    }

    // Step 4: Handle cases where the room exists in the DB but not in NATS
    if (!natsRoomInfo) {
      if (roomDbInfo.isRunning === 1) {
        this.logger.warn(
          `Room active in DB but not in NATS during EndRoom. Marking as ended and cleaning up.`,
        );
        // Trigger cleanup asynchronously
        setImmediate(() => {
          this.onAfterRoomEnded(
            BigInt(roomDbInfo.id),
            roomDbInfo.roomId,
            roomDbInfo.sid,
            '',
            '',
          );
        });
      }
      return {
        status: true,
        msg: 'Phòng đã kết thúc (thiếu trạng thái NATS, đã bắt đầu dọn dẹp).',
      };
    }

    // Step 5: Temporarily cache the live room data in Redis
    // This serves as a fallback in case the 'room_finished' webhook from LiveKit is delayed
    try {
      await this.redisRoom.holdTemporaryRoomData(natsRoomInfo);
    } catch (error) {
      this.logger.warn(`Failed to cache room data: ${error.message}`);
    }

    // Step 6: Broadcast a 'SESSION_ENDED' event to all clients in the room
    try {
      await this.natsSystemEvents.broadcastSystemEventToRoom(
        NatsMsgServerToClientEvents.SESSION_ENDED,
        roomId,
        'Cuộc họp đã kết thúc.',
      );
    } catch (error) {
      this.logger.error(
        `Error sending session ended notification: ${error.message}`,
      );
    }

    // Step 7: Trigger the main asynchronous cleanup process
    setImmediate(() => {
      this.onAfterRoomEnded(
        BigInt(natsRoomInfo.dbTableId),
        natsRoomInfo.roomId,
        natsRoomInfo.roomSid,
        natsRoomInfo.metadata,
        natsRoomInfo.status,
      );
    });

    return { status: true, msg: 'thành công' };
  }

  /**
   * OnAfterRoomEnded performs comprehensive cleanup after room ends
   *
   * This is called asynchronously and performs extensive cleanup:
   * - Database updates
   * - NATS cleanup
   * - LiveKit cleanup
   * - File deletion
   * - Analytics export
   *
   * @param dbTableId - Database table ID
   * @param roomId - Room ID
   * @param roomSID - Room session ID
   * @param metadata - Room metadata JSON string
   * @param roomStatus - Current room status
   */
  private async onAfterRoomEnded(
    dbTableId: bigint,
    roomId: string,
    roomSID: string,
    metadata: string,
    roomStatus: string,
  ): Promise<void> {
    this.logger.log(
      `Starting room cleanup for: ${roomId}, sid: ${roomSID}, status: ${roomStatus}`,
    );

    // Step 1: Acquire a distributed lock to prevent race conditions
    const cleanupLockTTL = 60000; // 60 seconds
    let lockValue: string;

    try {
      const lock = await this.redisLock.lockRoomCreation(
        roomId,
        cleanupLockTTL,
      );
      if (!lock.acquired) {
        this.logger.warn(
          `Could not acquire room creation lock for cleanup: ${roomId}`,
        );
        return;
      }
      lockValue = lock.lockValue;
      this.logger.log(
        `Room creation lock acquired for cleanup: ${roomId}, lockVal: ${lockValue}`,
      );
    } catch (error) {
      this.logger.error(
        `Redis error acquiring room creation lock: ${error.message}`,
      );
      return;
    }

    if (roomStatus !== ROOM_STATUS_ENDED) {
      // Update status immediately to prevent user to join
      try {
        await this.natsRoomService.updateRoomStatus(
          roomId,
          ROOM_STATUS_TRIGGERED_END,
        );
      } catch (error) {
        this.logger.error(
          `Error updating room status to triggered_end: ${error.message}`,
        );
      }
    }

    // Step 2: Ensure lock is always released
    try {
      // To avoid race condition better wait few seconds so that all the users got disconnect properly
      const waitBeforeTrigger = this.appConfig.timeouts.waitAfterRoomEnded;
      await new Promise((resolve) => setTimeout(resolve, waitBeforeTrigger));

      await this.performCleanup(
        dbTableId,
        roomId,
        roomSID,
        metadata,
        roomStatus,
      );
    } finally {
      try {
        await this.redisLock.unlockRoomCreation(roomId, lockValue);
        this.logger.log(
          `Room creation lock released for cleanup: ${roomId}, lockVal: ${lockValue}`,
        );
      } catch (error) {
        this.logger.error(`Error releasing cleanup lock: ${error.message}`);
      }
    }
  }

  /**
   * PerformCleanup executes all cleanup steps
   *
   * @private
   */
  private async performCleanup(
    dbTableId: bigint,
    roomId: string,
    roomSID: string,
    metadata: string,
    roomStatus: string,
  ): Promise<void> {
    // Step 3: If the room wasn't ended via the API, update status in NATS and LiveKit
    if (roomStatus !== ROOM_STATUS_ENDED) {
      try {
        await this.natsRoomService.updateRoomStatus(roomId, ROOM_STATUS_ENDED);
      } catch (error) {
        this.logger.error(
          `Error updating room status in NATS: ${error.message}`,
        );
      }

      try {
        await this.livekit.endRoom(roomId);
      } catch (error) {
        this.logger.error(`Error ending room in LiveKit: ${error.message}`);
      }
    }

    // Step 4: Mark the room as not running in the database
    // Use RoomInfoService instead of direct Prisma call
    try {
      await this.roomInfoService.updateRoomStatus(roomId, false);
    } catch (error) {
      this.logger.error(`DB error updating room status: ${error.message}`);
    }

    // Step 5: Clear any user blocklists associated with the room
    try {
      // Blocklist is part of the consolidated room bucket, which will be deleted in the final cleanup step.
      // await this.natsUserService.deleteRoomUsersBlockList(roomId);
    } catch (error) {
      this.logger.error(
        `Error deleting room users blocklist: ${error.message}`,
      );
    }

    // Step 6: Send a stop signal to any active recorders for this room
    if (roomSID && roomSID.trim() !== '') {
      try {
        await this.recordingService.sendMsgToRecorder(
          create(RecordingReqSchema, {
            task: RecordingTasks.STOP,
            sid: roomSID,
            roomId: roomId,
          }),
        );
      } catch (error) {
        this.logger.error(`Error sending stop to recorder: ${error.message}`);
      }
    } else {
      this.logger.warn(
        `Skip recorder stop for room ${roomId}: empty roomSID from cleanup context`,
      );
    }

    // Step 7: Delete all uploaded files for this session (if not configured to keep)
    const keepFilesForever = this.appConfig.upload.keepForever;
    if (!keepFilesForever) {
      if (roomSID && roomSID.trim() !== '') {
        try {
          await this.fileService.deleteRoomUploadedDir(roomSID);
        } catch (error) {
          this.logger.error(`Error deleting uploaded files: ${error.message}`);
        }
      } else {
        this.logger.warn(
          `Skip uploaded file cleanup for room ${roomId}: empty roomSID from cleanup context`,
        );
      }
    }

    // Step 8: Remove the room from the duration checker
    try {
      await this.roomDuration.deleteRoomWithDuration(roomId);
    } catch (error) {
      this.logger.error(`Error deleting room duration: ${error.message}`);
    }

    // Step 10: Clean up any polls created during the session
    try {
      await this.pollsService.cleanUpPolls(roomId);
    } catch (error) {
      this.logger.error(`Error cleaning up polls: ${error.message}`);
    }

    // Step 11: Perform post-end tasks for breakout rooms, if any
    try {
      await this.breakoutService.postTaskAfterRoomEndWebhook(roomId, metadata);
    } catch (error) {
      this.logger.error(
        `Error in breakout room post-end tasks: ${error.message}`,
      );
    }

    // Step 12: Finalize and clean up any speech-to-text service usage stats
    try {
      await this.speechToText.onAfterRoomEnded(roomId, roomSID);
    } catch (error) {
      this.logger.error(`Error in speech service cleanup: ${error.message}`);
    }

    // Step 13: End all the agent tasks for this room and create usage artifacts
    try {
      await this.insightsService.onAfterRoomEnded(dbTableId, roomId, roomSID);
    } catch (error) {
      this.logger.error(`Error in insights post-end tasks: ${error.message}`);
    }

    // Step 14: Perform the final NATS cleanup
    try {
      await this.natsRoomService.onAfterSessionEndCleanup(roomId);
    } catch (error) {
      this.logger.error(`Error in NATS cleanup: ${error.message}`);
    }

    // Step 15: Notify other modules about room ending
    try {
      const nc = this.natsRoomService.getNatsConnection();
      if (nc) {
        nc.publish(
          'events.meet.room_ended',
          JSON.stringify({
            roomId,
            roomSID,
            endedAt: new Date().toISOString(),
          }),
        );
        this.logger.log(`Published room_ended event for: ${roomId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to publish room_ended event: ${error.message}`);
    }

    this.logger.log(`Room has been cleaned properly: ${roomId}`);

    // Step 16: Schedule the analytics export to run after a delay
    const analyticsDelay = this.appConfig.timeouts.waitBeforeAnalyticsStart;
    setTimeout(() => {
      this.analyticsService.prepareToExportAnalytics(roomId, roomSID, metadata);
    }, analyticsDelay);
  }
}
