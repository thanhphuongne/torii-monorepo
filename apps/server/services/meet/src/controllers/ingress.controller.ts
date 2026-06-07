/**
 * Ingress Controller (Gateway)
 *
 * Handles livekit ingress creation requests
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
  CreateIngressReqSchema,
  CreateIngressResSchema,
} from '@workspace/protocol';
import {
  sendCommonProtobufResponse,
  sendProtobufResponse,
  JwtAuthGuard,
} from '@server/shared';
import { fromBinary } from '@bufbuild/protobuf';

@Controller('api/ingress')
@UseGuards(JwtAuthGuard)
export class IngressController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  /**
   * HandleCreateIngress handles creating a new ingress
   * @route POST /api/ingress/create
   */
  @Post('create')
  async handleCreateIngress(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ): Promise<void> {
    const isAdmin = (req as any).isAdmin as boolean;
    const roomId = (req as any).roomId as string;

    if (!isAdmin) {
      sendCommonProtobufResponse(
        res,
        false,
        'Chỉ quản trị viên mới thực hiện được thao tác này',
      );
      return;
    }

    try {
      const request = fromBinary(CreateIngressReqSchema, bodyBuffer);
      // Ensure the roomId from the JWT token is used
      request.roomId = roomId;

      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'ingress.create' }, request),
      );

      sendProtobufResponse(res, CreateIngressResSchema, result);
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi tạo ingress',
      );
    }
  }
}
