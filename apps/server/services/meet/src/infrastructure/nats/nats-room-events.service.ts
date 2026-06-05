/**
 * NATS Room Events Service
 *
 * Handles broadcasting room-related events to clients via NATS
 */

import { Injectable, Logger } from '@nestjs/common';
import { NatsRoomService } from '@server/meet/infrastructure/nats/nats-room.service';
import { NatsSystemEventsService } from '@server/meet/infrastructure/nats/nats-system-events.service';
import { NatsMsgServerToClientEvents } from '@workspace/protocol';

/**
 * NatsRoomEventsService broadcasts room-specific events to connected clients
 */
@Injectable()
export class NatsRoomEventsService {
  private readonly logger = new Logger(NatsRoomEventsService.name);

  constructor(
    private readonly natsRoomService: NatsRoomService,
    private readonly natsSystemEvents: NatsSystemEventsService,
  ) {}

  /**
   * BroadcastRoomMetadata broadcasts room metadata update to clients
   *
   * @param roomId - Room ID
   * @param metadata - Optional metadata string (if null, fetches from NATS)
   * @param userId - Optional user ID to send to specific user only
   */
  async broadcastRoomMetadata(
    roomId: string,
    metadata?: string,
    userId?: string,
  ): Promise<void> {
    let metadataStr = metadata;

    // If metadata not provided, fetch from NATS
    if (!metadataStr) {
      const roomInfo = await this.natsRoomService.getRoomInfo(roomId);

      if (!roomInfo) {
        throw new Error('Could not find the room');
      }

      metadataStr = roomInfo.metadata;
    }

    // Broadcast to clients
    await this.natsSystemEvents.broadcastSystemEventToRoom(
      NatsMsgServerToClientEvents.ROOM_METADATA_UPDATE,
      roomId,
      metadataStr,
      userId,
    );
  }

  /**
   * UpdateAndBroadcastRoomMetadata updates metadata in NATS and broadcasts to clients
   *
   * @param roomId - Room ID
   * @param meta - Metadata object or string to update
   * @returns Updated metadata string
   */
  async updateAndBroadcastRoomMetadata(
    roomId: string,
    meta: any,
  ): Promise<string> {
    if (!meta) {
      throw new Error('Metadata cannot be null or empty');
    }

    // Update metadata in NATS KV
    const updatedMetadata = await this.natsRoomService.updateRoomMetadata(
      roomId,
      meta,
    );

    // Broadcast to all clients in the room
    await this.broadcastRoomMetadata(roomId, updatedMetadata);

    return updatedMetadata;
  }
}
