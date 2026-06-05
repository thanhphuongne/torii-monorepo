import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ExternalMediaService } from '@server/meet/modules/external-media/external-media.service';
import { ExternalMediaPlayerReq } from '@workspace/protocol';

@Controller()
export class ExternalMediaNatsController {
  private readonly logger = new Logger(ExternalMediaNatsController.name);

  constructor(private readonly externalMediaService: ExternalMediaService) {}

  @MessagePattern({ cmd: 'externalMedia.player' })
  async handleRequest(@Payload() data: ExternalMediaPlayerReq) {
    try {
      await this.externalMediaService.handleRequest(data);

      return {
        status: true,
        msg: 'Success',
      };
    } catch (error) {
      this.logger.error(
        `Error handling external media action: ${error.message}`,
      );
      return {
        status: false,
        msg: error.message,
      };
    }
  }
}

