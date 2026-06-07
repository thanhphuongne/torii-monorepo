/**
 * Room Admin Controller (Gateway)
 *
 * Handles room management API endpoints for web-admin
 * Uses GatewayAuthGuard + PermissionsGuard for JWT-based authentication
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Inject,
  ParseIntPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  GatewayAuthGuard,
  PermissionsGuard,
  Permissions,
  successResponse,
} from '@server/shared';

@Controller('api/rooms')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class RoomAdminController {
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  /**
   * Get all active rooms
   * @route GET /api/rooms/active
   */
  @Get('active')
  @Permissions('lms.delivery.read')
  async getActiveRooms() {
    const result = await firstValueFrom(
      this.natsClient.send({ cmd: 'room.getActiveRoomsInfo' }, {}),
    );

    return successResponse(result.rooms || [], 'Success');
  }

  /**
   * Get single active room info
   * @route GET /api/rooms/active/:roomId
   */
  @Get('active/:roomId')
  @Permissions('lms.delivery.read')
  async getActiveRoomInfo(@Param('roomId') roomId: string) {
    const result = await firstValueFrom(
      this.natsClient.send({ cmd: 'room.getActiveInfo' }, { roomId }),
    );

    return successResponse(result.room, result.msg);
  }

  /**
   * Check if room is active
   * @route GET /api/rooms/:roomId/is-active
   */
  @Get(':roomId/is-active')
  @Permissions('lms.delivery.read')
  async isRoomActive(@Param('roomId') roomId: string) {
    const result = await firstValueFrom(
      this.natsClient.send({ cmd: 'room.isActive' }, { roomId }),
    );

    return successResponse({ isActive: result.isActive }, result.msg);
  }

  /**
   * Fetch past rooms with pagination
   * @route GET /api/rooms/past
   */
  @Get('past')
  @Permissions('lms.delivery.read')
  async fetchPastRooms(
    @Query('from', new ParseIntPipe({ optional: true })) from: number = 0,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Query('orderBy') orderBy: 'ASC' | 'DESC' = 'DESC',
  ) {
    const result = await firstValueFrom(
      this.natsClient.send(
        { cmd: 'room.fetchPast' },
        {
          from,
          limit,
          orderBy,
        },
      ),
    );

    if (Number(result.totalRooms) === 0) {
      return successResponse(
        {
          totalRooms: '0',
          from: String(from),
          limit: String(limit),
          orderBy,
          roomsList: [],
        },
        'No rooms found',
      );
    }

    return successResponse(result, 'Success');
  }

  /**
   * End a room (admin only)
   * @route POST /api/rooms/:roomId/end
   */
  @Post(':roomId/end')
  @Permissions('lms.delivery.manage')
  async endRoom(@Param('roomId') roomId: string) {
    const result = await firstValueFrom(
      this.natsClient.send({ cmd: 'room.end' }, { roomId }),
    );

    return successResponse(result.status, result.msg);
  }
}
