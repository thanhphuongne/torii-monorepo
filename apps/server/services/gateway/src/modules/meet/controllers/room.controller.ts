/**
 * Room Controller (Gateway)
 *
 * Handles all room-related API endpoints via Gateway -> NATS -> Meet Service
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
import { create, fromBinary } from '@bufbuild/protobuf';
import {
  CreateRoomReq,
  CreateRoomReqSchema,
  CreateRoomResSchema,
  IsRoomActiveReq,
  IsRoomActiveReqSchema,
  IsRoomActiveResSchema,
  GetActiveRoomInfoReq,
  GetActiveRoomInfoReqSchema,
  GetActiveRoomInfoResSchema,
  GetActiveRoomsInfoResSchema,
  RoomEndReq,
  RoomEndReqSchema,
  FetchPastRoomsReq,
  FetchPastRoomsReqSchema,
  FetchPastRoomsResSchema,
  ChangeVisibilityRes,
  ChangeVisibilityResSchema,
} from '@workspace/protocol';
import {
  sendCommonProtoJsonResponse,
  sendProtoJsonResponse,
  sendCommonProtobufResponse,
  parseAndValidateRequest,
  ApiKeyGuard,
  JwtAuthGuard,
} from '@server/shared';

/**
 * RoomController handles room-related operations
 * Routes under /auth/room (with ApiKeyGuard)
 */
@Controller('auth/room')
@UseGuards(ApiKeyGuard)
export class RoomController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  /**
   * HandleRoomCreate handles creating a new room
   *
   * @route POST /auth/room/create
   */
  @Post('create')
  async handleRoomCreate(
    @Body() body: any, // Accept both JSON and binary
    @Res() res: Response,
  ): Promise<void> {
    // Parse and validate request
    let request: CreateRoomReq;
    try {
      request = parseAndValidateRequest<CreateRoomReq>(
        body,
        CreateRoomReqSchema,
      );
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    // Call room service via NATS (plain object, not binary)
    try {
      const roomInfo = await firstValueFrom(
        this.natsClient.send({ cmd: 'room.create' }, request),
      );

      const response = create(CreateRoomResSchema, {
        status: true,
        msg: 'success',
        roomInfo: roomInfo,
      });

      res.status(200);
      sendProtoJsonResponse(res, CreateRoomResSchema, response);
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi tạo phòng',
      );
    }
  }

  /**
   * HandleIsRoomActive checks if a room is active
   *
   * @route POST /auth/room/isRoomActive
   */
  @Post('isRoomActive')
  @HttpCode(HttpStatus.OK)
  async handleIsRoomActive(
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    // Parse and validate request
    let request: IsRoomActiveReq;
    try {
      request = parseAndValidateRequest<IsRoomActiveReq>(
        body,
        IsRoomActiveReqSchema,
      );
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    // Call room service via NATS
    try {
      const natsPayload: unknown = await firstValueFrom(
        this.natsClient.send({ cmd: 'room.isActive' }, request),
      );

      // Meet service returns { res: IsRoomActiveRes, roomDbInfo, rInfo, metadata, ... }
      // (see RoomHandler.isRoomActive). Gateway must only JSON-encode IsRoomActiveRes,
      // not the wrapper — otherwise toJson(IsRoomActiveResSchema, …) fails with
      // "cannot use field … IsRoomActiveRes.status with message undefined".
      const p = natsPayload as { res?: unknown } | null;
      const isRoomActiveRes =
        p != null && typeof p === 'object' && p.res != null ? p.res : natsPayload;

      res.status(200);
      sendProtoJsonResponse(res, IsRoomActiveResSchema, isRoomActiveRes);
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi kiểm tra trạng thái phòng',
      );
    }
  }

  /**
   * HandleGetActiveRoomInfo gets information about an active room
   *
   * @route POST /auth/room/getActiveRoomInfo
   */
  @Post('getActiveRoomInfo')
  @HttpCode(HttpStatus.OK)
  async handleGetActiveRoomInfo(
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    // Parse and validate request
    let request: GetActiveRoomInfoReq;
    try {
      request = parseAndValidateRequest<GetActiveRoomInfoReq>(
        body,
        GetActiveRoomInfoReqSchema,
      );
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    // Call room service via NATS (plain object, not binary)
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'room.getActiveInfo' }, request),
      );

      const response = create(GetActiveRoomInfoResSchema, {
        status: result.status,
        msg: result.msg,
        room: result.room,
      });

      res.status(200);
      sendProtoJsonResponse(res, GetActiveRoomInfoResSchema, response);
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi lấy thông tin phòng',
      );
    }
  }

  /**
   * HandleGetActiveRoomsInfo gets information about all active rooms
   *
   * @route POST /auth/room/getActiveRoomsInfo
   */
  @Post('getActiveRoomsInfo')
  @HttpCode(HttpStatus.OK)
  async handleGetActiveRoomsInfo(@Res() res: Response): Promise<void> {
    // Call room service via NATS (no request body)
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'room.getActiveRoomsInfo' }, {}),
      );

      const response = create(GetActiveRoomsInfoResSchema, {
        status: result.status,
        msg: result.msg,
        rooms: result.rooms,
      });

      res.status(200); // Set 200 OK
      sendProtoJsonResponse(res, GetActiveRoomsInfoResSchema, response);
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi lấy danh sách phòng',
      );
    }
  }

  /**
   * HandleEndRoom handles ending a room
   * internal / trusted
   * @route POST /auth/room/endRoom
   */
  @Post('endRoom')
  @HttpCode(HttpStatus.OK)
  async handleEndRoom(@Body() body: any, @Res() res: Response): Promise<void> {
    // Parse and validate request
    let request: RoomEndReq;
    try {
      request = parseAndValidateRequest<RoomEndReq>(body, RoomEndReqSchema);
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    // Call room service via NATS (plain object, not binary)
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'room.end' }, request),
      );

      sendCommonProtoJsonResponse(res, result.status, result.msg);
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi kết thúc phòng',
      );
    }
  }

  /**
   * HandleFetchPastRooms handles fetching past rooms
   *
   * @route POST /auth/room/fetchPastRooms
   */
  @Post('fetchPastRooms')
  @HttpCode(HttpStatus.OK)
  async handleFetchPastRooms(
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    // Parse and validate request
    let request: FetchPastRoomsReq;
    try {
      request = parseAndValidateRequest<FetchPastRoomsReq>(
        body,
        FetchPastRoomsReqSchema,
      );
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    // Call room service via NATS (plain object, not binary)
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'room.fetchPast' }, request),
      );

      if (Number(result.totalRooms) === 0) {
        sendCommonProtoJsonResponse(res, false, 'no info found');
        return;
      }

      const response = create(FetchPastRoomsResSchema, {
        status: true,
        msg: 'success',
        result: result,
      });

      res.status(200);
      sendProtoJsonResponse(res, FetchPastRoomsResSchema, response);
    } catch (error) {
      sendCommonProtoJsonResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi tải lịch sử phòng',
      );
    }
  }
}

/**
 * RoomApiController handles room-related API operations with JWT auth
 * Routes under /api (with JwtAuthGuard)
 */
@Controller('api')
@UseGuards(JwtAuthGuard)
export class RoomApiController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  /**
   * HandleEndRoomForAPI handles ending a room via API call
   * external / strict security
   * @route POST /api/endRoom
   */
  @Post('endRoom')
  @HttpCode(HttpStatus.OK)
  async handleEndRoomForAPI(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ): Promise<void> {
    // Get locals from JwtAuthGuard
    const isAdmin = (req as any).isAdmin as boolean;
    const tokenRoomId = (req as any).roomId as string;

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
    let request: RoomEndReq;
    try {
      request = fromBinary(RoomEndReqSchema, bodyBuffer);
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    // Validate room ID matches token
    if (tokenRoomId !== request.roomId) {
      sendCommonProtobufResponse(
        res,
        false,
        'roomId yêu cầu không khớp với roomId trong token',
      );
      return;
    }

    // Call room service via NATS (plain object, not binary)
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'room.end' }, request),
      );

      sendCommonProtobufResponse(res, result.status, result.msg);
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi kết thúc phòng',
      );
    }
  }

  /**
   * HandleChangeVisibilityForAPI handles changing room visibility via API call
   *
   * @route POST /api/changeVisibility
   */
  @Post('changeVisibility')
  @HttpCode(HttpStatus.OK)
  async handleChangeVisibilityForAPI(
    @Req() req: Request,
    @Body() bodyBuffer: Buffer,
    @Res() res: Response,
  ): Promise<void> {
    // Get locals from JwtAuthGuard
    const isAdmin = (req as any).isAdmin as boolean;
    const tokenRoomId = (req as any).roomId as string;

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
    let request: ChangeVisibilityRes;
    try {
      request = fromBinary(ChangeVisibilityResSchema, bodyBuffer);
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Yêu cầu không hợp lệ',
      );
      return;
    }

    // Validate room ID matches token
    if (tokenRoomId !== request.roomId) {
      sendCommonProtobufResponse(
        res,
        false,
        'roomId yêu cầu không khớp với roomId trong token',
      );
      return;
    }

    // Call room service via NATS (plain object, not binary)
    try {
      const result = await firstValueFrom(
        this.natsClient.send({ cmd: 'room.changeVisibility' }, request),
      );

      sendCommonProtobufResponse(res, result.status, result.msg);
    } catch (error) {
      sendCommonProtobufResponse(
        res,
        false,
        error instanceof Error ? error.message : 'Lỗi khi thay đổi chế độ hiển thị',
      );
    }
  }
}
