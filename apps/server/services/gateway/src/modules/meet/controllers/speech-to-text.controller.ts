/**
 * Speech To Text Controller (Gateway)
 *
 * Handles legacy Azure Speech Services integration
 */

import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Response, Request } from 'express';
import { firstValueFrom } from 'rxjs';
import {
  SpeechToTextTranslationReqSchema,
  GenerateAzureTokenReqSchema,
  SpeechServiceUserStatusReqSchema,
  AzureTokenRenewReqSchema,
} from '@workspace/protocol';
import { sendCommonProtobufResponse, JwtAuthGuard } from '@server/shared';
import { fromBinary } from '@bufbuild/protobuf';

@Controller('api/speechServices')
@UseGuards(JwtAuthGuard)
export class SpeechToTextController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Post('serviceStatus')
  async handleSpeechToTextTranslationServiceStatus(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ) {
    if (!(req as any).isAdmin)
      return sendCommonProtobufResponse(
        res,
        false,
        'Chỉ quản trị viên mới thực hiện được thao tác này',
      );

    try {
      const request = fromBinary(SpeechToTextTranslationReqSchema, bodyBuffer);
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'speech.serviceStatus' },
          { ...request, roomId: (req as any).roomId },
        ),
      );
      sendCommonProtobufResponse(res, result.status, result.msg);
    } catch (error) {
      sendCommonProtobufResponse(res, false, error.message);
    }
  }

  @Post('azureToken')
  async handleGenerateAzureToken(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ) {
    try {
      const request = fromBinary(GenerateAzureTokenReqSchema, bodyBuffer);
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'speech.generateAzureToken' },
          {
            ...request,
            roomId: (req as any).roomId,
            userId: (req as any).requestedUserId,
          },
        ),
      );
      sendCommonProtobufResponse(res, result.status, result.msg);
    } catch (error) {
      sendCommonProtobufResponse(res, false, error.message);
    }
  }

  @Post('userStatus')
  async handleSpeechServiceUserStatus(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ) {
    try {
      const request = fromBinary(SpeechServiceUserStatusReqSchema, bodyBuffer);
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'speech.userStatus' },
          {
            ...request,
            roomId: (req as any).roomId,
            userId: (req as any).requestedUserId,
          },
        ),
      );
      sendCommonProtobufResponse(res, result.status, result.msg);
    } catch (error) {
      sendCommonProtobufResponse(res, false, error.message);
    }
  }

  @Post('renewToken')
  async handleRenewAzureToken(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ) {
    try {
      const request = fromBinary(AzureTokenRenewReqSchema, bodyBuffer);
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'speech.renewToken' },
          {
            ...request,
            roomId: (req as any).roomId,
            userId: (req as any).requestedUserId,
          },
        ),
      );
      sendCommonProtobufResponse(res, result.status, result.msg);
    } catch (error) {
      sendCommonProtobufResponse(res, false, error.message);
    }
  }
}
