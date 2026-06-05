import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { create } from '@bufbuild/protobuf';
import { CommonResponseSchema } from '@workspace/protocol';
import { SpeechToTextService } from '@server/meet/modules/speech-to-text/speech-to-text.service';

@Controller()
export class SpeechToTextHandler {
  private readonly logger = new Logger(SpeechToTextHandler.name);

  constructor(private readonly sttService: SpeechToTextService) {}

  @MessagePattern({ cmd: 'speech.serviceStatus' })
  async handleServiceStatus(@Payload() data: any) {
    try {
      return await this.sttService.speechToTextTranslationServiceStart(
        data.roomId,
        data,
      );
    } catch (error) {
      return this.errorRes(error);
    }
  }

  @MessagePattern({ cmd: 'speech.generateAzureToken' })
  async handleGenerateToken(@Payload() data: any) {
    try {
      return await this.sttService.generateAzureToken(
        data.roomId,
        data.userId,
        data,
      );
    } catch (error) {
      return this.errorRes(error);
    }
  }

  @MessagePattern({ cmd: 'speech.userStatus' })
  async handleUserStatus(@Payload() data: any) {
    try {
      return await this.sttService.speechServiceUserStatus(
        data.roomId,
        data.userId,
        data,
      );
    } catch (error) {
      return this.errorRes(error);
    }
  }

  @MessagePattern({ cmd: 'speech.renewToken' })
  async handleRenewToken(@Payload() data: any) {
    try {
      return await this.sttService.renewAzureToken(
        data.roomId,
        data.userId,
        data,
      );
    } catch (error) {
      return this.errorRes(error);
    }
  }

  private errorRes(error: any) {
    this.logger.error(`Error in STT handler: ${error.message}`);
    return create(CommonResponseSchema, {
      status: false,
      msg: error.message,
    });
  }
}

