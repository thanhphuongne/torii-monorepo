import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ExternalDisplayService } from '@server/meet/modules/external-display/external-display.service';
import { ExternalDisplayLinkReq } from '@workspace/protocol';

@Controller()
export class ExternalDisplayNatsController {
  private readonly logger = new Logger(ExternalDisplayNatsController.name);

  constructor(
    private readonly externalDisplayService: ExternalDisplayService,
  ) {}

  @MessagePattern({ cmd: 'externalMedia.display' })
  async handleAction(@Payload() data: ExternalDisplayLinkReq) {
    try {
      await this.externalDisplayService.handleRequest(data);

      return {
        status: true,
        msg: 'Success',
      };
    } catch (error) {
      this.logger.error(
        `Error handling external display action: ${error.message}`,
      );
      return {
        status: false,
        msg: error.message,
      };
    }
  }
}

