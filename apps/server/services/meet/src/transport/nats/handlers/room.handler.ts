/**
 * Room NATS Handler (Meet Service)
 *
 * Handles NATS message patterns for room operations
 */

import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RoomCreateService } from '@server/meet/modules/room/room-create.service';
import { RoomInfoService } from '@server/meet/modules/room/room-info.service';
import { RoomModifyService } from '@server/meet/modules/room/room-modify.service';
import { RoomEndService } from '@server/meet/modules/room/room-end.service';
import type {
  CreateRoomReq,
  GetActiveRoomInfoReq,
  IsRoomActiveReq,
  FetchPastRoomsReq,
} from '@workspace/protocol';

/**
 * RoomHandler - NATS Message Handler for Room Operations
 *
 * CRITICAL: Do NOT use @Controller() decorator for microservice controllers!
 * BUT you MUST use @Injectable() for dependency injection to work!
 *
 * Why? In NestJS:
 * - @Controller() is for HTTP routes (@Get, @Post, etc.)
 * - Microservices use ONLY @MessagePattern (no @Controller needed)
 * - But still need @Injectable() for DI
 * - Using both will cause @MessagePattern to be IGNORED
 *
 * This controller handles NATS message patterns, not HTTP routes.
 */
@Controller()
export class RoomHandler {
  private readonly logger = new Logger(RoomHandler.name);

  constructor(
    private readonly roomCreateService: RoomCreateService,
    private readonly roomInfoService: RoomInfoService,
    private readonly roomModifyService: RoomModifyService,
    private readonly roomEndService: RoomEndService,
  ) {}

  @MessagePattern({ cmd: 'room.create' })
  async create(@Payload() data: CreateRoomReq) {
    // Use RoomCreateService for production-ready room creation
    // with lock, defaults, NATS, and DB operations
    return this.roomCreateService.createRoom(data);
  }

  @MessagePattern({ cmd: 'room.isActive' })
  async isRoomActive(@Payload() data: IsRoomActiveReq) {
    // Return the full result object containing { res, rInfo, meta }
    // so the gateway can access room info and metadata.
    return this.roomInfoService.isRoomActive(data);
  }

  @MessagePattern({ cmd: 'room.getActiveInfo' }) // Changed from room.getActiveRoomInfo to match gateway
  async getActiveRoomInfo(@Payload() data: GetActiveRoomInfoReq) {
    // Use RoomInfoService
    return this.roomInfoService.getActiveRoomInfo(data);
  }

  @MessagePattern({ cmd: 'room.getActiveRoomsInfo' })
  async getActiveRoomsInfo() {
    // Use RoomInfoService
    return this.roomInfoService.getActiveRoomsInfo();
  }

  @MessagePattern({ cmd: 'room.fetchPast' }) // Changed from room.fetchPastRooms to match gateway
  async fetchPastRooms(@Payload() data: FetchPastRoomsReq) {
    // Use RoomInfoService
    return this.roomInfoService.fetchPastRooms(data);
  }

  @MessagePattern({ cmd: 'room.end' })
  async endRoom(@Payload() data: any) {
    return this.roomEndService.endRoom(data);
  }

  @MessagePattern({ cmd: 'room.changeVisibility' })
  async changeVisibility(@Payload() data: any) {
    return this.roomModifyService.changeVisibility(data);
  }

  @MessagePattern({ cmd: 'room.getRoomInfoByRoomId' })
  async getRoomInfoByRoomId(
    @Payload() data: { roomId: string; isRunning: boolean },
  ) {
    // Called from Gateway: auth-room.controller.ts line 107
    // Get room info from database
    return this.roomInfoService.getRoomInfoByRoomId(
      data.roomId,
      data.isRunning,
    );
  }

  @MessagePattern({ cmd: 'room.getRoomInfoBySid' })
  async getRoomInfoBySid(@Payload() data: { sid: string; isRunning: number }) {
    // Called from Gateway: auth-room.controller.ts lines 188, 258, 334
    // Get room info by SID (LiveKit session ID)
    return this.roomInfoService.getRoomInfoBySid(data.sid, data.isRunning);
  }

  @MessagePattern({ cmd: 'room.updateRTMP' })
  async updateRTMP(
    @Payload() data: { roomId: string; isActive: boolean; nodeId?: string },
  ) {
    // Get room info first to get the table ID
    const room = await this.roomInfoService.getRoomInfoByRoomId(
      data.roomId,
      true,
    );
    if (!room) {
      return { success: false, message: 'Không tìm thấy phòng' };
    }

    const count = await this.roomInfoService.updateRoomRTMPStatus(
      BigInt(room.id),
      data.isActive ? 1 : 0,
      data.nodeId,
    );

    return { success: count > 0 };
  }
}

