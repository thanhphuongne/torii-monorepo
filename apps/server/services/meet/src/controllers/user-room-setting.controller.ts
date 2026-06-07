/**
 * User Room Setting Controller (Gateway)
 *
 * Handles user operations within rooms via Gateway -> NATS -> Meet Service
 * Routes under /api (with JwtAuthGuard)
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
import { fromBinary, create } from '@bufbuild/protobuf';
import {
  UpdateUserLockSettingsReq,
  UpdateUserLockSettingsReqSchema,
  MuteUnMuteTrackReq,
  MuteUnMuteTrackReqSchema,
  RemoveParticipantReq,
  RemoveParticipantReqSchema,
  SwitchPresenterReq,
  SwitchPresenterReqSchema,
  VerifyTokenReq,
  VerifyTokenReqSchema,
  IsRoomActiveReqSchema,
  VerifyTokenResSchema,
  NatsSubjectsSchema,
} from '@workspace/protocol';
import {
  sendCommonProtobufResponse,
  JwtAuthGuard,
  sendProtobufResponse,
  AppConfigService,
} from '@server/shared';

/**
 * UserRoomSettingController handles user operations within rooms (JwtAuthGuard routes)
 * Routes under /api
 */
@Controller('api')
@UseGuards(JwtAuthGuard)
export class UserRoomSettingController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
    private readonly appConfig: AppConfigService,
  ) {}

  /**
   * HandleVerifyToken verifies a user's token before they join a room
   *
   * @route POST /api/verifyToken
   */
  @Post('verifyToken')
  @HttpCode(HttpStatus.OK)
  async handleVerifyToken(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ): Promise<void> {
    // Get locals set by JwtAuthGuard
    const roomId = (req as any).roomId as string;
    const requestedUserId = (req as any).requestedUserId as string;

    // Parse protobuf request
    let request: VerifyTokenReq;
    try {
      request = fromBinary(VerifyTokenReqSchema, bodyBuffer);
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    // Check for duplicate join
    try {
      const userStatus = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'user.getUserStatus' },
          {
            roomId,
            userId: requestedUserId,
          },
        ),
      );

      if (!userStatus || userStatus === '') {
        sendCommonProtobufResponse(
          res,
          false,
          'Không tìm thấy thông tin người dùng trong phòng.',
        );
        return;
      } else if (userStatus === 'online') {
        sendCommonProtobufResponse(
          res,
          false,
          'Cùng tài khoản đã tham gia phòng từ thiết bị khác; không thể xác minh lúc này.',
        );
        return;
      }
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi kiểm tra trạng thái người dùng',
      );
      return;
    }

    // Check if user is in block list
    try {
      const isBlocked = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'user.isUserInBlockList' },
          { roomId, userId: requestedUserId },
        ),
      );

      if (isBlocked) {
        sendCommonProtobufResponse(
          res,
          false,
          'Bạn đã bị chặn tham gia phòng này.',
        );
        return;
      }
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi kiểm tra danh sách chặn',
      );
      return;
    }

    // Check if room is active
    try {
      const isRoomActiveReq = create(IsRoomActiveReqSchema, { roomId });
      // Send plain object to NATS - NestJS handles JSON serialization
      const roomActiveResponse = await firstValueFrom(
        this.natsClient.send({ cmd: 'room.isActive' }, isRoomActiveReq),
      );

      if (!roomActiveResponse) {
        sendCommonProtobufResponse(res, false, 'Không lấy được trạng thái phòng');
        return;
      }

      // roomActiveResponse can be either IsRoomActiveRes or full payload { res, roomDbInfo, rInfo, meta }
      const roomData = roomActiveResponse?.res
        ? roomActiveResponse
        : { res: roomActiveResponse };
      const rr = roomData.res;
      const rInfo = roomData.rInfo;
      // const roomDbInfo = roomData.roomDbInfo;
      const meta = roomData.meta ?? roomData.metadata;

      if (!rr?.isActive) {
        sendCommonProtobufResponse(
          res,
          false,
          'Phòng không hoạt động hoặc đã kết thúc.',
        );
        return;
      }

      // Check max participants
      if ((rInfo?.maxParticipants || 0) > 0) {
        const onlineUsersCount = await firstValueFrom(
          this.natsClient.send({ cmd: 'user.getOnlineUsersCount' }, { roomId }),
        );
        if (onlineUsersCount >= (rInfo?.maxParticipants || 0)) {
          sendCommonProtobufResponse(
            res,
            false,
            'Đã đạt số người tham gia tối đa cho phòng.',
          );
          return;
        }
      }

      // Build successful response
      const natsWsUrls = this.appConfig.nats.wsUrls || [];
      const version = '1.0.0';

      // Read NATS subjects from config
      const subjects = this.appConfig.nats.subjects;
      const natsSubjects = {
        systemApiWorker: subjects.systemApiWorker,
        systemJsWorker: subjects.systemJsWorker,
        systemPublic: subjects.systemPublic,
        systemPrivate: subjects.systemPrivate,
        chat: subjects.chat,
        whiteboard: subjects.whiteboard,
        dataChannel: subjects.dataChannel,
      };

      let enabledSelfInsertEncryptionKey = false;
      if (meta?.roomFeatures?.endToEndEncryptionFeatures?.isEnabled) {
        enabledSelfInsertEncryptionKey =
          meta.roomFeatures.endToEndEncryptionFeatures
            .enabledSelfInsertEncryptionKey || false;
      }

      const response = create(VerifyTokenResSchema, {
        status: true,
        msg: 'Token hợp lệ.',
        natsWsUrls: natsWsUrls,
        serverVersion: version,
        roomId: roomId,
        userId: requestedUserId,
        natsSubjects: create(NatsSubjectsSchema, natsSubjects),
        roomStreamName: this.appConfig.nats.streamName,
        enabledSelfInsertEncryptionKey: enabledSelfInsertEncryptionKey,
        isCloud: this.appConfig.server.isCloud,
      });

      // Keep parameter order consistent with sendProtobufResponse(res, schema, message)
      sendProtobufResponse(res, VerifyTokenResSchema, response);
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi xác minh token',
      );
    }
  }

  /**
   * HandleUpdateUserLockSetting updates user lock settings
   *
   * @route POST /api/updateLockSettings
   */
  @Post('updateLockSettings')
  @HttpCode(HttpStatus.OK)
  async handleUpdateUserLockSetting(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ): Promise<void> {
    // Get locals from JwtAuthGuard
    const isAdmin = (req as any).isAdmin as boolean;
    const roomId = (req as any).roomId as string;
    const requestedUserId = (req as any).requestedUserId as string;

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
    let request: UpdateUserLockSettingsReq;
    try {
      request = fromBinary(UpdateUserLockSettingsReqSchema, bodyBuffer);
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    // Validate room ID matches token
    if (roomId !== request.roomId) {
      sendCommonProtobufResponse(
        res,
        false,
        'roomId yêu cầu không khớp với roomId trong token',
      );
      return;
    }

    // Check if room is running (via NATS)
    try {
      const room = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'room.getRoomInfoBySid' },
          { sid: request.roomSid, isRunning: 1 },
        ),
      );

      if (!room || !room.id) {
        sendCommonProtobufResponse(res, false, 'Phòng hiện không chạy');
        return;
      }
    } catch (error) {
      sendCommonProtobufResponse(res, false, 'Phòng hiện không chạy');
      return;
    }

    // Add requestedUserId to request
    request.requestedUserId = requestedUserId;

    // Call user service via NATS
    try {
      await firstValueFrom(
        this.natsClient.send({ cmd: 'user.updateLockSettings' }, request),
      );

      sendCommonProtobufResponse(res, true, 'thành công');
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi cập nhật cài đặt khóa',
      );
    }
  }

  /**
   * HandleMuteUnMuteTrack mutes or unmutes a user's track
   *
   * @route POST /api/muteUnMuteTrack
   */
  @Post('muteUnmuteTrack')
  @HttpCode(HttpStatus.OK)
  async handleMuteUnMuteTrack(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ): Promise<void> {
    // Get locals from JwtAuthGuard
    const isAdmin = (req as any).isAdmin as boolean;
    const roomId = (req as any).roomId as string;
    const requestedUserId = (req as any).requestedUserId as string;

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
    let request: MuteUnMuteTrackReq;
    try {
      request = fromBinary(MuteUnMuteTrackReqSchema, bodyBuffer);
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    // Validate room ID matches token
    if (roomId !== request.roomId) {
      sendCommonProtobufResponse(
        res,
        false,
        'roomId yêu cầu không khớp với roomId trong token',
      );
      return;
    }

    // Check if room is running (via NATS)
    try {
      const room = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'room.getRoomInfoBySid' },
          { sid: request.sid, isRunning: 1 },
        ),
      );

      if (!room || !room.id) {
        sendCommonProtobufResponse(res, false, 'Phòng hiện không chạy');
        return;
      }
    } catch (error) {
      sendCommonProtobufResponse(res, false, 'Phòng hiện không chạy');
      return;
    }

    // Add requestedUserId to request
    request.requestedUserId = requestedUserId;

    // Call user service via NATS
    try {
      await firstValueFrom(
        this.natsClient.send({ cmd: 'user.muteUnMuteTrack' }, request),
      );

      sendCommonProtobufResponse(res, true, 'thành công');
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi tắt/bật tiếng track',
      );
    }
  }

  /**
   * HandleRemoveParticipant removes a participant from a room
   *
   * @route POST /api/removeParticipant
   */
  @Post('removeParticipant')
  @HttpCode(HttpStatus.OK)
  async handleRemoveParticipant(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ): Promise<void> {
    // Get locals from JwtAuthGuard
    const isAdmin = (req as any).isAdmin as boolean;
    const roomId = (req as any).roomId as string;
    const requestedUserId = (req as any).requestedUserId as string;

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
    let request: RemoveParticipantReq;
    try {
      request = fromBinary(RemoveParticipantReqSchema, bodyBuffer);
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    // Validate room ID matches token
    if (roomId !== request.roomId) {
      sendCommonProtobufResponse(
        res,
        false,
        'roomId yêu cầu không khớp với roomId trong token',
      );
      return;
    }

    // Validate user can't remove themselves
    if (requestedUserId === request.userId) {
      sendCommonProtobufResponse(res, false, 'Bạn không thể tự loại chính mình');
      return;
    }

    // Check if room is running (via NATS)
    try {
      const room = await firstValueFrom(
        this.natsClient.send(
          { cmd: 'room.getRoomInfoBySid' },
          { sid: request.sid, isRunning: 1 },
        ),
      );

      if (!room || !room.id) {
        sendCommonProtobufResponse(res, false, 'Phòng hiện không chạy');
        return;
      }
    } catch (error) {
      sendCommonProtobufResponse(res, false, 'Phòng hiện không chạy');
      return;
    }

    // Call user service via NATS
    try {
      await firstValueFrom(
        this.natsClient.send({ cmd: 'user.removeParticipant' }, request),
      );

      sendCommonProtobufResponse(res, true, 'thành công');
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi loại người tham gia',
      );
    }
  }

  /**
   * HandleSwitchPresenter switches the presenter in a room
   *
   * @route POST /api/switchPresenter
   */
  @Post('switchPresenter')
  @HttpCode(HttpStatus.OK)
  async handleSwitchPresenter(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ): Promise<void> {
    // Get locals from JwtAuthGuard
    const isAdmin = (req as any).isAdmin as boolean;
    const roomId = (req as any).roomId as string;
    const requestedUserId = (req as any).requestedUserId as string;

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
    let request: SwitchPresenterReq;
    try {
      request = fromBinary(SwitchPresenterReqSchema, bodyBuffer);
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    // Set roomId and requestedUserId from token (matches proto field names)
    request.roomId = roomId;
    request.requestedUserId = requestedUserId;

    // Call user service via NATS
    try {
      await firstValueFrom(
        this.natsClient.send({ cmd: 'user.switchPresenter' }, request),
      );

      sendCommonProtobufResponse(res, true, 'thành công');
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi chuyển người trình bày',
      );
    }
  }
}
