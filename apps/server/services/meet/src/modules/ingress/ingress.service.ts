/**
 * Ingress Service
 *
 * Handles creation of LiveKit Ingress (RTMP/WHIP) sessions
 */

import { Injectable, Logger } from '@nestjs/common';
import { create } from '@bufbuild/protobuf';
import {
  CreateIngressReq,
  CreateIngressRes,
  CreateIngressResSchema,
  IngressInput as WajlcIngressInput,
  UserMetadataSchema,
  AnalyticsDataMsgSchema,
  AnalyticsEventType,
  AnalyticsEvents,
  LockSettingsSchema,
  NatsMsgServerToClientEvents,
} from '@workspace/protocol';
import { LiveKitService } from '@server/meet/infrastructure/livekit/livekit.service';
import { NatsRoomService } from '@server/meet/infrastructure/nats/nats-room.service';
import { NatsUserService } from '@server/meet/infrastructure/nats/nats-user.service';
import { NatsSystemEventsService } from '@server/meet/infrastructure/nats/nats-system-events.service';
import { AnalyticsService } from '@server/meet/modules/analytics/analytics.service';
import { AppConfigService } from '@server/shared';

import { IngressInput } from 'livekit-server-sdk';

@Injectable()
export class IngressService {
  private readonly logger = new Logger(IngressService.name);

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly livekitService: LiveKitService,
    private readonly natsRoomService: NatsRoomService,
    private readonly natsUserService: NatsUserService,
    private readonly natsSystemEvents: NatsSystemEventsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /**
   * CreateIngress creates a new LiveKit ingress session
   */
  async createIngress(req: CreateIngressReq): Promise<CreateIngressRes> {
    this.logger.log(
      `Request to create ingress: roomId=${req.roomId}, inputType=${WajlcIngressInput[req.inputType]}`,
    );

    // 1. Get room metadata
    const metadata = await this.natsRoomService.getRoomMetadataStruct(
      req.roomId,
    );
    if (!metadata) {
      throw new Error('Thông tin metadata phòng không hợp lệ hoặc trống');
    }

    const ingressFeatures = metadata.roomFeatures?.ingressFeatures;
    if (!ingressFeatures?.isAllow) {
      throw new Error('Phòng không được phép dùng ingress');
    }
    if (ingressFeatures.streamKey && ingressFeatures.streamKey !== '') {
      throw new Error('Không được tạo nhiều ingress cùng lúc');
    }

    // 2. Map input type
    let inputType = IngressInput.RTMP_INPUT;
    if (req.inputType === WajlcIngressInput.WHIP_INPUT) {
      inputType = IngressInput.WHIP_INPUT;
    }

    // 3. Prepare Livekit Ingress options
    const ingressUserIdPrefix = this.appConfig.ingress.userIdPrefix;
    const participantIdentity = `${ingressUserIdPrefix}${Date.now()}`;

    const options = {
      name: `${req.roomId}:1`,
      roomName: req.roomId,
      participantIdentity: participantIdentity,
      participantName: req.participantName,
    };

    this.logger.log(
      `Creating ingress with livekit: identity=${participantIdentity}`,
    );

    // 4. Create Ingress via LiveKit client
    const lkIngressInfo = await this.livekitService.createIngress(
      inputType,
      options,
    );
    if (!lkIngressInfo) {
      throw new Error('LiveKit trả về phản hồi tạo ingress không hợp lệ');
    }

    // 5. Add ingress user to NATS (bot user)
    this.logger.log('Adding ingress participant to NATS user bucket');
    const userMetadata = create(UserMetadataSchema, {
      isAdmin: true,
      recordWebcam: true,
      waitForApproval: false,
      lockSettings: create(LockSettingsSchema, {
        lockWebcam: false,
        lockMicrophone: false,
      }),
    });

    await this.natsUserService.addUser(
      req.roomId,
      participantIdentity,
      req.participantName,
      true, // isAdmin
      false, // isPresenter (usually ingress bot is not a presenter)
      userMetadata,
    );

    // 6. Update room metadata with ingress info
    ingressFeatures.inputType = req.inputType;
    ingressFeatures.url = lkIngressInfo.url;
    ingressFeatures.streamKey = lkIngressInfo.streamKey;

    this.logger.log(
      'Updating and broadcasting room metadata with ingress info',
    );
    const updateMt = await this.natsRoomService.updateRoomMetadata(
      req.roomId,
      metadata,
    );
    await this.natsSystemEvents.broadcastSystemEventToRoom(
      NatsMsgServerToClientEvents.ROOM_METADATA_UPDATE,
      req.roomId,
      updateMt,
    );

    // 7. Send analytics
    await this.analyticsService.handleEvent(
      create(AnalyticsDataMsgSchema, {
        eventType: AnalyticsEventType.ROOM,
        eventName: AnalyticsEvents.ANALYTICS_EVENT_ROOM_INGRESS_CREATED,
        roomId: req.roomId,
      }),
    );

    this.logger.log('Successfully created ingress');

    return create(CreateIngressResSchema, {
      status: true,
      msg: 'success',
      url: lkIngressInfo.url,
      streamKey: lkIngressInfo.streamKey,
    });
  }
}
