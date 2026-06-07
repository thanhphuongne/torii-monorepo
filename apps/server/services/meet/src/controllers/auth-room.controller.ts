/**
 * Auth Room Controller (Gateway)
 *
 * Handles user operations within rooms via Gateway -> NATS -> Meet Service
 * - Generate join tokens
 * Routes under /auth/room (with ApiKeyGuard)
 */

import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import type { Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { create } from '@bufbuild/protobuf';
import {
  GenerateTokenReq,
  GenerateTokenReqSchema,
  GenerateTokenResSchema,
} from '@workspace/protocol';
import {
  sendCommonProtoJsonResponse,
  sendProtoJsonResponse,
  parseAndValidateRequest,
  ApiKeyGuard,
} from '@server/shared';

/**
 * AuthRoomController handles user operations within rooms (ApiKeyGuard routes)
 * Routes under /auth/room
 */
@Controller('auth/room')
@UseGuards(ApiKeyGuard)
export class AuthRoomController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  /**
   * HandleGenerateJoinToken generates a join token for a user
   *
   * @route POST /auth/room/getJoinToken
   */
  @Post('getJoinToken')
  @HttpCode(HttpStatus.OK)
  async handleGenerateJoinToken(
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    // Parse and validate request
    let request: GenerateTokenReq;
    try {
      request = parseAndValidateRequest<GenerateTokenReq>(
        body,
        GenerateTokenReqSchema,
      );
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    // Validate userInfo
    if (!request.userInfo) {
      sendCommonProtoJsonResponse(res, false, 'Cần có UserInfo');
      return;
    }

    // Check if user is blocked (via NATS)
    try {
      const isBlocked = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'user.isUserInBlockList' },
          { roomId: request.roomId, userId: request.userInfo.userId },
        ),
      );

      if (isBlocked) {
        sendCommonProtoJsonResponse(
          res,
          false,
          'Người dùng này bị chặn tham gia phiên',
        );
        return;
      }
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi kiểm tra danh sách chặn',
      );
      return;
    }

    // Check if room is active (via NATS)
    try {
      const isRoomActiveRes: any = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'room.isActive' },
          { roomId: request.roomId },
        ),
      );

      // The NATS handler returns { res: IsRoomActiveRes, ... }
      if (
        !isRoomActiveRes ||
        !isRoomActiveRes.res ||
        !isRoomActiveRes.res.isActive
      ) {
        sendCommonProtoJsonResponse(res, false, 'Phòng không hoạt động');
        return;
      }
    } catch (error) {
      sendCommonProtoJsonResponse(res, false, 'Phòng không hoạt động');
      return;
    }

    // Generate token (via NATS)
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'user.generateJoinToken' }, request),
      );

      const response = create(GenerateTokenResSchema, {
        status: true,
        msg: 'success',
        token: result.token,
      });

      res.status(200);
      sendProtoJsonResponse(res, GenerateTokenResSchema, response);
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi tạo token',
      );
    }
  }
}
