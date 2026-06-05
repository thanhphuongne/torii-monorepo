/**
 * Speech To Text Service
 *
 * Handles legacy Azure Speech Services token generation and usage
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import {
  GenerateAzureTokenReq,
  AzureTokenRenewReq,
  SpeechServiceUserStatusReq,
  SpeechToTextTranslationReq,
  CommonResponse,
  SpeechServiceUserStatusTasks,
  CommonResponseSchema,
  NatsMsgServerToClientEvents,
  AnalyticsEventType,
  AnalyticsEvents,
  AnalyticsDataMsgSchema,
  AnalyticsStatus,
} from '@workspace/protocol';
import { create } from '@bufbuild/protobuf';
import { NatsRoomService } from '@server/meet/infrastructure/nats/nats-room.service';
import { RedisSpeechToTextService } from '@server/meet/infrastructure/redis/redis-speech-to-text.service';
import { NatsSystemEventsService } from '@server/meet/infrastructure/nats/nats-system-events.service';
import { WebhookNotifierService } from '@server/meet/infrastructure/webhook/webhook-notifier.service';
import { AnalyticsService } from '@server/meet/modules/analytics/analytics.service';
import { AppConfigService } from '@server/shared';

@Injectable()
export class SpeechToTextService {
  private readonly logger = new Logger(SpeechToTextService.name);

  /** Azure Speech backend đã gỡ khỏi config; STT/TTS dùng pipeline khác (vd. Gameni). */
  private static readonly LEGACY_AZURE_SPEECH_ENABLED = false;

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly natsRoomService: NatsRoomService,
    private readonly redisSpeechService: RedisSpeechToTextService,
    private readonly natsSystemEvents: NatsSystemEventsService,
    @Inject(forwardRef(() => WebhookNotifierService))
    private readonly webhookNotifier: WebhookNotifierService,
    @Inject(forwardRef(() => AnalyticsService))
    private readonly analyticsModel: AnalyticsService,
  ) {}

  /**
   * SpeechToTextTranslationServiceStart enables/disables the service for a room
   */
  async speechToTextTranslationServiceStart(
    roomId: string,
    r: SpeechToTextTranslationReq,
  ): Promise<CommonResponse> {
    if (!SpeechToTextService.LEGACY_AZURE_SPEECH_ENABLED) {
      throw new Error('Dịch vụ giọng nói Azure đã tắt (không còn trong cấu hình)');
    }

    const metadata = await this.natsRoomService.getRoomMetadataStruct(roomId);
    if (!metadata) throw new Error('Metadata phòng không hợp lệ');

    const f = metadata.roomFeatures?.speechToTextTranslationFeatures;
    if (!f) {
      throw new Error('Không tìm thấy tính năng speech-to-text trong metadata');
    }

    f.isEnabled = r.isEnabled;
    f.allowedSpeechLangs = r.allowedSpeechLangs;
    f.allowedSpeechUsers = r.allowedSpeechUsers;
    f.isEnabledTranslation = r.isEnabledTranslation;
    f.allowedTransLangs = r.allowedTransLangs;
    f.defaultSubtitleLang = r.defaultSubtitleLang;

    const updateMt = await this.natsRoomService.updateRoomMetadata(
      roomId,
      metadata,
    );
    await this.natsSystemEvents.broadcastSystemEventToRoom(
      NatsMsgServerToClientEvents.ROOM_METADATA_UPDATE,
      roomId,
      updateMt,
    );

    // Analytics
    let val = AnalyticsStatus[AnalyticsStatus.STARTED];
    if (!f.isEnabled) {
      val = AnalyticsStatus[AnalyticsStatus.ENDED];
    }

    await this.analyticsModel.handleEvent(
      create(AnalyticsDataMsgSchema, {
        eventType: AnalyticsEventType.ROOM,
        eventName: AnalyticsEvents.ANALYTICS_EVENT_ROOM_SPEECH_SERVICE_STATUS,
        roomId: roomId,
        hsetValue: val,
      }),
    );

    return create(CommonResponseSchema, { status: true, msg: 'success' });
  }

  /**
   * GenerateAzureToken generates a token for a user
   */
  async generateAzureToken(
    roomId: string,
    userId: string,
    r: GenerateAzureTokenReq,
  ): Promise<CommonResponse> {
    const check = await this.redisSpeechService.azureKeyRequestedTask(
      roomId,
      userId,
      'check',
    );
    if (check === 'exist') {
      throw new Error('speech-services.already-received-token');
    }

    const usage = await this.redisSpeechService.checkUserUsage(roomId, userId);
    if (usage !== '') {
      throw new Error('speech-services.already-using-service');
    }

    const metadata = await this.natsRoomService.getRoomMetadataStruct(roomId);
    if (
      !metadata ||
      !SpeechToTextService.LEGACY_AZURE_SPEECH_ENABLED ||
      !metadata.roomFeatures?.speechToTextTranslationFeatures?.isEnabled
    ) {
      throw new Error('speech-services.service-disabled');
    }

    // Azure is no longer supported, bypass token generation
    throw new Error('speech-services.azure-no-longer-supported');
  }

  async renewAzureToken(
    roomId: string,
    userId: string,
    r: AzureTokenRenewReq,
  ): Promise<CommonResponse> {
    throw new Error('speech-services.azure-no-longer-supported');
  }

  async speechServiceUserStatus(
    roomId: string,
    userId: string,
    r: SpeechServiceUserStatusReq,
  ): Promise<CommonResponse> {
    await this.redisSpeechService.updateUserStatus(r.keyId, r.task);
    return this.speechServiceUsersUsage(roomId, r.roomSid, userId, r.task);
  }

  private async speechServiceUsersUsage(
    roomId: string,
    rSid: string,
    userId: string,
    task: SpeechServiceUserStatusTasks,
  ): Promise<CommonResponse> {
    switch (task) {
      case SpeechServiceUserStatusTasks.SPEECH_TO_TEXT_SESSION_STARTED:
        await this.redisSpeechService.usersUsage(roomId, userId, task);
        // Webhook
        await this.sendToWebhookNotifier(roomId, rSid, userId, task, 0);
        // Analytics
        await this.analyticsModel.handleEvent(
          create(AnalyticsDataMsgSchema, {
            eventType: AnalyticsEventType.USER,
            eventName:
              AnalyticsEvents.ANALYTICS_EVENT_USER_SPEECH_SERVICES_STATUS,
            roomId: roomId,
            userId: userId,
            hsetValue: AnalyticsStatus[AnalyticsStatus.STARTED],
          }),
        );
        break;
      case SpeechServiceUserStatusTasks.SPEECH_TO_TEXT_SESSION_ENDED:
        const usage = await this.redisSpeechService.usersUsage(
          roomId,
          userId,
          task,
        );
        if (usage > 0) {
          // Webhook
          await this.sendToWebhookNotifier(roomId, rSid, userId, task, usage);
          // Analytics Status
          await this.analyticsModel.handleEvent(
            create(AnalyticsDataMsgSchema, {
              eventType: AnalyticsEventType.USER,
              eventName:
                AnalyticsEvents.ANALYTICS_EVENT_USER_SPEECH_SERVICES_STATUS,
              roomId: roomId,
              userId: userId,
              hsetValue: AnalyticsStatus[AnalyticsStatus.ENDED],
            }),
          );
          // Analytics Usage
          await this.analyticsModel.handleEvent(
            create(AnalyticsDataMsgSchema, {
              eventType: AnalyticsEventType.USER,
              eventName:
                AnalyticsEvents.ANALYTICS_EVENT_USER_SPEECH_SERVICES_USAGE,
              roomId: roomId,
              userId: userId,
              eventValueInteger: usage.toString(),
            }),
          );
        }
        break;
    }

    // Always remove from requested task list
    await this.redisSpeechService.azureKeyRequestedTask(
      roomId,
      userId,
      'remove',
    );
    return create(CommonResponseSchema, { status: true, msg: 'success' });
  }

  /**
   * OnAfterRoomEnded performs cleanup when a room ends
   */
  async onAfterRoomEnded(roomId: string, sId: string): Promise<void> {
    if (!sId) return;

    // Give some time for final requests to arrive
    const waitTime = this.appConfig.timeouts.waitBeforeSpeechCleanup;
    await new Promise((resolve) => setTimeout(resolve, waitTime));

    try {
      const hkeys = await this.redisSpeechService.getHashKeys(roomId);
      for (const k of hkeys) {
        if (k !== 'total_usage') {
          // Send ENDED status for each user still tracked
          await this.speechServiceUsersUsage(
            roomId,
            sId,
            k,
            SpeechServiceUserStatusTasks.SPEECH_TO_TEXT_SESSION_ENDED,
          );
        }
      }

      // Get total usage
      const usageStr =
        await this.redisSpeechService.getTotalUsageByRoomId(roomId);
      if (usageStr && usageStr !== '0') {
        const usage = parseInt(usageStr, 10);
        // Send usage via webhook notifier
        await this.sendToWebhookNotifier(
          roomId,
          sId,
          null,
          SpeechServiceUserStatusTasks.SPEECH_TO_TEXT_TOTAL_USAGE,
          usage,
        );

        // Send to analytics
        await this.analyticsModel.handleEvent(
          create(AnalyticsDataMsgSchema, {
            eventType: AnalyticsEventType.ROOM,
            eventName:
              AnalyticsEvents.ANALYTICS_EVENT_ROOM_SPEECH_SERVICE_TOTAL_USAGE,
            roomId: roomId,
            eventValueString: usageStr,
          }),
        );
      }

      // Final cleanup
      await this.redisSpeechService.deleteRoom(roomId);
    } catch (error) {
      this.logger.error(
        `Error in speech service cleanup for ${roomId}: ${error.message}`,
      );
    }
  }

  private async sendToWebhookNotifier(
    rId: string,
    rSid: string,
    userId: string | null,
    task: SpeechServiceUserStatusTasks,
    usage: number,
  ): Promise<void> {
    const event = SpeechServiceUserStatusTasks[task] || task.toString();
    const msg = {
      event: event,
      room: {
        sid: rSid,
        roomId: rId,
      },
      speechService: {
        userId: userId || undefined,
        totalUsage: BigInt(usage).toString(),
      },
    };

    try {
      await this.webhookNotifier.sendWebhookEvent(msg as any);
    } catch (error) {
      this.logger.error(
        `Failed to send speech service webhook: ${error.message}`,
      );
    }
  }
}
