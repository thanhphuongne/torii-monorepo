import {
  Controller,
  Post,
  Get,
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
import { create } from '@bufbuild/protobuf';
import {
  CreateBreakoutRoomsReq,
  CreateBreakoutRoomsReqSchema,
  JoinBreakoutRoomReq,
  JoinBreakoutRoomReqSchema,
  EndBreakoutRoomReq,
  EndBreakoutRoomReqSchema,
  IncreaseBreakoutRoomDurationReq,
  IncreaseBreakoutRoomDurationReqSchema,
  BroadcastBreakoutRoomMsgReq,
  BroadcastBreakoutRoomMsgReqSchema,
  BreakoutRoomResSchema,
} from '@workspace/protocol';
import {
  sendProtobufResponse,
  parseAndValidateRequest,
  JwtAuthGuard,
} from '@server/shared';

@Controller('api/breakoutRoom')
export class BreakoutController {
  private readonly logger = new Logger(BreakoutController.name);

  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async createBreakoutRooms(
    @Req() req: Request,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const isAdmin = (req as any).isAdmin as boolean;
    const roomId = (req as any).roomId as string;
    const requestedUserId = (req as any).requestedUserId as string;

    if (!isAdmin) {
      const response = create(BreakoutRoomResSchema, {
        status: false,
        msg: 'Chỉ quản trị viên mới thực hiện được thao tác này',
      });
      res.status(HttpStatus.OK);
      sendProtobufResponse(res, BreakoutRoomResSchema, response);
      return;
    }

    try {
      if (!req.headers['content-type'] && body && Buffer.isBuffer(body)) {
        // Manually try to parse simple JSON if it looks like it
        try {
          const str = body.toString('utf8');
          if (str.startsWith('{')) {
            body = JSON.parse(str);
          }
        } catch (e) {}
      }
      const request = parseAndValidateRequest<CreateBreakoutRoomsReq>(
        body,
        CreateBreakoutRoomsReqSchema,
      );
      this.logger.log(`Content-Type: ${req.headers['content-type']}`);
      this.logger.log(
        `Received body type: ${typeof body}, isBuffer: ${Buffer.isBuffer(body)}, length: ${body?.length}`,
      );
      this.logger.log(`Parsed request rooms count: ${request.rooms?.length}`);
      request.roomId = roomId;
      request.requestedUserId = requestedUserId;

      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'breakout.create' }, request),
      );

      const response = create(BreakoutRoomResSchema, {
        status: result.status,
        msg: result.msg,
      });

      res.status(HttpStatus.OK);
      sendProtobufResponse(res, BreakoutRoomResSchema, response);
    } catch (error) {
      const response = create(BreakoutRoomResSchema, {
        status: false,
        msg: error.message || 'Lỗi không xác định',
      });
      res.status(HttpStatus.OK);
      sendProtobufResponse(res, BreakoutRoomResSchema, response);
    }
  }

  @Post('join')
  @UseGuards(JwtAuthGuard)
  async joinBreakoutRoom(
    @Req() req: Request,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const isAdmin = (req as any).isAdmin as boolean;
    const roomId = (req as any).roomId as string;

    try {
      const request = parseAndValidateRequest<JoinBreakoutRoomReq>(
        body,
        JoinBreakoutRoomReqSchema,
      );
      request.roomId = roomId;
      request.isAdmin = isAdmin;

      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'breakout.join' }, request),
      );

      const response = create(BreakoutRoomResSchema, {
        status: result.status,
        msg: result.msg,
        token: result.token,
      });

      res.status(HttpStatus.OK);
      sendProtobufResponse(res, BreakoutRoomResSchema, response);
    } catch (error) {
      const response = create(BreakoutRoomResSchema, {
        status: false,
        msg: error.message || 'Lỗi không xác định',
      });
      res.status(HttpStatus.OK);
      sendProtobufResponse(res, BreakoutRoomResSchema, response);
    }
  }

  @Get('listRooms')
  @UseGuards(JwtAuthGuard)
  async getBreakoutRooms(@Req() req: Request, @Res() res: Response) {
    const roomId = (req as any).roomId as string;

    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'breakout.get' }, { roomId }),
      );

      const response = create(BreakoutRoomResSchema, {
        status: result.status,
        msg: result.msg,
        rooms: result.rooms,
      });

      res.status(HttpStatus.OK);
      sendProtobufResponse(res, BreakoutRoomResSchema, response);
    } catch (error) {
      const response = create(BreakoutRoomResSchema, {
        status: false,
        msg: error.message || 'Lỗi không xác định',
      });
      res.status(HttpStatus.OK);
      sendProtobufResponse(res, BreakoutRoomResSchema, response);
    }
  }

  @Get('myRooms')
  @UseGuards(JwtAuthGuard)
  async getMyBreakoutRoom(@Req() req: Request, @Res() res: Response) {
    const roomId = (req as any).roomId as string;
    const requestedUserId = (req as any).requestedUserId as string;

    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'breakout.my' },
          { roomId, userId: requestedUserId },
        ),
      );

      const response = create(BreakoutRoomResSchema, {
        status: result.status,
        msg: result.msg,
        room: result.room,
      });

      res.status(HttpStatus.OK);
      sendProtobufResponse(res, BreakoutRoomResSchema, response);
    } catch (error) {
      const response = create(BreakoutRoomResSchema, {
        status: false,
        msg: error.message || 'Lỗi không xác định',
      });
      res.status(HttpStatus.OK);
      sendProtobufResponse(res, BreakoutRoomResSchema, response);
    }
  }

  @Post('increaseDuration')
  @UseGuards(JwtAuthGuard)
  async increaseDuration(
    @Req() req: Request,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const roomId = (req as any).roomId as string;

    try {
      const request = parseAndValidateRequest<IncreaseBreakoutRoomDurationReq>(
        body,
        IncreaseBreakoutRoomDurationReqSchema,
      );
      request.roomId = roomId;

      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'breakout.increaseDuration' }, request),
      );

      const response = create(BreakoutRoomResSchema, {
        status: result.status,
        msg: result.msg,
      });

      res.status(HttpStatus.OK);
      sendProtobufResponse(res, BreakoutRoomResSchema, response);
    } catch (error) {
      const response = create(BreakoutRoomResSchema, {
        status: false,
        msg: error.message || 'Lỗi không xác định',
      });
      res.status(HttpStatus.OK);
      sendProtobufResponse(res, BreakoutRoomResSchema, response);
    }
  }

  @Post('sendMsg')
  @UseGuards(JwtAuthGuard)
  async sendMsg(@Req() req: Request, @Body() body: any, @Res() res: Response) {
    const roomId = (req as any).roomId as string;

    try {
      const request = parseAndValidateRequest<BroadcastBreakoutRoomMsgReq>(
        body,
        BroadcastBreakoutRoomMsgReqSchema,
      );
      request.roomId = roomId;

      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'breakout.broadcast' }, request),
      );

      const response = create(BreakoutRoomResSchema, {
        status: result.status,
        msg: result.msg,
      });

      res.status(HttpStatus.OK);
      sendProtobufResponse(res, BreakoutRoomResSchema, response);
    } catch (error) {
      const response = create(BreakoutRoomResSchema, {
        status: false,
        msg: error.message || 'Lỗi không xác định',
      });
      res.status(HttpStatus.OK);
      sendProtobufResponse(res, BreakoutRoomResSchema, response);
    }
  }

  @Post('endRoom')
  @UseGuards(JwtAuthGuard)
  async endBreakoutRoom(
    @Req() req: Request,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const roomId = (req as any).roomId as string;

    try {
      const request = parseAndValidateRequest<EndBreakoutRoomReq>(
        body,
        EndBreakoutRoomReqSchema,
      );
      request.roomId = roomId;

      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'breakout.end' }, request),
      );

      const response = create(BreakoutRoomResSchema, {
        status: result.status,
        msg: result.msg,
      });

      res.status(HttpStatus.OK);
      sendProtobufResponse(res, BreakoutRoomResSchema, response);
    } catch (error) {
      const response = create(BreakoutRoomResSchema, {
        status: false,
        msg: error.message || 'Lỗi không xác định',
      });
      res.status(HttpStatus.OK);
      sendProtobufResponse(res, BreakoutRoomResSchema, response);
    }
  }

  @Post('endAllRooms')
  @UseGuards(JwtAuthGuard)
  async endAllBreakoutRooms(@Req() req: Request, @Res() res: Response) {
    const isAdmin = (req as any).isAdmin as boolean;
    const roomId = (req as any).roomId as string;

    if (!isAdmin) {
      const response = create(BreakoutRoomResSchema, {
        status: false,
        msg: 'Chỉ quản trị viên mới thực hiện được thao tác này',
      });
      res.status(HttpStatus.OK);
      sendProtobufResponse(res, BreakoutRoomResSchema, response);
      return;
    }

    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'breakout.endAll' }, { roomId }),
      );

      const response = create(BreakoutRoomResSchema, {
        status: result.status,
        msg: result.msg,
      });

      res.status(HttpStatus.OK);
      sendProtobufResponse(res, BreakoutRoomResSchema, response);
    } catch (error) {
      const response = create(BreakoutRoomResSchema, {
        status: false,
        msg: error.message || 'Lỗi không xác định',
      });
      res.status(HttpStatus.OK);
      sendProtobufResponse(res, BreakoutRoomResSchema, response);
    }
  }
}
