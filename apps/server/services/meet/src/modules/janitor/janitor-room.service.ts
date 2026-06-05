import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@server/shared';
import { NatsRoomService } from '@server/meet/infrastructure/nats/nats-room.service';
import { NatsUserService } from '@server/meet/infrastructure/nats/nats-user.service';
import { RoomEndService } from '@server/meet/modules/room/room-end.service';
import { RoomInfoService } from '@server/meet/modules/room/room-info.service';
import { RoomDurationService } from '@server/meet/modules/room/room-duration.service';
import { create } from '@bufbuild/protobuf';
import { RoomEndReqSchema } from '@workspace/protocol';

@Injectable()
export class JanitorRoomService {
  private readonly logger = new Logger(JanitorRoomService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly natsRoomService: NatsRoomService,
    private readonly natsUserService: NatsUserService,
    private readonly roomEndService: RoomEndService,
    private readonly roomInfoService: RoomInfoService,
    private readonly roomDurationService: RoomDurationService,
  ) {}

  /**
   * activeRoomChecker will check & do reconciliation between DB & livekit
   */
  async activeRoomChecker(): Promise<void> {
    // Get active rooms lightweight
    const activeRooms = await this.prisma.roomInfo.findMany({
      where: { isRunning: 1 },
      select: {
        id: true,
        roomId: true,
        sid: true,
        joinedParticipants: true,
      },
    });

    if (activeRooms.length === 0) {
      return;
    }

    for (const room of activeRooms) {
      if (!room.sid) {
        // if room RoomSid is empty then we won't do anything
        // because may be the session is creating
        continue;
      }

      const rInfo = await this.natsRoomService.getRoomInfo(room.roomId);

      // we did not find the room
      if (!rInfo) {
        // so, we're closing it
        await this.roomInfoService.updateRoomStatus(room.roomId, false);
        continue;
      }

      const userIds = await this.natsUserService.getOnlineUsersId(room.roomId);

      if (userIds.length === 0) {
        // no user online
        const emptyTimeout = Number(rInfo.emptyTimeout);
        const createdAt = Number(rInfo.createdAt);

        // valid = rInfo.CreatedAt + rInfo.EmptyTimeout
        const valid = createdAt + emptyTimeout;
        const now = Math.floor(Date.now() / 1000);

        if (now > valid) {
          this.logger.log(
            `Closing empty room as it reached empty timeout: ${room.roomId}, created: ${createdAt}, timeout: ${emptyTimeout}, now: ${now}`,
          );

          // end room by proper channel
          await this.roomEndService.endRoom(
            create(RoomEndReqSchema, {
              roomId: room.roomId,
            }),
          );
          continue;
        }
      }

      const count = userIds.length;
      if (room.joinedParticipants !== count) {
        await this.roomInfoService.updateNumParticipants(room.sid, count);
      }
    }
  }

  /**
   * checkRoomWithDuration checks if any room exceeded its duration limit
   */
  async checkRoomWithDuration(): Promise<void> {
    try {
      const rooms = await this.roomDurationService.getRoomsWithDurationMap();

      for (const [roomId, r] of Object.entries(rooms)) {
        const now = Math.floor(Date.now() / 1000);
        // valid = r.StartedAt + (r.Duration * 60)
        const valid = r.startedAt + r.duration * 60;

        if (now > valid) {
          this.logger.log(
            `Room exceeded duration limit. Ending room: ${roomId}, duration: ${r.duration}, started: ${r.startedAt}`,
          );
          await this.roomEndService.endRoom(
            create(RoomEndReqSchema, {
              roomId: roomId,
            }),
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error checking room duration: ${error.message}`);
    }
  }
}
