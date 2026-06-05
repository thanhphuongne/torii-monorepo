import { Injectable, Logger } from '@nestjs/common';
import { NatsRoomService } from '@server/meet/infrastructure/nats/nats-room.service';
import { NatsUserService } from '@server/meet/infrastructure/nats/nats-user.service';
import { NatsSystemEventsService } from '@server/meet/infrastructure/nats/nats-system-events.service';
import { NatsService } from '@server/meet/infrastructure/nats/nats.service';
import { AnalyticsService } from '@server/meet/modules/analytics/analytics.service';
import {
  ExternalMediaPlayerReq,
  ExternalMediaPlayerTask,
  NatsMsgServerToClientEvents,
  AnalyticsEventType,
  AnalyticsEvents,
  AnalyticsStatus,
  AnalyticsDataMsgSchema,
} from '@workspace/protocol';
import { create } from '@bufbuild/protobuf';

@Injectable()
export class ExternalMediaService {
  private readonly logger = new Logger(ExternalMediaService.name);

  constructor(
    private readonly natsRoomService: NatsRoomService,
    private readonly natsUserService: NatsUserService,
    private readonly natsSystemEvents: NatsSystemEventsService,
    private readonly natsService: NatsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /**
   * HandleRequest processes start/end/update external media requests
   */
  async handleRequest(req: ExternalMediaPlayerReq): Promise<void> {
    this.logger.log(
      `External media request for room ${req.roomId}, task: ${req.task}`,
    );

    // 1. Validation
    await this.validateRequest(req);

    switch (req.task) {
      case ExternalMediaPlayerTask.START_PLAYBACK:
        await this.startExternalMediaPlayBack(req);
        break;
      case ExternalMediaPlayerTask.END_PLAYBACK:
        await this.endExternalMediaPlayBack(req);
        break;
      default:
        throw new Error('Yêu cầu không hợp lệ');
    }
  }

  private async validateRequest(req: ExternalMediaPlayerReq): Promise<void> {
    const { info, metadata } =
      await this.natsRoomService.getRoomInfoWithMetadata(req.roomId);
    if (!info || !metadata) {
      throw new Error('Không tìm thấy phòng');
    }

    const feature = metadata.roomFeatures?.externalMediaPlayerFeatures;
    if (!feature) {
      throw new Error('Không tìm thấy tính năng phát media ngoài trong metadata');
    }

    // Check user
    const status = await this.natsUserService.getRoomUserStatus(
      req.roomId,
      req.userId,
    );
    if (status !== 'online') {
      throw new Error('Người dùng không hoạt động');
    }

    // Check permission if not admin
    const userMeta = await this.natsUserService.getUserMetadataStruct(
      req.roomId,
      req.userId,
    );
    if (!userMeta?.isAdmin && !userMeta?.isPresenter) {
      throw new Error('Không có quyền');
    }
  }

  private async startExternalMediaPlayBack(
    req: ExternalMediaPlayerReq,
  ): Promise<void> {
    if (!req.url || req.url.trim() === '') {
      throw new Error('Cần URL hợp lệ');
    }

    const active = true;
    await this.updateExternalMediaRoomMetadata(req.roomId, {
      isActive: active,
      url: req.url,
      sharedBy: req.userId,
    });

    // Broadcast Event via Data Channel for START
    // but does in update handler. NestJS previous code gathered logic.
    // We will keep the data channel broadcast as it was in original NestJS code if needed,
    // It also sends analytics.
  }

  private async endExternalMediaPlayBack(
    req: ExternalMediaPlayerReq,
  ): Promise<void> {
    const active = false;
    await this.updateExternalMediaRoomMetadata(req.roomId, {
      isActive: active,
    });
  }

  private async updateExternalMediaRoomMetadata(
    roomId: string,
    opts: { isActive?: boolean; url?: string; sharedBy?: string },
  ): Promise<void> {
    this.logger.log(
      `Updating room metadata for external media player: ${roomId}`,
    );

    const { info, metadata } =
      await this.natsRoomService.getRoomInfoWithMetadata(roomId);
    if (!info || !metadata) {
      throw new Error('Không tìm thấy phòng');
    }

    const feature = metadata.roomFeatures?.externalMediaPlayerFeatures;
    if (!feature) {
      throw new Error('Không tìm thấy tính năng phát media ngoài trong metadata');
    }

    if (opts.isActive !== undefined) {
      feature.isActive = opts.isActive;
    }
    if (opts.url !== undefined) {
      feature.url = opts.url;
    }
    if (opts.sharedBy !== undefined) {
      feature.sharedBy = opts.sharedBy;
    }

    await this.natsRoomService.updateRoomMetadata(roomId, metadata);

    // Notify room about metadata update
    await this.natsSystemEvents.broadcastSystemEventToRoom(
      NatsMsgServerToClientEvents.ROOM_METADATA_UPDATE,
      roomId,
      this.natsService.marshalRoomMetadata(metadata),
    );

    // Send Analytics
    const val = feature.isActive
      ? AnalyticsStatus.STARTED.toString()
      : AnalyticsStatus.ENDED.toString();
    const analyticsMsg = create(AnalyticsDataMsgSchema, {
      eventType: AnalyticsEventType.ROOM,
      eventName:
        AnalyticsEvents.ANALYTICS_EVENT_ROOM_EXTERNAL_MEDIA_PLAYER_STATUS,
      roomId: roomId,
      hsetValue: val,
    });
    await this.analyticsService.handleEvent(analyticsMsg);
  }
}
