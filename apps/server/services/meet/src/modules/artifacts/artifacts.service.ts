/**
 * Artifacts Service
 *
 * Manages all room artifacts (analytics, summaries, transcripts, etc.)
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService, AppConfigService } from '@server/shared';
import { WebhookNotifierService } from '@server/meet/infrastructure/webhook/webhook-notifier.service';
import {
  RoomArtifactMetadata,
  RoomArtifactType,
  FetchArtifactsReq,
  FetchArtifactsResult,
  ArtifactInfoRes,
  RoomArtifactMetadataSchema,
  ArtifactInfoSchema,
  FetchArtifactsResultSchema,
  ArtifactInfoResSchema,
  CommonNotifyEventSchema,
  PastRoomInfoSchema,
} from '@workspace/protocol';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';
import { create, toJson, fromJson } from '@bufbuild/protobuf';
import { generateTokenForDownloadRecording } from '@server/shared';
import * as jwt from 'jsonwebtoken';
import { RedisInsightsService } from '@server/meet/infrastructure/redis/redis-insights.service';
import { NatsService } from '@server/meet/infrastructure/nats/nats.service';
import { NatsRoomService } from '@server/meet/infrastructure/nats/nats-room.service';
import {
  AnalyticsEvents,
  AnalyticsEventType,
  AnalyticsDataMsgSchema,
} from '@workspace/protocol';

@Injectable()
export class ArtifactsService {
  private readonly logger = new Logger(ArtifactsService.name);
  private readonly storagePath: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly tokenValidity: number;

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly webhookNotifier: WebhookNotifierService,
    private readonly redisInsightsService: RedisInsightsService,
    private readonly natsService: NatsService,
    @Inject(forwardRef(() => NatsRoomService))
    private readonly natsRoomService: NatsRoomService,
  ) {
    this.storagePath = this.appConfig.server.storagePath;
    this.apiKey = this.appConfig.security.wajlc.apiKey;
    this.apiSecret = this.appConfig.security.wajlc.apiSecret;
    this.tokenValidity = this.appConfig.security.wajlc.tokenValidity;
  }

  private getServicePricing(serviceType: string, modelName: string): any {
    const serviceConfig = this.appConfig.insights.services?.[serviceType];
    if (!serviceConfig || !serviceConfig.pricing) {
      this.logger.warn(
        `Pricing config block not found for service '${serviceType}'`,
      );
      return {};
    }

    if (serviceConfig.pricing[modelName]) {
      return serviceConfig.pricing[modelName];
    }

    if (serviceConfig.pricing['default']) {
      return serviceConfig.pricing['default'];
    }

    this.logger.warn(
      `Pricing config not found for model '${modelName}' (or default) in service '${serviceType}'`,
    );
    return {};
  }

  /**
   * buildPath constructs absolute and relative storage paths for artifacts
   */
  async buildPath(
    fileName: string,
    roomId: string,
    artifactType: RoomArtifactType,
  ): Promise<{ relativePath: string; absolutePath: string }> {
    const typeStr = RoomArtifactType[artifactType].toLowerCase();
    const relativeDir = path.join(typeStr, roomId);
    const absoluteDir = path.join(this.storagePath, 'artifacts', relativeDir);

    try {
      await fs.mkdir(absoluteDir, { recursive: true });
    } catch (error) {
      this.logger.error(
        `Failed to create artifact directory: ${error.message}`,
      );
      throw new Error(`Không tạo được thư mục artifact: ${error.message}`);
    }

    return {
      relativePath: path.join(relativeDir, fileName),
      absolutePath: path.join(absoluteDir, fileName),
    };
  }

  /**
   * createAndSaveArtifact saves artifact metadata to DB and sends webhooks
   */
  async createAndSaveArtifact(
    roomId: string,
    roomSid: string,
    roomTableId: number,
    artifactType: RoomArtifactType,
    metadata: RoomArtifactMetadata,
    forceSendWebhook = false,
  ): Promise<any> {
    const metadataJson = toJson(RoomArtifactMetadataSchema, metadata) as any;

    const artifact = await this.prisma.roomArtifact.create({
      data: {
        artifactId: uuidv4(),
        roomTableId: roomTableId,
        roomId: roomId,
        type: RoomArtifactType[artifactType],
        metadata: metadataJson,
      },
    });

    // Send webhook notification
    await this.sendWebhookNotification(
      'artifact_created',
      roomSid,
      artifact,
      metadata,
      forceSendWebhook,
    );

    this.logger.log(
      `Successfully created ${RoomArtifactType[artifactType]} artifact (id: ${artifact.artifactId}) for room ${roomId}`,
    );
    return artifact;
  }

  async createSpeechTranscriptionArtifact(
    roomTableId: number,
    roomId: string,
    roomSid: string,
    filePath: string,
    fileSize: number,
  ): Promise<void> {
    const metadata = create(RoomArtifactMetadataSchema, {
      fileInfo: {
        filePath,
        fileSize: fileSize.toString(),
      },
    });

    await this.createAndSaveArtifact(
      roomId,
      roomSid,
      roomTableId,
      RoomArtifactType.SPEECH_TRANSCRIPTION,
      metadata,
    );
  }

  async createChatTranslationArtifact(
    roomTableId: number,
    roomId: string,
    roomSid: string,
    filePath: string,
    fileSize: number,
  ): Promise<void> {
    const metadata = create(RoomArtifactMetadataSchema, {
      fileInfo: {
        filePath,
        fileSize: fileSize.toString(),
      },
    });

    await this.createAndSaveArtifact(
      roomId,
      roomSid,
      roomTableId,
      RoomArtifactType.CHAT_TRANSLATION_USAGE,
      metadata,
    );
  }

  async createAITextChatArtifact(
    roomTableId: number,
    roomId: string,
    roomSid: string,
    filePath: string,
    fileSize: number,
  ): Promise<void> {
    const metadata = create(RoomArtifactMetadataSchema, {
      fileInfo: {
        filePath,
        fileSize: fileSize.toString(),
      },
    });

    await this.createAndSaveArtifact(
      roomId,
      roomSid,
      roomTableId,
      RoomArtifactType.AI_TEXT_CHAT_INTERACTION_USAGE,
      metadata,
    );
  }

  async createCloudRecordingArtifact(
    roomTableId: number,
    roomId: string,
    roomSid: string,
    filePath: string,
    fileSize: number,
  ): Promise<void> {
    const metadata = create(RoomArtifactMetadataSchema, {
      fileInfo: {
        filePath,
        fileSize: fileSize.toString(),
      },
    });

    await this.createAndSaveArtifact(
      roomId,
      roomSid,
      roomTableId,
      RoomArtifactType.CLOUD_RECORDING,
      metadata,
      true,
    );
  }

  async createRTMPRecordingArtifact(
    roomTableId: number,
    roomId: string,
    roomSid: string,
    filePath: string,
    fileSize: number,
  ): Promise<void> {
    const metadata = create(RoomArtifactMetadataSchema, {
      fileInfo: {
        filePath,
        fileSize: fileSize.toString(),
      },
    });

    await this.createAndSaveArtifact(
      roomId,
      roomSid,
      roomTableId,
      RoomArtifactType.RTMP_RECORDING,
      metadata,
      true,
    );
  }

  async createMeetingSummaryArtifact(
    roomTableId: number,
    roomId: string,
    roomSid: string,
    summary: string,
  ): Promise<void> {
    const metadata = create(RoomArtifactMetadataSchema, {
      usageDetails: {
        case: 'summary',
        value: {
          summaryText: summary,
        },
      },
    });

    await this.createAndSaveArtifact(
      roomId,
      roomSid,
      roomTableId,
      RoomArtifactType.MEETING_SUMMARY,
      metadata,
    );
  }

  /**
   * createAllRoomUsageArtifacts creates all types of usage artifacts for a room
   */
  async createAllRoomUsageArtifacts(
    roomId: string,
    roomSid: string,
    roomTableId: number,
  ): Promise<void> {
    this.logger.log(`Creating all room usage artifacts for room: ${roomId}`);

    // 1. Speech Transcription File
    let transFileArtifactId: string | undefined;
    try {
      transFileArtifactId = await this.createSpeechTranscriptionFileArtifact(
        roomId,
        roomSid,
        roomTableId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create speech transcription file artifact: ${error.message}`,
      );
    }

    // 2. Speech Transcription Usage
    try {
      await this.createSpeechTranscriptionUsageArtifact(
        roomId,
        roomSid,
        roomTableId,
        transFileArtifactId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create speech transcription usage artifact: ${error.message}`,
      );
    }

    // 3. Chat Translation Usage
    try {
      await this.createChatTranslationUsageArtifact(
        roomId,
        roomSid,
        roomTableId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create chat translation usage artifact: ${error.message}`,
      );
    }

    // 4. Synthesized Speech Usage
    try {
      await this.createSynthesizedSpeechUsageArtifact(
        roomId,
        roomSid,
        roomTableId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create synthesized speech usage artifact: ${error.message}`,
      );
    }

    // 5. AI Text Chat Usage (chat + summary)
    try {
      await this.createAITextChatUsageArtifacts(roomId, roomSid, roomTableId);
    } catch (error) {
      this.logger.error(
        `Failed to create AI text chat usage artifacts: ${error.message}`,
      );
    }
  }

  /**
   * createSpeechTranscriptionFileArtifact creates a VTT file from NATS transcription chunks
   */
  async createSpeechTranscriptionFileArtifact(
    roomId: string,
    roomSid: string,
    roomTableId: number,
  ): Promise<string | undefined> {
    const chunks =
      await this.redisInsightsService.getTranscriptionHistory(roomId);
    if (!chunks || Object.keys(chunks).length === 0) return undefined;

    // Clean up history
    await this.redisInsightsService.deleteTranscriptionHistory(roomId);

    const keys = Object.keys(chunks).sort((a, b) => Number(a) - Number(b));
    let fileContent = 'WEBVTT\n\n';
    fileContent += `NOTE Transcription for meeting: ${roomId}\n\n`;

    let firstTimestamp = -1;
    let previousEndTime = 0;

    keys.forEach((key, i) => {
      try {
        const chunk = JSON.parse(chunks[key]);
        const ts = parseInt(key, 10);
        if (firstTimestamp === -1) firstTimestamp = ts;

        const elapsedTime = ts - firstTimestamp;
        const startTime = i > 0 ? previousEndTime : 0;

        const vttStartTime = this.formatVTTTimestamp(startTime);
        const vttEndTime = this.formatVTTTimestamp(elapsedTime);

        fileContent += `${i + 1}\n`;
        fileContent += `${vttStartTime} --> ${vttEndTime}\n`;
        fileContent += `<v ${chunk.name}>${chunk.text}\n\n`;

        previousEndTime = elapsedTime;
      } catch (e) {}
    });

    if (fileContent.length <= 40) return undefined;

    const fileName = `transcription_${Math.floor(Date.now() / 1000)}.vtt`;
    const { relativePath, absolutePath } = await this.buildPath(
      fileName,
      roomId,
      RoomArtifactType.SPEECH_TRANSCRIPTION,
    );

    await fs.writeFile(absolutePath, Buffer.from(fileContent));

    const metadata = create(RoomArtifactMetadataSchema, {
      fileInfo: {
        filePath: relativePath,
        fileSize: BigInt(fileContent.length).toString(),
        mimeType: 'text/vtt',
      },
    });

    const artifact = await this.createAndSaveArtifact(
      roomId,
      roomSid,
      roomTableId,
      RoomArtifactType.SPEECH_TRANSCRIPTION,
      metadata,
    );
    return artifact.artifactId;
  }

  private formatVTTTimestamp(ms: number): string {
    const date = new Date(ms);
    const hours = Math.floor(ms / 3600000)
      .toString()
      .padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    const milliseconds = date.getUTCMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  async createSpeechTranscriptionUsageArtifact(
    roomId: string,
    roomSid: string,
    roomTableId: number,
    fileArtifactId?: string,
  ): Promise<void> {
    const usageMap = await this.redisInsightsService.getTranscriptionRoomUsage(
      roomId,
      true,
    );
    if (!usageMap || Object.keys(usageMap).length === 0) return;

    const total = usageMap['total_usage'] || 0;
    const pricing = this.getServicePricing('transcription', 'default');
    const cost = (total / 3600) * (pricing.pricePerHour || 0);

    const metadata = create(RoomArtifactMetadataSchema, {
      usageDetails: {
        case: 'durationUsage',
        value: {
          durationSec: total,
          breakdown: this.mapToRecordInt64(usageMap),
          durationSecEstimatedCost: this.round(cost, 6),
        },
      },
      referenceArtifactId: fileArtifactId,
    });

    await this.createAndSaveArtifact(
      roomId,
      roomSid,
      roomTableId,
      RoomArtifactType.SPEECH_TRANSCRIPTION_USAGE,
      metadata,
    );
    await this.handleAnalyticsEvent(
      roomId,
      AnalyticsEvents.ANALYTICS_EVENT_ROOM_INSIGHTS_TRANSCRIPTION_TOTAL_USAGE,
      BigInt(total),
    );
  }

  async createChatTranslationUsageArtifact(
    roomId: string,
    roomSid: string,
    roomTableId: number,
  ): Promise<void> {
    const usageMap =
      await this.redisInsightsService.getChatTranslationRoomUsage(roomId, true);
    if (!usageMap || Object.keys(usageMap).length === 0) return;

    const total = usageMap['total_usage'] || 0;
    const pricing = this.getServicePricing('translation', 'default');
    const cost = (total / 1000000) * (pricing.pricePerMillionCharacters || 0);

    const metadata = create(RoomArtifactMetadataSchema, {
      usageDetails: {
        case: 'characterCountUsage',
        value: {
          totalCharacters: total,
          breakdown: this.mapToRecordInt64(usageMap),
          totalCharactersEstimatedCost: this.round(cost, 6),
        },
      },
    });

    await this.createAndSaveArtifact(
      roomId,
      roomSid,
      roomTableId,
      RoomArtifactType.CHAT_TRANSLATION_USAGE,
      metadata,
    );
    await this.handleAnalyticsEvent(
      roomId,
      AnalyticsEvents.ANALYTICS_EVENT_ROOM_INSIGHTS_CHAT_TRANSLATION_TOTAL_USAGE,
      BigInt(total),
    );
  }

  async createSynthesizedSpeechUsageArtifact(
    roomId: string,
    roomSid: string,
    roomTableId: number,
  ): Promise<void> {
    const usageMap = await this.redisInsightsService.getTTSServiceRoomUsage(
      roomId,
      true,
    );
    if (!usageMap || Object.keys(usageMap).length === 0) return;

    const total = usageMap['total_usage'] || 0;
    const pricing = this.getServicePricing('speech-synthesis', 'default');
    const cost = (total / 1000000) * (pricing.pricePerMillionCharacters || 0);

    const metadata = create(RoomArtifactMetadataSchema, {
      usageDetails: {
        case: 'characterCountUsage',
        value: {
          totalCharacters: total,
          breakdown: this.mapToRecordInt64(usageMap),
          totalCharactersEstimatedCost: this.round(cost, 6),
        },
      },
    });

    await this.createAndSaveArtifact(
      roomId,
      roomSid,
      roomTableId,
      RoomArtifactType.SYNTHESIZED_SPEECH_USAGE,
      metadata,
    );
    await this.handleAnalyticsEvent(
      roomId,
      AnalyticsEvents.ANALYTICS_EVENT_ROOM_INSIGHTS_SYNTHESIZED_SPEECH_TOTAL_USAGE,
      BigInt(total),
    );
  }

  async createAITextChatUsageArtifacts(
    roomId: string,
    roomSid: string,
    roomTableId: number,
  ): Promise<void> {
    const usageMap = await this.redisInsightsService.getAITextChatRoomUsage(
      roomId,
      true,
    );
    if (!usageMap || Object.keys(usageMap).length === 0) return;

    // Logic for separate chat and summarize artifacts
    const tasks = ['chat', 'summarize'];
    for (const task of tasks) {
      const totalKey = `total_tokens_${task}`;
      if (usageMap[totalKey]) {
        const total = usageMap[totalKey];
        const prompt = usageMap[`prompt_tokens_${task}`] || 0;
        const completion = usageMap[`completion_tokens_${task}`] || 0;

        const aiChatModel =
          (this.appConfig.insights?.services?.ai_text_chat?.options
            ?.chat_model as string | undefined) || 'gemini-2.5-flash';
        const pricing = this.getServicePricing('ai_text_chat', aiChatModel);
        const promptCost =
          (prompt / 1000000) * (pricing.inputPricePerMillionTokens || 0);
        const completionCost =
          (completion / 1000000) * (pricing.outputPricePerMillionTokens || 0);
        const totalCost = promptCost + completionCost;

        const breakdown: Record<string, bigint> = {};
        Object.entries(usageMap).forEach(([k, v]) => {
          if (k.includes(task)) breakdown[k] = BigInt(v);
        });

        const metadata = create(RoomArtifactMetadataSchema, {
          usageDetails: {
            case: 'tokenUsage',
            value: {
              promptTokens: prompt,
              completionTokens: completion,
              totalTokens: total,
              breakdown,
              promptTokensEstimatedCost: this.round(promptCost, 6),
              completionTokensEstimatedCost: this.round(completionCost, 6),
              totalTokensEstimatedCost: this.round(totalCost, 6),
            },
          },
        });

        const type =
          task === 'chat'
            ? RoomArtifactType.AI_TEXT_CHAT_INTERACTION_USAGE
            : RoomArtifactType.AI_TEXT_CHAT_SUMMARIZATION_USAGE;
        await this.createAndSaveArtifact(
          roomId,
          roomSid,
          roomTableId,
          type,
          metadata,
        );

        const event =
          task === 'chat'
            ? AnalyticsEvents.ANALYTICS_EVENT_ROOM_INSIGHTS_AI_TEXT_CHAT_INTERACTION_TOTAL_USAGE
            : AnalyticsEvents.ANALYTICS_EVENT_ROOM_INSIGHTS_AI_TEXT_CHAT_SUMMARIZATION_TOTAL_USAGE;
        await this.handleAnalyticsEvent(roomId, event, BigInt(total));
      }
    }
  }

  private mapToRecordInt64(
    map: Record<string, number>,
  ): Record<string, bigint> {
    const res: Record<string, bigint> = {};
    Object.entries(map).forEach(([k, v]) => {
      res[k] = BigInt(v);
    });
    return res;
  }

  private round(val: number, precision: number): number {
    const multiplier = Math.pow(10, precision);
    return Math.round(val * multiplier) / multiplier;
  }

  private async handleAnalyticsEvent(
    roomId: string,
    eventName: AnalyticsEvents,
    eventValueInteger: bigint,
  ): Promise<void> {
    const event = create(AnalyticsDataMsgSchema, {
      eventType: AnalyticsEventType.ROOM,
      eventName: eventName,
      roomId: roomId,
      eventValueInteger: eventValueInteger.toString(),
    });
    // Logic to send to AnalyticsService can be added here
  }

  /**
   * fetchArtifacts retrieves a paginated list of artifacts
   */
  async fetchArtifacts(r: FetchArtifactsReq): Promise<FetchArtifactsResult> {
    let limit = parseInt(r.limit, 10) || 20;
    if (limit <= 0) {
      limit = 20;
    } else if (limit > 100) {
      limit = 100;
    }

    // Default orderBy to DESC
    const orderBy = r.orderBy || 'DESC';
    const from = parseInt(r.from, 10) || 0;

    const where: any = {};
    if (r.roomIds && r.roomIds.length > 0) {
      where.roomId = { in: r.roomIds };
    }
    if (r.roomSid) {
      where.roomInfo = { sid: r.roomSid };
    }
    if (r.type !== undefined && r.type !== RoomArtifactType.UNKNOWN_ARTIFACT) {
      where.type = RoomArtifactType[r.type];
    }

    const artifacts = await this.prisma.roomArtifact.findMany({
      where,
      skip: from,
      take: limit,
      orderBy: { created: orderBy === 'ASC' ? 'asc' : 'desc' },
    });

    const totalItems = await this.prisma.roomArtifact.count({ where });

    const resultArtifacts = artifacts.map((a) => {
      const metadata = fromJson(RoomArtifactMetadataSchema, a.metadata as any);
      return create(ArtifactInfoSchema, {
        artifactId: a.artifactId,
        roomId: a.roomId,
        type:
          RoomArtifactType[a.type as keyof typeof RoomArtifactType] ||
          RoomArtifactType.UNKNOWN_ARTIFACT,
        metadata: metadata,
        created: a.created.toISOString(),
      });
    });

    return create(FetchArtifactsResultSchema, {
      artifactsList: resultArtifacts,
      totalArtifacts: totalItems.toString(),
      from: from.toString(),
      limit: limit.toString(),
      orderBy: orderBy,
      type: r.type,
    });
  }

  /**
   * getArtifactInfo retrieves details for a single artifact
   */
  async getArtifactInfo(artifactId: string): Promise<ArtifactInfoRes> {
    const artifact = await this.prisma.roomArtifact.findUnique({
      where: { artifactId },
      include: { roomInfo: true },
    });

    if (!artifact) {
      throw new Error(`Không tìm thấy artifact: ${artifactId}`);
    }

    const metadata = fromJson(
      RoomArtifactMetadataSchema,
      artifact.metadata as any,
    );

    const info = create(ArtifactInfoSchema, {
      artifactId: artifact.artifactId,
      roomId: artifact.roomId,
      type:
        RoomArtifactType[artifact.type as keyof typeof RoomArtifactType] ||
        RoomArtifactType.UNKNOWN_ARTIFACT,
      metadata: metadata,
      created: artifact.created.toISOString(),
    });

    const res = create(ArtifactInfoResSchema, {
      status: true,
      msg: 'success',
      artifactInfo: info,
    });

    if (artifact.roomInfo) {
      res.roomInfo = create(PastRoomInfoSchema, {
        roomTitle: artifact.roomInfo.roomTitle,
        roomId: artifact.roomInfo.roomId,
        roomSid: artifact.roomInfo.sid,
        joinedParticipants: artifact.roomInfo.joinedParticipants.toString(),
        webhookUrl: artifact.roomInfo.webhookUrl,
        created: artifact.roomInfo.created.toISOString(),
        ended: artifact.roomInfo.ended?.toISOString() || '',
      });
    }

    return res;
  }

  /**
   * getDownloadToken generates a single-use token for downloading an artifact
   */
  async getDownloadToken(artifactId: string): Promise<string> {
    const artifact = await this.prisma.roomArtifact.findUnique({
      where: { artifactId },
    });

    if (!artifact) {
      throw new Error(`Không tìm thấy artifact: ${artifactId}`);
    }

    const artifactType =
      RoomArtifactType[artifact.type as keyof typeof RoomArtifactType];
    if (!this.isDownloadable(artifactType)) {
      throw new Error(`Loại artifact '${artifact.type}' không được phép tải xuống`);
    }

    const metadata = fromJson(
      RoomArtifactMetadataSchema,
      artifact.metadata as any,
    );
    if (!metadata.fileInfo || !metadata.fileInfo.filePath) {
      throw new Error('Artifact không có tệp để tải xuống');
    }

    return generateTokenForDownloadRecording(
      metadata.fileInfo.filePath,
      this.apiKey,
      this.apiSecret,
      this.tokenValidity,
    );
  }

  /**
   * verifyAndGetFilePath verifies a download token and returns the absolute file path
   */
  async verifyAndGetFilePath(
    token: string,
  ): Promise<{ absolutePath: string; fileName: string }> {
    try {
      // Verify JWT and extract claims
      const decoded = jwt.verify(token, this.apiSecret) as any;

      const relativePath = decoded.sub || decoded.filePath;
      if (!relativePath) {
        throw new Error('Token không hợp lệ: không tìm thấy đường dẫn tệp');
      }

      const absolutePath = path.join(
        this.storagePath,
        'artifacts',
        relativePath,
      );

      try {
        await fs.access(absolutePath);
        return {
          absolutePath,
          fileName: path.basename(relativePath),
        };
      } catch (error) {
        const parts = error.message.split('/');
        throw new Error(parts[parts.length - 1]);
      }
    } catch (error) {
      if (error.message.includes('file') || error.message.includes('token')) {
        throw error;
      }
      throw new Error(`Xác minh token thất bại: ${error.message}`);
    }
  }

  /**
   * deleteArtifact deletes an artifact record and its associated file
   */
  async deleteArtifact(artifactId: string): Promise<boolean> {
    const artifact = await this.prisma.roomArtifact.findUnique({
      where: { artifactId },
    });

    if (!artifact) {
      throw new Error(`Không tìm thấy artifact với ID: ${artifactId}`);
    }

    // Double check to prevent deletion of certain artifact types.
    const type =
      RoomArtifactType[artifact.type as keyof typeof RoomArtifactType] ||
      RoomArtifactType.UNKNOWN_ARTIFACT;
    if (!this.isDownloadable(type)) {
      throw new Error(
        `Không được phép xóa artifact loại '${artifact.type}'`,
      );
    }

    const metadata = fromJson(
      RoomArtifactMetadataSchema,
      artifact.metadata as any,
    );
    if (metadata.fileInfo && metadata.fileInfo.filePath) {
      const absolutePath = path.join(
        this.storagePath,
        'artifacts',
        metadata.fileInfo.filePath,
      );
      await this.moveToTrash(absolutePath);
    }

    await this.prisma.roomArtifact.delete({
      where: { artifactId },
    });

    return true;
  }

  private async moveToTrash(filePath: string): Promise<void> {
    const enableBackup = this.appConfig.janitor.enableArtifactsBackup;
    const backupPath = this.appConfig.janitor.artifactsBackupPath;

    try {
      if (enableBackup) {
        await fs.mkdir(backupPath, { recursive: true });
        const fileName = path.basename(filePath);
        const destPath = path.join(backupPath, fileName);
        await fs.rename(filePath, destPath);
        const now = new Date();
        await fs.utimes(destPath, now, now);
        this.logger.log(`Moved artifact to trash: ${destPath}`);
      } else {
        await fs.unlink(filePath);
        this.logger.log(`Permanently deleted artifact: ${filePath}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup artifact file: ${error.message}`);
    }
  }

  private isDownloadable(type: RoomArtifactType): boolean {
    // Only these 3 types are downloadable
    return [
      RoomArtifactType.MEETING_ANALYTICS,
      RoomArtifactType.MEETING_SUMMARY,
      RoomArtifactType.SPEECH_TRANSCRIPTION,
    ].includes(type);
  }

  private async sendWebhookNotification(
    eventName: string,
    roomSid: string,
    artifact: any,
    metadata: RoomArtifactMetadata,
    forceSend: boolean,
  ): Promise<void> {
    const event = create(CommonNotifyEventSchema, {
      event: eventName,
      room: {
        sid: roomSid,
        roomId: artifact.roomId,
      },
      roomArtifact: {
        type:
          RoomArtifactType[artifact.type as keyof typeof RoomArtifactType] ||
          RoomArtifactType.UNKNOWN_ARTIFACT,
        artifactId: artifact.artifactId,
        metadata: metadata,
      },
    });

    if (forceSend) {
      await this.webhookNotifier.forceToPutInQueue(event);
    } else {
      await this.webhookNotifier.sendWebhookEvent(event);
    }
  }
}
