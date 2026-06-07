import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  HttpStatus,
  Inject,
  Logger,
  Req,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { create, fromBinary } from '@bufbuild/protobuf';
import {
  ExternalMediaPlayerReqSchema,
  ExternalDisplayLinkReqSchema,
} from '@workspace/protocol';
import { sendCommonProtobufResponse, JwtAuthGuard } from '@server/shared';

@Controller('api')
export class ExternalMediaController {
  private readonly logger = new Logger(ExternalMediaController.name);

  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Post('externalMediaPlayer')
  @UseGuards(JwtAuthGuard)
  async handleExternalMediaPlayer(
    @Req() req: Request,
    @Body() body: any,
    @Res() res: Response,
  ) {
    await this.handleRequest(
      req,
      body,
      res,
      ExternalMediaPlayerReqSchema,
      'externalMedia.player',
    );
  }

  @Post('externalDisplayLink')
  @UseGuards(JwtAuthGuard)
  async handleExternalDisplayLink(
    @Req() req: Request,
    @Body() body: any,
    @Res() res: Response,
  ) {
    await this.handleRequest(
      req,
      body,
      res,
      ExternalDisplayLinkReqSchema,
      'externalMedia.display',
    );
  }

  private async handleRequest(
    req: Request,
    body: any,
    res: Response,
    schema: any,
    cmd: string,
  ) {
    const isAdmin = (req as any).isAdmin as boolean;
    const roomId = (req as any).roomId as string;
    const requestedUserId = (req as any).requestedUserId as string;

    if (!isAdmin) {
      sendCommonProtobufResponse(
        res,
        false,
        'Chỉ quản trị viên mới thực hiện được thao tác này',
      );
      return;
    }

    if (!roomId) {
      sendCommonProtobufResponse(res, false, 'Cần có roomId');
      return;
    }

    try {
      let request: any;
      if (Buffer.isBuffer(body)) {
        request = fromBinary(schema, body);
      } else {
        request = create(schema, body);
      }

      request.roomId = roomId;
      request.userId = requestedUserId;

      const result = await firstValueFrom(
        this.natsClient.send({ cmd }, request),
      );
      res.status(HttpStatus.OK);
      sendCommonProtobufResponse(res, result.status, result.msg);
    } catch (error) {
      sendCommonProtobufResponse(res, false, error.message);
    }
  }
}
