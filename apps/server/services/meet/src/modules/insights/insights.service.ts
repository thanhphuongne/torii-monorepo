/**
 * Insights Service
 *
 * Coordinator for AI-powered features
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { create } from '@bufbuild/protobuf';
import {
  InsightsTranscriptionConfigReq,
  InsightsTranscriptionUserSessionReq,
  InsightsChatTranslationConfigReq,
  InsightsTranslateTextReq,
  InsightsAITextChatConfigReq,
  InsightsAITextChatContent,
  InsightsAIMeetingSummarizationConfigReq,
  CommonResponse,
  InsightsSupportedLangInfo,
  InsightsSupportedLangInfoSchema,
  CommonResponseSchema,
  InsightsUserSessionAction,
  AnalyticsEventType,
  AnalyticsEvents,
  AnalyticsDataMsgSchema,
  NatsSystemNotificationTypes,
  NatsMsgServerToClientEvents,
  InsightsAITextChatContentSchema,
} from '@workspace/protocol';
import { NatsSystemEventsService } from '@server/meet/infrastructure/nats/nats-system-events.service';
import { NatsUserService } from '@server/meet/infrastructure/nats/nats-user.service';
import { NatsRoomService } from '@server/meet/infrastructure/nats/nats-room.service';
import { RedisInsightsService } from '@server/meet/infrastructure/redis/redis-insights.service';
import { ArtifactsService } from '@server/meet/modules/artifacts/artifacts.service';
import { AnalyticsService } from '@server/meet/modules/analytics/analytics.service';
import { InsightsProviderService } from './insights.provider';
import { v4 as uuidv4 } from 'uuid';
import {
  InsightsTaskPayload,
  InsightsServiceType,
  InsightsTaskType,
  AgentTaskResponse,
} from './insights.types';
import { AppConfigService } from '@server/shared';

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  /** Khớp Sensei / roleplay (`fastmcp`: gemini-2.5-flash). */
  private static readonly DEFAULT_GEMINI_INSIGHTS_MODEL = 'gemini-2.5-flash';

  constructor(
    private readonly appConfig: AppConfigService,
    @Inject('NATS_CLIENT') private readonly natsClient: ClientProxy,
    private readonly natsRoomService: NatsRoomService,
    private readonly natsUserService: NatsUserService,
    @Inject(forwardRef(() => NatsSystemEventsService))
    private readonly natsSystemEvents: NatsSystemEventsService,
    private readonly redisInsightsService: RedisInsightsService,
    private readonly artifactsService: ArtifactsService,
    @Inject(forwardRef(() => AnalyticsService))
    private readonly analyticsService: AnalyticsService,
    private readonly insightsProvider: InsightsProviderService,
  ) {}

  /** Model AI text chat / tóm tắt từ `insights.services.ai_text_chat.options` trong config.yaml */
  private getAiTextChatModel(kind: 'chat' | 'summarize'): string {
    const opts = this.appConfig.insights?.services?.ai_text_chat
      ?.options as Record<string, string> | undefined;
    if (!opts) return InsightsService.DEFAULT_GEMINI_INSIGHTS_MODEL;
    if (kind === 'summarize' && opts.summarize_model) {
      return opts.summarize_model;
    }
    if (opts.chat_model) return opts.chat_model;
    return InsightsService.DEFAULT_GEMINI_INSIGHTS_MODEL;
  }

  /**
   * TranscriptionConfigure configures the real-time transcription agent
   */
  async transcriptionConfigure(
    roomId: string,
    r: InsightsTranscriptionConfigReq,
  ): Promise<CommonResponse> {
    const metadata = await this.natsRoomService.getRoomMetadataStruct(roomId);
    if (!metadata) throw new Error('Metadata phòng không hợp lệ');

    // Check E2EE
    if (
      metadata.roomFeatures?.endToEndEncryptionFeatures
        ?.enabledSelfInsertEncryptionKey
    ) {
      throw new Error('insights.feature-disable-while-e2ee-self-key-enabled');
    }

    const insightsFeatures = metadata.roomFeatures?.insightsFeatures;
    if (!insightsFeatures?.isAllow) {
      throw new Error('Phòng không được phép dùng tính năng Insights');
    }
    if (!insightsFeatures.transcriptionFeatures?.isAllow) {
      throw new Error('Phòng không được phép dùng phiên âm');
    }

    // Disable legacy Azure STT if enabled
    if (metadata.roomFeatures?.speechToTextTranslationFeatures?.isEnabled) {
      metadata.roomFeatures.speechToTextTranslationFeatures.isEnabled = false;
    }

    const roomInfo = await this.natsRoomService.getRoomInfo(roomId);
    const usersMap: Record<string, boolean> = {};
    for (const user of r.allowedSpeechUsers) {
      usersMap[user] = true;
    }

    // First: Update metadata
    const transFeatures = insightsFeatures.transcriptionFeatures;
    transFeatures.isEnabled = true;
    transFeatures.allowedSpokenLangs = r.allowedSpokenLangs;
    transFeatures.allowedSpeechUsers = r.allowedSpeechUsers;
    transFeatures.defaultSubtitleLang = r.defaultSubtitleLang;

    if (transFeatures.isAllowTranslation) {
      transFeatures.isEnabledTranslation = r.isEnabledTranslation;
      transFeatures.allowedTransLangs = r.allowedTransLangs;
    }
    if (transFeatures.isAllowSpeechSynthesis) {
      transFeatures.isEnabledSpeechSynthesis = r.isEnabledSpeechSynthesis;
    }

    // Second: Prepare payload for agent
    const payload: InsightsTaskPayload = {
      task: InsightsTaskType.ConfigureAgent,
      service_type: InsightsServiceType.Transcription,
      room_id: roomId,
      room_table_id: roomInfo ? Number(roomInfo.dbTableId) : 0,
      enabled_transcription_trans_synthesis: r.isEnabledSpeechSynthesis,
      allowed_trans_langs: transFeatures.allowedTransLangs,
      target_users: usersMap,
      hidden_agent: true,
    };

    if (metadata.roomFeatures?.endToEndEncryptionFeatures?.isEnabled) {
      payload.room_e2ee_key =
        metadata.roomFeatures.endToEndEncryptionFeatures.encryptionKey;
    }

    // Third: Configure agent
    await this.configureAgent(payload);

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
    await this.analyticsService.handleEvent(
      create(AnalyticsDataMsgSchema, {
        eventType: AnalyticsEventType.ROOM,
        eventName:
          AnalyticsEvents.ANALYTICS_EVENT_ROOM_INSIGHTS_TRANSCRIPTION_STATUS,
        roomId: roomId,
        hsetValue: 'started',
      }),
    );

    return create(CommonResponseSchema, { status: true, msg: 'success' });
  }

  /**
   * TranscriptionUserSession handles starting/stopping a user's transcription session
   */
  async transcriptionUserSession(
    roomId: string,
    userId: string,
    r: InsightsTranscriptionUserSessionReq,
  ): Promise<CommonResponse> {
    if (r.action === InsightsUserSessionAction.USER_SESSION_ACTION_START) {
      if (!r.spokenLang) {
        throw new Error('Cần chọn ngôn ngữ nói');
      }

      const metadata = await this.natsRoomService.getRoomMetadataStruct(roomId);
      if (!metadata) throw new Error('Metadata phòng không hợp lệ');

      if (
        metadata.roomFeatures?.endToEndEncryptionFeatures
          ?.enabledSelfInsertEncryptionKey
      ) {
        throw new Error('insights.feature-disable-while-e2ee-self-key-enabled');
      }

      const userInfo = await this.natsUserService.getUserInfo(roomId, userId);
      if (!userInfo) throw new Error('Thiếu thông tin người dùng');

      const options = {
        spokenLang: r.spokenLang,
        userName: userInfo.name,
        allowedTranscriptionStorage: r.allowedTranscriptionStorage,
        transLangs: metadata.roomFeatures?.insightsFeatures
          ?.transcriptionFeatures?.isEnabledTranslation
          ? metadata.roomFeatures.insightsFeatures.transcriptionFeatures
              .allowedTransLangs
          : [],
      };

      const roomInfo = await this.natsRoomService.getRoomInfo(roomId);
      const payload: InsightsTaskPayload = {
        task: InsightsTaskType.UserStart,
        service_type: InsightsServiceType.Transcription,
        room_id: roomId,
        room_table_id: roomInfo ? Number(roomInfo.dbTableId) : 0,
        user_id: userId,
        options: new TextEncoder().encode(JSON.stringify(options)),
      };

      await this.configureAgent(payload);

      // Track session start in Redis
      await this.redisInsightsService.handleTranscriptionUsage(
        roomId,
        userId,
        true,
      );

      return create(CommonResponseSchema, { status: true, msg: 'success' });
    } else if (
      r.action === InsightsUserSessionAction.USER_SESSION_ACTION_STOP
    ) {
      const roomInfo = await this.natsRoomService.getRoomInfo(roomId);
      const payload: InsightsTaskPayload = {
        task: InsightsTaskType.UserEnd,
        service_type: InsightsServiceType.Transcription,
        room_id: roomId,
        room_table_id: roomInfo ? Number(roomInfo.dbTableId) : 0,
        user_id: userId,
      };

      await this.configureAgent(payload);

      // Track session end in Redis
      await this.redisInsightsService.handleTranscriptionUsage(
        roomId,
        userId,
        false,
      );

      return create(CommonResponseSchema, { status: true, msg: 'success' });
    }

    throw new Error(`Thao tác không xác định: '${r.action}'`);
  }

  async endTranscription(roomId: string): Promise<CommonResponse> {
    const payload: InsightsTaskPayload = {
      task: InsightsTaskType.EndRoomAgentByServiceName,
      service_type: InsightsServiceType.Transcription,
      room_id: roomId,
      room_table_id: 0,
    };

    await this.configureAgent(payload);

    const metadata = await this.natsRoomService.getRoomMetadataStruct(roomId);
    if (
      metadata &&
      metadata.roomFeatures?.insightsFeatures?.transcriptionFeatures
    ) {
      const transFeatures =
        metadata.roomFeatures.insightsFeatures.transcriptionFeatures;
      transFeatures.isEnabled = false;
      transFeatures.isEnabledTranslation = false;
      transFeatures.isEnabledSpeechSynthesis = false;
      const updateMt = await this.natsRoomService.updateRoomMetadata(
        roomId,
        metadata,
      );
      await this.natsSystemEvents.broadcastSystemEventToRoom(
        NatsMsgServerToClientEvents.ROOM_METADATA_UPDATE,
        roomId,
        updateMt,
      );
    }

    // Analytics
    await this.analyticsService.handleEvent(
      create(AnalyticsDataMsgSchema, {
        eventType: AnalyticsEventType.ROOM,
        eventName:
          AnalyticsEvents.ANALYTICS_EVENT_ROOM_INSIGHTS_TRANSCRIPTION_STATUS,
        roomId: roomId,
        hsetValue: 'ended',
      }),
    );

    return create(CommonResponseSchema, { status: true, msg: 'success' });
  }

  /**
   * ChatTranslationConfigure configures chat translation
   */
  async chatTranslationConfigure(
    roomId: string,
    r: InsightsChatTranslationConfigReq,
  ): Promise<CommonResponse> {
    const metadata = await this.natsRoomService.getRoomMetadataStruct(roomId);
    if (!metadata) throw new Error('Metadata phòng không hợp lệ');

    const chatTransFeatures =
      metadata.roomFeatures?.insightsFeatures?.chatTranslationFeatures;
    if (!chatTransFeatures?.isAllow) {
      throw new Error('Phòng không được phép dùng dịch chat');
    }

    if (r.allowedTransLangs.length > chatTransFeatures.maxSelectedTransLangs) {
      throw new Error('Vượt quá số ngôn ngữ được chọn tối đa');
    }

    chatTransFeatures.isEnabled = true;
    chatTransFeatures.allowedTransLangs = r.allowedTransLangs;
    chatTransFeatures.maxSelectedTransLangs =
      this.appConfig.insights.maxChatTransLangs;

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
    await this.analyticsService.handleEvent(
      create(AnalyticsDataMsgSchema, {
        eventType: AnalyticsEventType.ROOM,
        eventName:
          AnalyticsEvents.ANALYTICS_EVENT_ROOM_INSIGHTS_CHAT_TRANSLATION_STATUS,
        roomId: roomId,
        hsetValue: 'started',
      }),
    );

    return create(CommonResponseSchema, { status: true, msg: 'success' });
  }

  async chatEndTranslation(roomId: string): Promise<CommonResponse> {
    const metadata = await this.natsRoomService.getRoomMetadataStruct(roomId);
    if (
      metadata &&
      metadata.roomFeatures?.insightsFeatures?.chatTranslationFeatures
    ) {
      metadata.roomFeatures.insightsFeatures.chatTranslationFeatures.isEnabled = false;
      const updateMt = await this.natsRoomService.updateRoomMetadata(
        roomId,
        metadata,
      );
      await this.natsSystemEvents.broadcastSystemEventToRoom(
        NatsMsgServerToClientEvents.ROOM_METADATA_UPDATE,
        roomId,
        updateMt,
      );
    }

    // Analytics
    await this.analyticsService.handleEvent(
      create(AnalyticsDataMsgSchema, {
        eventType: AnalyticsEventType.ROOM,
        eventName:
          AnalyticsEvents.ANALYTICS_EVENT_ROOM_INSIGHTS_CHAT_TRANSLATION_STATUS,
        roomId: roomId,
        hsetValue: 'ended',
      }),
    );

    return create(CommonResponseSchema, { status: true, msg: 'success' });
  }

  /**
   * ExecuteChatTranslation performs text translation
   */
  async executeChatTranslation(
    roomId: string,
    userId: string,
    r: InsightsTranslateTextReq,
  ): Promise<any> {
    try {
      const res = await this.insightsProvider.translateText(
        r.text,
        r.sourceLang,
        r.targetLangs,
      );

      if (res) {
        await this.redisInsightsService.incrementChatTranslationUsage(
          roomId,
          userId,
          r.text.length,
        );
      }

      return {
        status: true,
        msg: 'success',
        result: res,
      };
    } catch (error) {
      this.logger.error(`Chat translation failed: ${error.message}`);
      return {
        status: false,
        msg: error.message,
      };
    }
  }

  /**
   * AITextChatConfigure configures AI chat
   */
  async aiTextChatConfigure(
    roomId: string,
    r: InsightsAITextChatConfigReq,
  ): Promise<CommonResponse> {
    const metadata = await this.natsRoomService.getRoomMetadataStruct(roomId);
    if (!metadata) throw new Error('Metadata phòng không hợp lệ');

    const aiFeatures = metadata.roomFeatures?.insightsFeatures?.aiFeatures;
    if (!aiFeatures?.isAllow || !aiFeatures.aiTextChatFeatures?.isAllow) {
      throw new Error('Phòng không được phép dùng chat AI');
    }

    aiFeatures.aiTextChatFeatures.isEnabled = true;
    aiFeatures.aiTextChatFeatures.isAllowedEveryone = r.isAllowedEveryone;
    aiFeatures.aiTextChatFeatures.allowedUserIds = r.allowedUserIds;

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
    await this.analyticsService.handleEvent(
      create(AnalyticsDataMsgSchema, {
        eventType: AnalyticsEventType.ROOM,
        eventName:
          AnalyticsEvents.ANALYTICS_EVENT_ROOM_INSIGHTS_AI_TEXT_CHAT_STATUS,
        roomId: roomId,
        hsetValue: 'started',
      }),
    );

    return create(CommonResponseSchema, { status: true, msg: 'success' });
  }

  async endAITextChat(roomId: string): Promise<CommonResponse> {
    const metadata = await this.natsRoomService.getRoomMetadataStruct(roomId);
    if (
      metadata &&
      metadata.roomFeatures?.insightsFeatures?.aiFeatures?.aiTextChatFeatures
    ) {
      metadata.roomFeatures.insightsFeatures.aiFeatures.aiTextChatFeatures.isEnabled = false;
      const updateMt = await this.natsRoomService.updateRoomMetadata(
        roomId,
        metadata,
      );
      await this.natsSystemEvents.broadcastSystemEventToRoom(
        NatsMsgServerToClientEvents.ROOM_METADATA_UPDATE,
        roomId,
        updateMt,
      );
    }

    // Analytics
    await this.analyticsService.handleEvent(
      create(AnalyticsDataMsgSchema, {
        eventType: AnalyticsEventType.ROOM,
        eventName:
          AnalyticsEvents.ANALYTICS_EVENT_ROOM_INSIGHTS_AI_TEXT_CHAT_STATUS,
        roomId: roomId,
        hsetValue: 'ended',
      }),
    );

    return create(CommonResponseSchema, { status: true, msg: 'success' });
  }

  /**
   * ExecuteAITextChat sends a message to AI and manages conversation history
   */
  async executeAITextChat(
    roomId: string,
    userId: string,
    r: InsightsAITextChatContent,
  ): Promise<CommonResponse> {
    const metadata = await this.natsRoomService.getRoomMetadataStruct(roomId);
    if (!metadata) throw new Error('Metadata phòng không hợp lệ');

    const aiFeatures = metadata.roomFeatures?.insightsFeatures?.aiFeatures;
    if (!aiFeatures?.isAllow || !aiFeatures.aiTextChatFeatures?.isAllow) {
      throw new Error('Phòng không được phép dùng chat AI');
    }

    let foundUser = aiFeatures.aiTextChatFeatures.isAllowedEveryone;
    if (!foundUser) {
      if (aiFeatures.aiTextChatFeatures.allowedUserIds.includes(userId)) {
        foundUser = true;
      }
    }

    if (!foundUser) {
      throw new Error('Bạn không được phép dùng dịch vụ này');
    }

    // 1. Build history (SYNC)
    const history = await this.buildHistoryWithUserPrompt(
      roomId,
      userId,
      r.text,
      metadata,
    );

    // 2. Launch background processing (ASYNC)
    const chatModel = this.getAiTextChatModel('chat');

    // Fire and forget logic
    (async () => {
      try {
        let fullResponse = '';
        let promptTokens = 0;
        let completionTokens = 0;
        let totalTokens = 0;

        const stream = this.insightsProvider.aiTextChatStream(
          chatModel,
          history,
        );

        for await (const chunk of stream) {
          if (chunk.isLastChunk) {
            promptTokens = chunk.promptTokens;
            completionTokens = chunk.completionTokens;
            totalTokens = chunk.totalTokens;
          } else {
            fullResponse += chunk.text;
          }

          // Broadcast chunk to room via NATS
          await this.natsSystemEvents.broadcastSystemEventToRoom(
            NatsMsgServerToClientEvents.RESP_INSIGHTS_AI_TEXT_CHAT,
            roomId,
            JSON.stringify(chunk),
            userId,
          );
        }

        // 3. Append AI response to history
        const aiMsg = create(InsightsAITextChatContentSchema, {
          role: 3, // MODEL
          text: fullResponse,
        });
        await this.redisInsightsService.appendToAITextChatContext(
          roomId,
          userId,
          aiMsg,
        );

        // 4. Update token usage
        await this.redisInsightsService.updateAITextChatUsage(
          roomId,
          userId,
          'chat',
          promptTokens,
          completionTokens,
          totalTokens,
        );

        // 5. Trigger background summarization
        this.checkAndSummarize(roomId, userId, metadata).catch((err) => {
          this.logger.error(`Failed to summarize AI chat: ${err.message}`);
        });
      } catch (error) {
        this.logger.error(`AI Chat background task failed: ${error.message}`);
      }
    })();

    return create(CommonResponseSchema, { status: true, msg: 'success' });
  }

  private async buildHistoryWithUserPrompt(
    roomId: string,
    userId: string,
    prompt: string,
    metadata: any,
  ): Promise<InsightsAITextChatContent[]> {
    const history: InsightsAITextChatContent[] = [];

    // 1. Get summary
    const summary = await this.redisInsightsService.getAITextChatSummary(
      roomId,
      userId,
    );
    if (summary) {
      history.push(
        create(InsightsAITextChatContentSchema, {
          role: 1, // SYSTEM
          text: `This is a summary of the previous conversation: ${summary}`,
        }),
      );
    }

    // 2. Get recent context
    const contextWindow = this.appConfig.insights?.contextWindow || 5;
    const contextMessages =
      await this.redisInsightsService.getAITextChatContext(
        roomId,
        userId,
        -contextWindow,
        -1,
      );
    if (contextMessages && contextMessages.length > 0) {
      history.push(...contextMessages);
    }

    // 3. Append new user prompt
    const userMsg = create(InsightsAITextChatContentSchema, {
      role: 2, // USER
      text: prompt,
      streamId: uuidv4(),
    });
    history.push(userMsg);

    // 4. Update context in Redis
    await this.redisInsightsService.appendToAITextChatContext(
      roomId,
      userId,
      userMsg,
    );

    return history;
  }

  private async checkAndSummarize(
    roomId: string,
    userId: string,
    metadata: any,
  ): Promise<void> {
    const contextWindow = this.appConfig.insights?.contextWindow || 5;
    const length = await this.redisInsightsService.getAITextChatContextLength(
      roomId,
      userId,
    );

    if (length < contextWindow) {
      return;
    }

    this.logger.log(
      `Context window reached for AI chat, starting summarization for user ${userId} in room ${roomId}`,
    );

    // Get history for summarization
    const summary = await this.redisInsightsService.getAITextChatSummary(
      roomId,
      userId,
    );
    const contextMessages =
      await this.redisInsightsService.getAITextChatContext(
        roomId,
        userId,
        -contextWindow,
        -1,
      );

    const historyToSummarize: InsightsAITextChatContent[] = [];
    if (summary) {
      historyToSummarize.push(
        create(InsightsAITextChatContentSchema, {
          role: 1, // SYSTEM
          text: `This is a summary of the previous conversation: ${summary}`,
        }),
      );
    }
    historyToSummarize.push(...contextMessages);

    // Call provider to summarize
    const summarizeModel = this.getAiTextChatModel('summarize');

    try {
      const res = await this.insightsProvider.aiChatTextSummarize(
        summarizeModel,
        historyToSummarize,
      );

      if (res.summary) {
        // Update summary in Redis
        await this.redisInsightsService.setAITextChatSummary(
          roomId,
          userId,
          res.summary,
        );

        // Update token usage for summarization
        await this.redisInsightsService.updateAITextChatUsage(
          roomId,
          userId,
          'summarize',
          res.promptTokens,
          res.completionTokens,
          res.promptTokens + res.completionTokens,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to summarize chat history: ${error.message}`);
    }
  }

  /**
   * MeetingSummarizationConfigure configures summarization
   */
  async meetingSummarizationConfigure(
    roomId: string,
    r: InsightsAIMeetingSummarizationConfigReq,
  ): Promise<CommonResponse> {
    const metadata = await this.natsRoomService.getRoomMetadataStruct(roomId);
    if (!metadata) throw new Error('Metadata phòng không hợp lệ');

    const aiFeatures = metadata.roomFeatures?.insightsFeatures?.aiFeatures;
    if (
      !aiFeatures?.isAllow ||
      !aiFeatures.meetingSummarizationFeatures?.isAllow
    ) {
      throw new Error(
        'Phòng không được phép dùng tóm tắt cuộc họp',
      );
    }

    if (
      metadata.roomFeatures?.endToEndEncryptionFeatures
        ?.enabledSelfInsertEncryptionKey
    ) {
      throw new Error('insights.feature-disable-while-e2ee-self-key-enabled');
    }

    // First: Update metadata
    aiFeatures.meetingSummarizationFeatures.isEnabled = true;
    aiFeatures.meetingSummarizationFeatures.summarizationPrompt =
      r.summarizationPrompt;

    // Second: Prepare and configure agent
    const roomInfo = await this.natsRoomService.getRoomInfo(roomId);
    const payload: InsightsTaskPayload = {
      task: InsightsTaskType.ConfigureAgent,
      service_type: InsightsServiceType.MeetingSummarizing,
      room_id: roomId,
      room_table_id: roomInfo ? Number(roomInfo.dbTableId) : 0,
      room_e2ee_key:
        metadata.roomFeatures?.endToEndEncryptionFeatures?.encryptionKey,
      capture_all_participants_tracks: true,
      hidden_agent: true,
      options: new TextEncoder().encode(r.summarizationPrompt),
    };

    await this.configureAgent(payload);

    // Third: Broadcast metadata update
    const updateMt = await this.natsRoomService.updateRoomMetadata(
      roomId,
      metadata,
    );
    await this.natsSystemEvents.broadcastSystemEventToRoom(
      NatsMsgServerToClientEvents.ROOM_METADATA_UPDATE,
      roomId,
      updateMt,
    );

    // Fourth: Analytics
    await this.analyticsService.handleEvent(
      create(AnalyticsDataMsgSchema, {
        eventType: AnalyticsEventType.ROOM,
        eventName:
          AnalyticsEvents.ANALYTICS_EVENT_ROOM_INSIGHTS_AI_MEETING_SUMMARIZATION_STATUS,
        roomId: roomId,
        hsetValue: 'started',
      }),
    );

    // Fifth: Notify room
    await this.natsSystemEvents.broadcastSystemNotificationToRoom(
      roomId,
      'insights.meeting-summarization.enabled-notification-all',
      NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_INFO,
      true,
    );

    return create(CommonResponseSchema, { status: true, msg: 'success' });
  }

  async endAIMeetingSummarization(roomId: string): Promise<CommonResponse> {
    const payload: InsightsTaskPayload = {
      task: InsightsTaskType.EndRoomAgentByServiceName,
      service_type: InsightsServiceType.MeetingSummarizing,
      room_id: roomId,
      room_table_id: 0,
    };

    await this.configureAgent(payload);

    const metadata = await this.natsRoomService.getRoomMetadataStruct(roomId);
    if (
      metadata &&
      metadata.roomFeatures?.insightsFeatures?.aiFeatures
        ?.meetingSummarizationFeatures
    ) {
      metadata.roomFeatures.insightsFeatures.aiFeatures.meetingSummarizationFeatures.isEnabled = false;
      const updateMt = await this.natsRoomService.updateRoomMetadata(
        roomId,
        metadata,
      );
      await this.natsSystemEvents.broadcastSystemEventToRoom(
        NatsMsgServerToClientEvents.ROOM_METADATA_UPDATE,
        roomId,
        updateMt,
      );
    }

    // Analytics
    await this.analyticsService.handleEvent(
      create(AnalyticsDataMsgSchema, {
        eventType: AnalyticsEventType.ROOM,
        eventName:
          AnalyticsEvents.ANALYTICS_EVENT_ROOM_INSIGHTS_AI_MEETING_SUMMARIZATION_STATUS,
        roomId: roomId,
        hsetValue: 'ended',
      }),
    );

    return create(CommonResponseSchema, { status: true, msg: 'success' });
  }

  async checkBatchJobStatus(jobId: string): Promise<any> {
    const payload: InsightsTaskPayload = {
      task: InsightsTaskType.CheckBatchJobStatus,
      service_type: InsightsServiceType.MeetingSummarizing,
      room_id: '',
      room_table_id: 0,
      options: new TextEncoder().encode(jobId),
    };

    return await firstValueFrom(
      this.natsClient.send<any>('meet.insights', payload),
    );
  }

  async deleteUploadedFile(fileName: string): Promise<any> {
    const payload: InsightsTaskPayload = {
      task: InsightsTaskType.DeleteUploadedFile,
      service_type: InsightsServiceType.MeetingSummarizing,
      room_id: '',
      room_table_id: 0,
      options: new TextEncoder().encode(fileName),
    };

    return await firstValueFrom(
      this.natsClient.send<any>('meet.insights', payload),
    );
  }

  /**
   * configureAgent sends a NATS request to the agent coordinator channel
   */
  private async configureAgent(payload: InsightsTaskPayload): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.natsClient.send<AgentTaskResponse>(
          'meet.insights',
          payload,
        ),
      );
      if (!res.status) {
        throw new Error(res.msg || 'Agent xử lý tác vụ thất bại');
      }
    } catch (error) {
      this.logger.error(`Configure agent failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * GetUserTaskStatus returns the status of a specific task for a user
   */
  async getUserTaskStatus(
    serviceType: string,
    roomId: string,
    userId: string,
  ): Promise<CommonResponse> {
    let isRunning = false;
    if (serviceType === 'transcription') {
      isRunning = await this.redisInsightsService.isTranscriptionSessionActive(
        roomId,
        userId,
      );
    }
    // Add other service checks if needed

    return create(CommonResponseSchema, {
      status: true,
      msg: isRunning ? 'running' : 'stopped',
    });
  }

  /**
   * OnAfterRoomEnded cleans up insight services when a room ends
   */
  async onAfterRoomEnded(
    dbTableId: number | bigint,
    roomId: string,
    roomSid: string,
  ): Promise<void> {
    try {
      // Step 1: End all active agent services
      await Promise.allSettled([
        this.endTranscription(roomId),
        this.chatEndTranslation(roomId),
        this.endAITextChat(roomId),
        this.endAIMeetingSummarization(roomId),
      ]);

      // Step 2: Create all usage artifacts for the room
      this.logger.log(`Creating usage artifacts for room ${roomId}`);
      try {
        await this.artifactsService.createAllRoomUsageArtifacts(
          roomId,
          roomSid,
          Number(dbTableId),
        );
        this.logger.log(
          `Successfully created usage artifacts for room ${roomId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to create usage artifacts for room ${roomId}: ${error.message}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error cleaning up insights for room ${roomId}: ${error.message}`,
      );
    }
  }

  /**
   * GetSupportedLangs returns supported languages for a service
   */
  async getSupportedLangs(
    serviceType: string,
  ): Promise<InsightsSupportedLangInfo[]> {
    let langs: { code: string; name: string }[] = [];
    if (serviceType === 'transcription') {
      langs = [
        { code: 'af-ZA', name: 'Afrikaans' },
        { code: 'am-ET', name: 'Amharic' },
        { code: 'ar-AE', name: 'Arabic (United Arab Emirates)' },
        { code: 'ar-BH', name: 'Arabic (Bahrain)' },
        { code: 'ar-DZ', name: 'Arabic (Algeria)' },
        { code: 'ar-EG', name: 'Arabic (Egypt)' },
        { code: 'ar-IL', name: 'Arabic (Israel)' },
        { code: 'ar-IQ', name: 'Arabic (Iraq)' },
        { code: 'ar-JO', name: 'Arabic (Jordan)' },
        { code: 'ar-KW', name: 'Arabic (Kuwait)' },
        { code: 'ar-LB', name: 'Arabic (Lebanon)' },
        { code: 'ar-LY', name: 'Arabic (Libya)' },
        { code: 'ar-MA', name: 'Arabic (Morocco)' },
        { code: 'ar-OM', name: 'Arabic (Oman)' },
        { code: 'ar-PS', name: 'Arabic (Palestinian Territories)' },
        { code: 'ar-QA', name: 'Arabic (Qatar)' },
        { code: 'ar-SA', name: 'Arabic (Saudi Arabia)' },
        { code: 'ar-SY', name: 'Arabic (Syria)' },
        { code: 'ar-TN', name: 'Arabic (Tunisia)' },
        { code: 'ar-YE', name: 'Arabic (Yemen)' },
        { code: 'az-AZ', name: 'Azerbaijani' },
        { code: 'hy-AM', name: 'Armenian' },
        { code: 'sq-AL', name: 'Albanian' },
        { code: 'bg-BG', name: 'Bulgarian' },
        { code: 'bn-IN', name: 'Bengali (India)' },
        { code: 'bs-BA', name: 'Bosnian' },
        { code: 'eu-ES', name: 'Basque' },
        { code: 'my-MM', name: 'Burmese' },
        { code: 'ca-ES', name: 'Catalan' },
        { code: 'cs-CZ', name: 'Czech' },
        { code: 'hr-HR', name: 'Croatian' },
        { code: 'zh-CN', name: 'Chinese (Mandarin, Simplified)' },
        { code: 'wuu-CN', name: 'Chinese (Wu, Simplified)' },
        { code: 'zh-TW', name: 'Chinese (Taiwanese Mandarin)' },
        { code: 'zh-HK', name: 'Chinese (Cantonese, Traditional)' },
        { code: 'da-DK', name: 'Danish' },
        { code: 'nl-BE', name: 'Dutch (Belgium)' },
        { code: 'nl-NL', name: 'Dutch (Netherlands)' },
        { code: 'en-AU', name: 'English (Australia)' },
        { code: 'en-US', name: 'English (US)' },
        { code: 'en-GB', name: 'English (UK)' },
        { code: 'en-CA', name: 'English (Canada)' },
        { code: 'en-IN', name: 'English (India)' },
        { code: 'en-NG', name: 'English (Nigeria)' },
        { code: 'en-ZA', name: 'English (South Africa)' },
        { code: 'fi-FI', name: 'Finnish' },
        { code: 'fr-FR', name: 'French (France)' },
        { code: 'fr-CA', name: 'French (Canada)' },
        { code: 'de-DE', name: 'German (Germany)' },
        { code: 'el-GR', name: 'Greek' },
        { code: 'he-IL', name: 'Hebrew' },
        { code: 'hi-IN', name: 'Hindi (India)' },
        { code: 'id-ID', name: 'Indonesian' },
        { code: 'it-IT', name: 'Italian (Italy)' },
        { code: 'ja-JP', name: 'Japanese' },
        { code: 'ko-KR', name: 'Korean' },
        { code: 'nb-NO', name: 'Norwegian Bokmål' },
        { code: 'pl-PL', name: 'Polish' },
        { code: 'pt-BR', name: 'Portuguese (Brazil)' },
        { code: 'pt-PT', name: 'Portuguese (Portugal)' },
        { code: 'ro-RO', name: 'Romanian' },
        { code: 'ru-RU', name: 'Russian' },
        { code: 'es-ES', name: 'Spanish (Spain)' },
        { code: 'es-MX', name: 'Spanish (Mexico)' },
        { code: 'sv-SE', name: 'Swedish' },
        { code: 'th-TH', name: 'Thai' },
        { code: 'tr-TR', name: 'Turkish' },
        { code: 'uk-UA', name: 'Ukrainian' },
        { code: 'vi-VN', name: 'Vietnamese' },
      ];
    } else if (serviceType === 'translation') {
      langs = [
        { code: 'af', name: 'Afrikaans' },
        { code: 'sq', name: 'Albanian' },
        { code: 'ar', name: 'Arabic' },
        { code: 'hy', name: 'Armenian' },
        { code: 'bn', name: 'Bangla' },
        { code: 'bg', name: 'Bulgarian' },
        { code: 'ca', name: 'Catalan' },
        { code: 'zh-Hans', name: 'Chinese Simplified' },
        { code: 'zh-Hant', name: 'Chinese Traditional' },
        { code: 'hr', name: 'Croatian' },
        { code: 'cs', name: 'Czech' },
        { code: 'da', name: 'Danish' },
        { code: 'nl', name: 'Dutch' },
        { code: 'en', name: 'English' },
        { code: 'et', name: 'Estonian' },
      ];
    }

    const result: InsightsSupportedLangInfo[] = langs.map((l) =>
      create(InsightsSupportedLangInfoSchema, l),
    );
    return result;
  }
}
