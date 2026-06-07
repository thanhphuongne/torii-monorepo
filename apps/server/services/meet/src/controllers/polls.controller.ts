/**
 * Polls Controller (Gateway)
 *
 * Handles HTTP requests for poll operations via Gateway -> NATS -> Meet Service
 * Routes under /api/polls (with JwtAuthGuard)
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { create, fromBinary } from '@bufbuild/protobuf';
import {
  ActivatePollsReq,
  ActivatePollsReqSchema,
  CreatePollReq,
  CreatePollReqSchema,
  SubmitPollResponseReq,
  SubmitPollResponseReqSchema,
  ClosePollReq,
  ClosePollReqSchema,
  PollResponseSchema,
} from '@workspace/protocol';
import {
  sendProtobufResponse,
  JwtAuthGuard,
  sendCommonProtobufResponse,
} from '@server/shared';

@Controller('api/polls')
@UseGuards(JwtAuthGuard)
export class PollsController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Post('activate')
  @HttpCode(HttpStatus.OK)
  async handleActivatePolls(
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

    if (!roomId) {
      sendCommonProtobufResponse(res, false, 'Cần có roomId');
      return;
    }

    let request: ActivatePollsReq;
    try {
      request = fromBinary(ActivatePollsReqSchema, bodyBuffer);
      (request as any).roomId = roomId;
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'polls.activate' }, request),
      );

      sendCommonProtobufResponse(res, result.status, result.msg);
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi kích hoạt bình chọn',
      );
    }
  }

  @Post('create')
  @HttpCode(HttpStatus.OK)
  async handleCreatePoll(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ): Promise<void> {
    const isAdmin = (req as any).isAdmin as boolean;
    const roomId = (req as any).roomId as string;
    const requestedUserId = (req as any).requestedUserId as string;

    if (!isAdmin) {
      const response = create(PollResponseSchema, {
        status: false,
        msg: 'Chỉ quản trị viên mới thực hiện được thao tác này',
      });
      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
      return;
    }

    let request: CreatePollReq;
    try {
      request = fromBinary(CreatePollReqSchema, bodyBuffer);
      (request as any).roomId = roomId;
      (request as any).userId = requestedUserId;
    } catch (error) {
      const response = create(PollResponseSchema, {
        status: false,
        msg: error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      });
      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
      return;
    }

    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'polls.create' }, request),
      );

      const response = create(PollResponseSchema, {
        status: result.status,
        msg: result.msg,
        pollId: result.pollId,
      });

      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
    } catch (error) {
      const response = create(PollResponseSchema, {
        status: false,
        msg: error instanceof Error ? error.message : 'Lỗi khi tạo bình chọn',
      });
      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
    }
  }

  @Get('listPolls')
  @HttpCode(HttpStatus.OK)
  async handleListPolls(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const roomId = (req as any).roomId as string;

    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'polls.listPolls' }, { roomId }),
      );

      const response = create(PollResponseSchema, {
        status: result.status,
        msg: result.msg,
        polls: result.polls,
      });

      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
    } catch (error) {
      const response = create(PollResponseSchema, {
        status: false,
        msg: error instanceof Error ? error.message : 'Lỗi khi liệt kê bình chọn',
      });
      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
    }
  }

  @Get('countTotalResponses/:pollId')
  @HttpCode(HttpStatus.OK)
  async handleCountPollTotalResponses(
    @Req() req: Request,
    @Param('pollId') pollId: string,
    @Res() res: Response,
  ): Promise<void> {
    const roomId = (req as any).roomId as string;

    if (!pollId) {
      const response = create(PollResponseSchema, {
        status: false,
        msg: 'Cần có pollId',
      });
      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
      return;
    }

    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'polls.countTotalResponses' },
          { roomId, pollId },
        ),
      );

      const response = create(PollResponseSchema, {
        status: result.status,
        msg: result.msg,
        pollId: result.pollId,
        totalResponses: result.totalResponses,
      });

      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
    } catch (error) {
      const response = create(PollResponseSchema, {
        status: false,
        msg:
          error instanceof Error
            ? error.message
            : 'Lỗi khi lấy tổng số phản hồi',
      });
      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
    }
  }

  @Get('userSelectedOption/:pollId/:userId')
  @HttpCode(HttpStatus.OK)
  async handleUserSelectedOption(
    @Req() req: Request,
    @Param('pollId') pollId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ): Promise<void> {
    const roomId = (req as any).roomId as string;

    if (!pollId || !userId) {
      const response = create(PollResponseSchema, {
        status: false,
        msg: 'Cần có cả userId và pollId',
      });
      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
      return;
    }

    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'polls.userSelectedOption' },
          { roomId, pollId, userId },
        ),
      );

      const response = create(PollResponseSchema, {
        status: result.status,
        msg: result.msg,
        pollId: result.pollId,
        voted: result.voted,
      });

      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
    } catch (error) {
      const response = create(PollResponseSchema, {
        status: false,
        msg:
          error instanceof Error
            ? error.message
            : 'Lỗi khi lấy lựa chọn của người dùng',
      });
      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
    }
  }

  @Post('submitResponse')
  @HttpCode(HttpStatus.OK)
  async handleUserSubmitResponse(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ): Promise<void> {
    const roomId = (req as any).roomId as string;

    let request: SubmitPollResponseReq;
    try {
      request = fromBinary(SubmitPollResponseReqSchema, bodyBuffer);
      (request as any).roomId = roomId;
    } catch (error) {
      const response = create(PollResponseSchema, {
        status: false,
        msg: error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      });
      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
      return;
    }

    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'polls.submitResponse' }, request),
      );

      const response = create(PollResponseSchema, {
        status: result.status,
        msg: result.msg,
        pollId: result.pollId,
      });

      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
    } catch (error) {
      const response = create(PollResponseSchema, {
        status: false,
        msg:
          error instanceof Error ? error.message : 'Lỗi khi gửi phản hồi',
      });
      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
    }
  }

  @Post('closePoll')
  @HttpCode(HttpStatus.OK)
  async handleClosePoll(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ): Promise<void> {
    const isAdmin = (req as any).isAdmin as boolean;
    const roomId = (req as any).roomId as string;
    const requestedUserId = (req as any).requestedUserId as string;

    if (!isAdmin) {
      const response = create(PollResponseSchema, {
        status: false,
        msg: 'Chỉ quản trị viên mới thực hiện được thao tác này',
      });
      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
      return;
    }

    let request: ClosePollReq;
    try {
      request = fromBinary(ClosePollReqSchema, bodyBuffer);
      (request as any).roomId = roomId;
      (request as any).userId = requestedUserId;
    } catch (error) {
      const response = create(PollResponseSchema, {
        status: false,
        msg: error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      });
      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
      return;
    }

    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'polls.closePoll' }, request),
      );

      const response = create(PollResponseSchema, {
        status: result.status,
        msg: result.msg,
        pollId: result.pollId,
      });

      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
    } catch (error) {
      const response = create(PollResponseSchema, {
        status: false,
        msg: error instanceof Error ? error.message : 'Lỗi khi đóng bình chọn',
      });
      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
    }
  }

  @Get('pollResponsesDetails/:pollId')
  @HttpCode(HttpStatus.OK)
  async handleGetPollResponsesDetails(
    @Req() req: Request,
    @Param('pollId') pollId: string,
    @Res() res: Response,
  ): Promise<void> {
    const isAdmin = (req as any).isAdmin as boolean;
    const roomId = (req as any).roomId as string;

    if (!isAdmin) {
      const response = create(PollResponseSchema, {
        status: false,
        msg: 'Chỉ quản trị viên mới thực hiện được thao tác này',
      });
      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
      return;
    }

    if (!pollId) {
      const response = create(PollResponseSchema, {
        status: false,
        msg: 'Cần có pollId',
      });
      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
      return;
    }

    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'polls.pollResponsesDetails' },
          { roomId, pollId },
        ),
      );

      const response = create(PollResponseSchema, {
        status: result.status,
        msg: result.msg,
        pollId: result.pollId,
        responses: result.responses,
      });

      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
    } catch (error) {
      const response = create(PollResponseSchema, {
        status: false,
        msg:
          error instanceof Error ? error.message : 'Lỗi khi lấy chi tiết bình chọn',
      });
      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
    }
  }

  @Get('pollResponsesResult/:pollId')
  @HttpCode(HttpStatus.OK)
  async handleGetResponsesResult(
    @Req() req: Request,
    @Param('pollId') pollId: string,
    @Res() res: Response,
  ): Promise<void> {
    const roomId = (req as any).roomId as string;

    try {
      const result = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'polls.pollResponsesResult' },
          { roomId, pollId },
        ),
      );

      const response = create(PollResponseSchema, {
        status: result.status,
        msg: result.msg,
        pollId: result.pollId,
        pollResponsesResult: result.pollResponsesResult,
      });

      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
    } catch (error) {
      const response = create(PollResponseSchema, {
        status: false,
        msg:
          error instanceof Error ? error.message : 'Lỗi khi lấy kết quả bình chọn',
      });
      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
    }
  }

  @Get('pollsStats')
  @HttpCode(HttpStatus.OK)
  async handleGetPollsStats(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const roomId = (req as any).roomId as string;

    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'polls.pollsStats' }, { roomId }),
      );

      const response = create(PollResponseSchema, {
        status: result.status,
        msg: result.msg,
        stats: result.stats,
      });

      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
    } catch (error) {
      const response = create(PollResponseSchema, {
        status: false,
        msg:
          error instanceof Error ? error.message : 'Lỗi khi lấy thống kê bình chọn',
      });
      res.status(200);
      sendProtobufResponse(res, PollResponseSchema, response);
    }
  }
}
