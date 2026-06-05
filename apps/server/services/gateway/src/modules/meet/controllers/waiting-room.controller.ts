/**
 * Waiting Room Controller (Gateway)
 *
 * Handles HTTP endpoints for waiting room operations via Gateway -> NATS -> Meet Service
 * Routes under /api/waitingRoom (with JWT auth)
 */

import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { fromBinary } from '@bufbuild/protobuf';
import {
  ApproveWaitingUsersReq,
  ApproveWaitingUsersReqSchema,
  UpdateWaitingRoomMessageReq,
  UpdateWaitingRoomMessageReqSchema,
} from '@workspace/protocol';
import { sendCommonProtobufResponse, JwtAuthGuard } from '@server/shared';

/**
 * WaitingRoomController handles waiting room operations
 * Routes under /api/waitingRoom (with JwtAuthGuard)
 */
@Controller('api/waitingRoom')
@UseGuards(JwtAuthGuard)
export class WaitingRoomController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  /**
   * handleApproveUsers handles approving users from the waiting room
   *
   * @route POST /api/waitingRoom/approveUsers
   */
  @Post('approveUsers')
  @HttpCode(HttpStatus.OK)
  async handleApproveUsers(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ): Promise<void> {
    // Get locals from JwtAuthGuard
    const isAdmin = (req as any).isAdmin as boolean;
    const roomId = (req as any).roomId as string;

    // Check admin permission
    if (!isAdmin) {
      sendCommonProtobufResponse(
        res,
        false,
        'Chỉ quản trị viên mới thực hiện được thao tác này',
      );
      return;
    }

    // Parse protobuf request
    let request: ApproveWaitingUsersReq;
    try {
      request = fromBinary(ApproveWaitingUsersReqSchema, bodyBuffer);
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    // Set roomId from token
    request.roomId = roomId;

    // Call room service via NATS
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'waitingRoom.approveUsers' }, request),
      );

      sendCommonProtobufResponse(res, result.status, result.msg);
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi duyệt người dùng',
      );
    }
  }

  /**
   * handleUpdateWaitingRoomMessage handles updating the waiting room message
   *
   * @route POST /api/waitingRoom/updateMsg
   */
  @Post('updateMsg')
  @HttpCode(HttpStatus.OK)
  async handleUpdateWaitingRoomMessage(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ): Promise<void> {
    // Get locals from JwtAuthGuard
    const isAdmin = (req as any).isAdmin as boolean;
    const roomId = (req as any).roomId as string;

    // Check admin permission
    if (!isAdmin) {
      sendCommonProtobufResponse(
        res,
        false,
        'Chỉ quản trị viên mới thực hiện được thao tác này',
      );
      return;
    }

    // Parse protobuf request
    let request: UpdateWaitingRoomMessageReq;
    try {
      request = fromBinary(UpdateWaitingRoomMessageReqSchema, bodyBuffer);
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    // Set roomId from token
    request.roomId = roomId;

    // Call room service via NATS
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'waitingRoom.updateMsg' }, request),
      );

      sendCommonProtobufResponse(res, result.status, result.msg);
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error
          ? error.message
          : 'Lỗi khi cập nhật tin nhắn phòng chờ',
      );
    }
  }
}
