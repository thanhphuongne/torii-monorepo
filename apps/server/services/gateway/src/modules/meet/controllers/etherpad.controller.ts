import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { create } from '@bufbuild/protobuf';
import {
  CreateEtherpadSessionResSchema,
  CleanEtherpadReqSchema,
  ChangeEtherpadStatusReqSchema,
  CommonResponseSchema,
} from '@workspace/protocol';
import {
  sendProtoJsonResponse,
  sendCommonProtoJsonResponse,
  JwtAuthGuard,
} from '@server/shared';

@Controller('etherpad')
export class EtherpadController {
  private readonly logger = new Logger(EtherpadController.name);

  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async createSession(@Body() body: any, @Res() res: Response) {
    try {
      // CreateEtherpadSessionReqSchema is missing, assume body is JSON compatible
      // NATS controller handles JSON or Proto
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'etherpad.create' }, body),
      );
      res.status(HttpStatus.OK);
      sendProtoJsonResponse(res, CreateEtherpadSessionResSchema, result);
    } catch (error) {
      // Need to return error in a format client expects?
      // CreateEtherpadSessionRes usually has status/msg
      return res
        .status(HttpStatus.OK)
        .json({ status: false, msg: error.message });
    }
  }

  @Post('clean')
  @UseGuards(JwtAuthGuard)
  async cleanSession(@Body() body: any, @Res() res: Response) {
    try {
      const req = create(CleanEtherpadReqSchema, body);
      await firstValueFrom(
        this.natsClient.send({ cmd: 'etherpad.clean' }, req),
      );
      return res
        .status(HttpStatus.OK)
        .json({ status: true, msg: 'clean initiated' });
    } catch (error) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ status: false, msg: error.message });
    }
  }

  @Post('changeStatus')
  @UseGuards(JwtAuthGuard)
  async changeStatus(@Body() body: any, @Res() res: Response) {
    try {
      const req = create(ChangeEtherpadStatusReqSchema, body);
      await firstValueFrom(
        this.natsClient.send({ cmd: 'etherpad.changeStatus' }, req),
      );
      res.status(HttpStatus.OK);
      sendProtoJsonResponse(res, CommonResponseSchema, {
        status: true,
        msg: 'status changed',
      });
    } catch (error) {
      sendCommonProtoJsonResponse(res, false, error.message);
    }
  }
}
