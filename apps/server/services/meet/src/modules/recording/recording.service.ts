import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { NatsRoomService } from '@server/meet/infrastructure/nats/nats-room.service';
import { NatsService } from '@server/meet/infrastructure/nats/nats.service';
import { RoomInfoService } from '@server/meet/modules/room/room-info.service';
import {
  RecordingReq,
  WajlcToRecorderSchema,
  RecordingTasks,
  CommonResponseSchema,
  RecorderToWajlc,
  AnalyticsEvents,
  AnalyticsEventType,
  AnalyticsDataMsgSchema,
  AnalyticsStatus,
} from '@workspace/protocol';
import { create, toBinary, fromBinary } from '@bufbuild/protobuf';
import { ArtifactsService } from '@server/meet/modules/artifacts/artifacts.service';
import { AnalyticsService } from '@server/meet/modules/analytics/analytics.service';
import { WebhookService } from '@server/meet/infrastructure/webhook/webhook.service';
import { NatsRoomEventsService } from '@server/meet/infrastructure/nats/nats-room-events.service';
import { NatsSystemEventsService } from '@server/meet/infrastructure/nats/nats-system-events.service';
import { RoomUserService } from '@server/meet/modules/room/room-user.service';

import { AppConfigService } from '@server/shared';

@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly natsRoomService: NatsRoomService,
    private readonly natsService: NatsService,
    private readonly roomInfoService: RoomInfoService,
    private readonly artifactsService: ArtifactsService,
    private readonly analyticsService: AnalyticsService,
    @Inject(forwardRef(() => WebhookService))
    private readonly webhookService: WebhookService,
    private readonly natsRoomEventsService: NatsRoomEventsService,
    private readonly natsSystemEventsService: NatsSystemEventsService,
    @Inject(forwardRef(() => RoomUserService))
    private readonly roomUserService: RoomUserService,
  ) {}

  /**
   * handleRecordingReq processes user requests for recording/RTMP
   */
  async handleRecordingReq(req: RecordingReq): Promise<void> {
    this.logger.log(
      `Handling recording request for room ${req.roomId}, task: ${req.task}`,
    );

    // If SID is missing, try to get it from NATS
    if (!req.sid) {
      const rInfo = await this.natsRoomService.getRoomInfo(req.roomId);
      if (rInfo) {
        req.sid = rInfo.roomSid;
      }
    }

    if (!req.sid) {
      throw new Error('Thiếu SID phòng');
    }

    // Validate task
    switch (req.task) {
      case RecordingTasks.START_RECORDING:
      case RecordingTasks.STOP_RECORDING:
      case RecordingTasks.START_RTMP:
      case RecordingTasks.STOP_RTMP:
      case RecordingTasks.STOP:
        await this.sendMsgToRecorder(req);
        break;
      default:
        throw new Error(`Tác vụ ghi không hợp lệ: ${req.task}`);
    }
  }

  /**
   * Get all active recorders/rooms that are recording
   */
  async getAllActiveRecorders(): Promise<string[]> {
    const rooms = await this.natsRoomService.getActiveRooms();
    const recordingRoomIds: string[] = [];

    for (const room of rooms) {
      try {
        const { metadata } = await this.natsRoomService.getRoomInfoWithMetadata(
          room.roomId,
        );
        if (metadata && metadata.isRecording) {
          recordingRoomIds.push(room.roomId);
        }
      } catch (e) {
        this.logger.warn(
          `Failed to check recording status for room ${room.roomId}: ${e.message}`,
        );
      }
    }

    return recordingRoomIds;
  }

  /**
   * sendMsgToRecorder sends a message to the recorder via NATS
   */
  async sendMsgToRecorder(req: RecordingReq): Promise<void> {
    let { roomId, sid, task, roomTableId } = req;
    const log = this.logger;

    log.log(`Request to send message to recorder: ${roomId}, task: ${task}`);

    if (!roomTableId || roomTableId === '0') {
      if (!sid) {
        const rInfo = await this.natsRoomService.getRoomInfo(roomId);
        if (rInfo) {
          sid = rInfo.roomSid;
        }
      }
      if (!sid) {
        throw new Error('SID trống');
      }
      // Fetch room info by SID from DB
      const rmInfo = await this.roomInfoService.getRoomInfoBySid(sid, 1);
      if (!rmInfo) {
        log.warn(`Room not found by sid ${sid}, skipping`);
        return;
      }
      roomTableId = rmInfo.id.toString();
      roomId = rmInfo.roomId;
    }

    const recordingId = `${sid}-${Date.now()}`;

    const toSend = create(WajlcToRecorderSchema, {
      from: 'wajlc',
      roomTableId: roomTableId.toString(),
      roomId: roomId,
      roomSid: sid,
      task: task as any, // Cast to enum
      recordingId: recordingId,
    });

    // Handle START_RECORDING or START_RTMP specific tokens/bots
    if (
      task === RecordingTasks.START_RECORDING ||
      task === RecordingTasks.START_RTMP
    ) {
      const botId =
        task === RecordingTasks.START_RECORDING ? 'RECORDER_BOT' : 'RTMP_BOT';
      const recorderId = await this.selectRecorder();
      if (!recorderId) {
        throw new Error('Không có bộ ghi khả dụng');
      }

      const tokenData = await this.roomUserService.getWajlcJoinToken({
        roomId: roomId,
        userInfo: {
          userId: botId,
          name: botId,
          isAdmin: true,
          isHidden: true,
        },
      });

      toSend.recorderId = recorderId;
      toSend.accessToken = tokenData.token;

      if (task === RecordingTasks.START_RTMP) {
        toSend.rtmpUrl = req.rtmpUrl;
      }

      // if we have custom design, then we'll set custom design with token
      if (req.customDesign && req.customDesign !== '') {
        log.log('Appending custom design to access token');
        toSend.accessToken +=
          '&custom_design=' + encodeURIComponent(req.customDesign);
      }
    }

    const payload = toBinary(WajlcToRecorderSchema, toSend);
    const nc = this.natsService.getNatsConnection();
    const recorderChannel = this.appConfig.nats.recorder.channel;

    log.log(`Sending request to NATS recorder channel: ${recorderChannel}`);
    try {
      const msg = await nc.request(recorderChannel, payload, { timeout: 3000 });
      const res = fromBinary(CommonResponseSchema, msg.data);
      if (!res.status) {
        throw new Error(
          res.msg || 'Bộ ghi trả về phản hồi thất bại',
        );
      }
      log.log(
        'Successfully sent message to recorder and got a success response',
      );
    } catch (error) {
      log.error(`Failed to send message to recorder: ${error.message}`);
      throw error;
    }
  }

  private async selectRecorder(): Promise<string | null> {
    try {
      const recorders = await this.natsService.getAllActiveRecorders();
      if (!recorders || recorders.length === 0) {
        return null;
      }

      // Sort by progress/limit ratio
      recorders.sort((a, b) => {
        const ratioA =
          a.maxLimit > 0 ? Number(a.currentProgress) / Number(a.maxLimit) : 0;
        const ratioB =
          b.maxLimit > 0 ? Number(b.currentProgress) / Number(b.maxLimit) : 0;
        return ratioA - ratioB;
      });

      return recorders[0].recorderId;
    } catch (error) {
      this.logger.error(`Error selecting recorder: ${error.message}`);
      return null;
    }
  }
  /**
   * handleRecorderResp processes messages from the recorder.
   */
  async handleRecorderResp(r: RecorderToWajlc): Promise<void> {
    this.logger.log(
      `Processing recorder response for room ${r.roomId}, task: ${r.task}`,
    );

    switch (r.task) {
      case RecordingTasks.START_RECORDING:
        await this.recordingStarted(r);
        break;
      case RecordingTasks.END_RECORDING:
        await this.recordingEnded(r);
        break;
      case RecordingTasks.START_RTMP:
        await this.rtmpStarted(r);
        break;
      case RecordingTasks.END_RTMP:
        await this.rtmpEnded(r);
        break;
      case RecordingTasks.RECORDING_PROCEEDED:
        await this.recordingProceeded(r);
        break;
      default:
        this.logger.warn(`Unknown recorder task: ${r.task}`);
    }
  }

  private async recordingStarted(r: RecorderToWajlc): Promise<void> {
    const log = this.logger;
    log.log(`Processing recording_started event for room ${r.roomId}`);

    const roomTableId = BigInt(r.roomTableId);
    await this.roomInfoService.updateRoomRecordingStatus(
      roomTableId,
      1,
      r.recorderId,
    );

    // update room metadata
    const { metadata } = await this.natsRoomService.getRoomInfoWithMetadata(
      r.roomId,
    );
    if (metadata) {
      metadata.isRecording = true;
      await this.natsRoomEventsService.updateAndBroadcastRoomMetadata(
        r.roomId,
        metadata,
      );
    }

    await this.natsSystemEventsService.notifyInfoMsg(
      r.roomId,
      'Đã bắt đầu ghi hình.',
      false,
    );
    await this.webhookService.sendRoomRecordingNotification(
      r,
      'recording_started',
    );
    await this.sendAnalyticsEvent(
      r.roomId,
      AnalyticsEvents.ANALYTICS_EVENT_ROOM_RECORDING_STATUS,
      `${AnalyticsStatus[AnalyticsStatus.STARTED]}:${r.recorderId}`,
    );
  }

  private async recordingEnded(r: RecorderToWajlc): Promise<void> {
    const log = this.logger;
    log.log(`Processing recording_ended event for room ${r.roomId}`);

    const roomTableId = BigInt(r.roomTableId);
    await this.roomInfoService.updateRoomRecordingStatus(roomTableId, 0, null);

    // update room metadata
    const { metadata } = await this.natsRoomService.getRoomInfoWithMetadata(
      r.roomId,
    );
    if (metadata) {
      metadata.isRecording = false;
      await this.natsRoomEventsService.updateAndBroadcastRoomMetadata(
        r.roomId,
        metadata,
      );
    }

    if (r.status) {
      await this.natsSystemEventsService.notifyInfoMsg(
        r.roomId,
        'Đã kết thúc ghi hình.',
        false,
      );
    } else {
      await this.natsSystemEventsService.notifyErrorMsg(
        r.roomId,
        'Kết thúc ghi hình có lỗi.',
      );
    }

    await this.webhookService.sendRoomRecordingNotification(
      r,
      'recording_ended',
    );
    await this.sendAnalyticsEvent(
      r.roomId,
      AnalyticsEvents.ANALYTICS_EVENT_ROOM_RECORDING_STATUS,
      AnalyticsStatus[AnalyticsStatus.ENDED],
    );
  }

  private async rtmpStarted(r: RecorderToWajlc): Promise<void> {
    const log = this.logger;
    log.log(`Processing rtmp_started event for room ${r.roomId}`);

    const roomTableId = BigInt(r.roomTableId);
    await this.roomInfoService.updateRoomRTMPStatus(
      roomTableId,
      1,
      r.recorderId,
    );

    // update room metadata
    const { metadata } = await this.natsRoomService.getRoomInfoWithMetadata(
      r.roomId,
    );
    if (metadata) {
      metadata.isActiveRtmp = true;
      await this.natsRoomEventsService.updateAndBroadcastRoomMetadata(
        r.roomId,
        metadata,
      );
    }

    await this.natsSystemEventsService.notifyInfoMsg(
      r.roomId,
      'Đã bắt đầu phát RTMP.',
      false,
    );
    await this.webhookService.sendRoomRecordingNotification(r, 'rtmp_started');
    await this.sendAnalyticsEvent(
      r.roomId,
      AnalyticsEvents.ANALYTICS_EVENT_ROOM_RTMP_STATUS,
      `${AnalyticsStatus[AnalyticsStatus.STARTED]}:${r.recorderId}`,
    );
  }

  private async rtmpEnded(r: RecorderToWajlc): Promise<void> {
    const log = this.logger;
    log.log(`Processing rtmp_ended event for room ${r.roomId}`);

    const roomTableId = BigInt(r.roomTableId);
    await this.roomInfoService.updateRoomRTMPStatus(roomTableId, 0, null);

    // update room metadata
    const { metadata } = await this.natsRoomService.getRoomInfoWithMetadata(
      r.roomId,
    );
    if (metadata) {
      metadata.isActiveRtmp = false;
      await this.natsRoomEventsService.updateAndBroadcastRoomMetadata(
        r.roomId,
        metadata,
      );
    }

    if (r.status) {
      await this.natsSystemEventsService.notifyInfoMsg(
        r.roomId,
        'Đã kết thúc phát RTMP.',
        false,
      );
    } else {
      await this.natsSystemEventsService.notifyErrorMsg(
        r.roomId,
        'Kết thúc phát RTMP có lỗi.',
      );
    }

    await this.webhookService.sendRoomRecordingNotification(r, 'rtmp_ended');
    await this.sendAnalyticsEvent(
      r.roomId,
      AnalyticsEvents.ANALYTICS_EVENT_ROOM_RTMP_STATUS,
      AnalyticsStatus[AnalyticsStatus.ENDED],
    );
  }

  private async recordingProceeded(r: RecorderToWajlc): Promise<void> {
    const log = this.logger;
    log.log(`Processing recording_proceeded event for room ${r.roomId}`);

    if (!r.status) {
      log.error(
        `Recording proceeded event with fail status for room ${r.roomId}: ${r.msg}`,
      );
      return;
    }

    // Add recording info to DB (RoomArtifact)
    // In torii-monorepo, we use artifacts instead of a separate recordings table
    try {
      await this.artifactsService.createCloudRecordingArtifact(
        Number(r.roomTableId),
        r.roomId,
        r.roomSid,
        r.filePath,
        Math.floor(r.fileSize),
      );
      log.log(`Recording file ready: ${r.filePath}, size: ${r.fileSize}`);
    } catch (error) {
      log.error(`Failed to create cloud recording artifact: ${error.message}`);
    }
  }

  private async sendAnalyticsEvent(
    roomId: string,
    eventName: AnalyticsEvents,
    hsetValue: string,
  ): Promise<void> {
    const event = create(AnalyticsDataMsgSchema, {
      eventType: AnalyticsEventType.ROOM,
      eventName: eventName,
      roomId: roomId,
      hsetValue: hsetValue,
    });
    await this.analyticsService.handleEvent(event);
  }
}
