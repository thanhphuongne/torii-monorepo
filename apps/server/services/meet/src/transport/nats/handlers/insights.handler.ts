/**
 * Insights NATS Handler
 */

import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { create } from '@bufbuild/protobuf';
import { CommonResponseSchema } from '@workspace/protocol';
import { InsightsService } from '@server/meet/modules/insights/insights.service';

@Controller()
export class InsightsHandler {
  private readonly logger = new Logger(InsightsHandler.name);

  constructor(private readonly insightsService: InsightsService) {}

  @MessagePattern({ cmd: 'insights.getSupportedLangs' })
  async handleGetSupportedLangs(@Payload() data: any) {
    return await this.insightsService.getSupportedLangs(data.serviceType);
  }

  @MessagePattern({ cmd: 'insights.transcription.configure' })
  async handleTranscriptionConfigure(@Payload() data: any) {
    return await this.insightsService.transcriptionConfigure(data.roomId, data);
  }

  @MessagePattern({ cmd: 'insights.transcription.end' })
  async handleEndTranscription(@Payload() data: any) {
    return await this.insightsService.endTranscription(data.roomId);
  }

  @MessagePattern({ cmd: 'insights.transcription.getUserStatus' })
  async handleGetTranscriptionUserTaskStatus(@Payload() data: any) {
    return await this.insightsService.getUserTaskStatus(
      data.serviceType,
      data.roomId,
      data.userId,
    );
  }

  @MessagePattern({ cmd: 'insights.transcription.userSession' })
  async handleTranscriptionUserSession(@Payload() data: any) {
    return await this.insightsService.transcriptionUserSession(
      data.roomId,
      data.userId,
      data,
    );
  }

  @MessagePattern({ cmd: 'insights.translation.chat.configure' })
  async handleChatTranslationConfigure(@Payload() data: any) {
    return await this.insightsService.chatTranslationConfigure(
      data.roomId,
      data,
    );
  }

  @MessagePattern({ cmd: 'insights.translation.chat.execute' })
  async handleExecuteChatTranslation(@Payload() data: any) {
    return await this.insightsService.executeChatTranslation(
      data.roomId,
      data.userId,
      data,
    );
  }

  @MessagePattern({ cmd: 'insights.translation.chat.end' })
  async handleEndChatTranslation(@Payload() data: any) {
    return await this.insightsService.chatEndTranslation(data.roomId);
  }

  @MessagePattern({ cmd: 'insights.ai.textChat.configure' })
  async handleAITextChatConfigure(@Payload() data: any) {
    return await this.insightsService.aiTextChatConfigure(data.roomId, data);
  }

  @MessagePattern({ cmd: 'insights.ai.textChat.execute' })
  async handleExecuteAITextChat(@Payload() data: any) {
    return await this.insightsService.executeAITextChat(
      data.roomId,
      data.userId,
      data,
    );
  }

  @MessagePattern({ cmd: 'insights.ai.textChat.end' })
  async handleEndAITextChat(@Payload() data: any) {
    return await this.insightsService.endAITextChat(data.roomId);
  }

  @MessagePattern({ cmd: 'insights.ai.meetingSummarization.configure' })
  async handleAIMeetingSummarizationConfig(@Payload() data: any) {
    try {
      return await this.insightsService.meetingSummarizationConfigure(
        data.roomId,
        data,
      );
    } catch (error) {
      this.logger.error(`Error handling insights task: ${error.message}`);
      return create(CommonResponseSchema, {
        status: false,
        msg: error.message,
      });
    }
  }

  @MessagePattern({ cmd: 'insights.ai.meetingSummarization.end' })
  async handleEndAIMeetingSummarization(@Payload() data: any) {
    return await this.insightsService.endAIMeetingSummarization(data.roomId);
  }
}

