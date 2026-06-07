/**
 * Recording API Controller (Gateway)
 *
 * Handles recording and RTMP task operations via Gateway -> NATS -> Meet Service
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
  Req,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { fromBinary } from '@bufbuild/protobuf';
import {
  RecordingReq,
  RecordingReqSchema,
  RecordingTasks,
} from '@workspace/protocol';
import { sendCommonProtobufResponse, JwtAuthGuard } from '@server/shared';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class RecordingApiController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  /**
   * HandleRecorderTasks handles start/stop recording & RTMP requests
   * @route POST /api/recording
   * @route POST /api/rtmp
   */
  @Post(['recording', 'rtmp'])
  @HttpCode(HttpStatus.OK)
  async handleRecorderTasks(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ): Promise<void> {
    const isAdmin = (req as any).isAdmin as boolean;
    const tokenRoomId = (req as any).roomId as string;

    if (!isAdmin) {
      sendCommonProtobufResponse(res, false, 'Chỉ quản trị viên mới có thể bắt đầu ghi');
      return;
    }

    if (!tokenRoomId) {
      sendCommonProtobufResponse(res, false, 'Không có roomId trong token');
      return;
    }

    let request: RecordingReq;
    try {
      request = fromBinary(RecordingReqSchema, bodyBuffer);
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    // Check if room is running (via NATS)
    try {
      const roomData: any = await firstValueFrom(
        this.natsClient.send({ cmd: 'room.isActive' }, { roomId: tokenRoomId }),
      );

      // roomData here is { res: IsRoomActiveRes, rInfo, meta } (after my previous fix)
      const rr = roomData.res;
      const rInfo = roomData.rInfo;

      if (!rr || !rr.isActive || !rInfo) {
        sendCommonProtobufResponse(
          res,
          false,
          'Phòng không hoạt động hoặc đã kết thúc.',
        );
        return;
      }

      if (rInfo.roomId !== tokenRoomId) {
        sendCommonProtobufResponse(res, false, 'roomId trong token không khớp');
        return;
      }

      // Specific task checks (Logic matches Go)
      switch (request.task) {
        case RecordingTasks.START_RECORDING:
          if (rInfo.isRecording) {
            sendCommonProtobufResponse(
              res,
              false,
              'Đang ghi hình rồi.',
            );
            return;
          }
          break;
        case RecordingTasks.STOP_RECORDING:
          if (!rInfo.isRecording) {
            sendCommonProtobufResponse(
              res,
              false,
              'Hiện không có ghi hình đang chạy.',
            );
            return;
          }
          break;
        case RecordingTasks.START_RTMP:
          if (!request.rtmpUrl) {
            sendCommonProtobufResponse(res, false, 'Cần có rtmpUrl');
            return;
          }
          if (rInfo.isActiveRtmp) {
            sendCommonProtobufResponse(
              res,
              false,
              'Đang phát RTMP rồi.',
            );
            return;
          }
          break;
        case RecordingTasks.STOP_RTMP:
          if (!rInfo.isActiveRtmp) {
            sendCommonProtobufResponse(
              res,
              false,
              'Hiện không có phát RTMP đang chạy.',
            );
            return;
          }
          break;
      }

      // Set IDs for NATS dispatch
      request.roomId = rInfo.roomId;
      request.roomTableId = BigInt(rInfo.dbTableId).toString();

      // Dispatch task via NATS
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'recording.dispatch' }, request),
      );

      sendCommonProtobufResponse(res, result.status, result.msg || 'thành công');
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error
          ? error.message
          : 'Lỗi khi xử lý tác vụ ghi âm',
      );
    }
  }
}
