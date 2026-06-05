/**
 * NATS Room Service
 *
 * Handles NATS KV operations for room information and modification
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import type { RoomMetadata, NatsKvRoomInfo } from '@workspace/protocol';
import {
  NatsKvRoomInfoSchema,
  RoomMetadataSchema,
  NatsMsgServerToClientEvents,
  RoomUploadedFileMetadataSchema,
} from '@workspace/protocol';
import { create } from '@bufbuild/protobuf';
import { NatsService } from '@server/meet/infrastructure/nats/nats.service';
import { NatsStreamService } from '@server/meet/infrastructure/nats/nats-stream.service';
import { NatsUserService } from '@server/meet/infrastructure/nats/nats-user.service';
import { NatsSystemEventsService } from '@server/meet/infrastructure/nats/nats-system-events.service';

// Room status constants
export const ROOM_STATUS_CREATED = 'created';
export const ROOM_STATUS_ACTIVE = 'active';
export const ROOM_STATUS_TRIGGERED_END = 'triggered_end';
export const ROOM_STATUS_ENDED = 'ended';

const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

import { AppConfigService } from '@server/shared';

/**
 * NatsRoomService handles NATS KV operations for rooms
 */
@Injectable()
export class NatsRoomService {
  private readonly logger = new Logger(NatsRoomService.name);

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly natsService: NatsService, // Inject base NATS service
    private readonly natsStreamService: NatsStreamService, // Inject stream service
    @Inject(forwardRef(() => NatsUserService))
    private readonly natsUserService: NatsUserService, // Inject user service
    @Inject(forwardRef(() => NatsSystemEventsService))
    private readonly natsSystemEventsService: NatsSystemEventsService,
  ) {}

  getNatsConnection() {
    return this.natsService.getNatsConnection();
  }

  /**
   * GetRoomInfo retrieves room information from NATS KV (Consolidated Bucket)
   */
  async getRoomInfo(roomId: string): Promise<NatsKvRoomInfo | null> {
    if (!roomId || roomId.trim() === '') {
      this.logger.warn('GetRoomInfo called with empty roomId');
      return null;
    }

    this.logger.log(`Getting room info for: ${roomId}`);

    // Step 1: Try to get cached room info first
    const cached = this.natsService.getCacheService().getCachedRoomInfo(roomId);
    if (cached) {
      this.logger.debug(`Room info retrieved from cache: ${roomId}`);
      return cached;
    }

    // Step 2: Cache miss - read from NATS KV (Consolidated Room Bucket)
    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);

    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);

      // Create room info object (using info_ prefix)
      const info = create(NatsKvRoomInfoSchema, {
        dbTableId: await this.getUint64Value(
          kv,
          this.natsService.formatRoomKey('id'),
        ),
        roomId: await this.getStringValue(
          kv,
          this.natsService.formatRoomKey('room_id'),
        ),
        roomSid: await this.getStringValue(
          kv,
          this.natsService.formatRoomKey('room_sid'),
        ),
        status: await this.getStringValue(
          kv,
          this.natsService.formatRoomKey('status'),
        ),
        emptyTimeout: await this.getUint64Value(
          kv,
          this.natsService.formatRoomKey('empty_timeout'),
        ),
        maxParticipants: await this.getUint64Value(
          kv,
          this.natsService.formatRoomKey('max_participants'),
        ),
        createdAt: await this.getUint64Value(
          kv,
          this.natsService.formatRoomKey('created_at'),
        ),
        metadata: await this.getStringValue(
          kv,
          this.natsService.formatRoomKey('metadata'),
        ),
      });

      // Guard against partially deleted/corrupted KV buckets. Returning a blank
      // object here can trigger destructive cleanup flows with empty room/sid.
      if (!info.roomId || !info.roomSid || !info.dbTableId || info.dbTableId === '0') {
        this.logger.warn(
          `Invalid room info in NATS bucket for ${roomId} (roomId="${info.roomId}", roomSid="${info.roomSid}", dbTableId="${info.dbTableId}")`,
        );
        return null;
      }

      // Step 3: Add watcher if room not ended
      if (info.status !== ROOM_STATUS_ENDED) {
        this.natsService.getCacheService().addRoomWatcher(kv, bucket, roomId);
      }

      this.logger.log(`Room info retrieved from NATS: ${roomId}`);
      return info;
    } catch (error) {
      this.logger.error(
        `Error getting room info for ${roomId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * GetActiveRooms retrieves all currently active rooms by scanning KV buckets
   */
  async getActiveRooms(): Promise<{ roomId: string }[]> {
    const jsm = this.natsService.getJetStreamManager();
    const activeRooms: { roomId: string }[] = [];

    if (!jsm || !jsm.streams) {
      this.logger.warn('JetStream Manager or streams not ready yet');
      return activeRooms;
    }

    try {
      // Consolidated bucket prefix for rooms: KV_wajlc-room-
      const streamPrefix = `KV_${NatsService.CONSOLIDATED_ROOM_BUCKET_PREFIX}`;

      const streams = await jsm.streams.list();

      for await (const stream of streams) {
        if (stream.config.name.startsWith(streamPrefix)) {
          // Extract Room ID: KV_wajlc-room-<roomId>
          const roomId = stream.config.name.substring(streamPrefix.length);
          activeRooms.push({ roomId });
        }
      }
    } catch (error) {
      this.logger.error(`Error getting active rooms: ${error.message}`);
    }

    return activeRooms;
  }

  /**
   * GetRoomInfoWithMetadata retrieves room info along with parsed metadata
   */
  async getRoomInfoWithMetadata(
    roomId: string,
  ): Promise<{ info: NatsKvRoomInfo | null; metadata: RoomMetadata | null }> {
    const info = await this.getRoomInfo(roomId);
    if (!info) {
      return { info: null, metadata: null };
    }

    const metadata = this.natsService.unmarshalRoomMetadata(info.metadata);
    return { info, metadata };
  }

  /**
   * GetRoomMetadataStruct retrieves only the metadata structure
   */
  /**
   * GetRoomMetadataStruct retrieves only the metadata structure
   */
  async getRoomMetadataStruct(roomId: string): Promise<RoomMetadata | null> {
    // Use the dedicated cache method to get only the metadata.
    const cached = this.natsService
      .getCacheService()
      .getCachedRoomMetadata(roomId);
    if (cached.found && cached.metadata) {
      return this.natsService.unmarshalRoomMetadata(cached.metadata);
    }

    // If not in cache, directly fetch only the metadata key from NATS KV.
    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);
    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);
      const metadataStr = await this.natsService.getStringValue(
        kv,
        this.natsService.formatRoomKey('metadata'),
      );

      if (!metadataStr) return null;
      return this.natsService.unmarshalRoomMetadata(metadataStr);
    } catch (error) {
      return null;
    }
  }

  /**
   * AddRoom creates a consolidated room entry in NATS KV
   */
  async addRoom(
    tableId: number,
    roomId: string,
    roomSid: string,
    emptyTimeout?: number,
    maxParticipants?: number,
    metadata?: RoomMetadata,
  ): Promise<string> {
    this.logger.log(
      `Adding room to consolidated NATS KV: ${roomId}, sid: ${roomSid}, tableId: ${tableId}`,
    );

    // Step 1: Create or update the consolidated room bucket
    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);
    const numReplicas = this.appConfig.nats.numReplicas;

    const js = this.natsService.getJetStream();
    const kv = await js.views.kv(bucket, {
      history: 1,
      ttl: DEFAULT_TTL,
      replicas: numReplicas,
    });

    // Step 2: Set default values if not provided
    const timeout = emptyTimeout ?? 1800; // 30 minutes
    const maxPart = maxParticipants ?? 0; // 0 = unlimited

    // Step 3: Marshal metadata to string
    const mt = this.natsService.marshalRoomMetadata(
      metadata || create(RoomMetadataSchema, {}),
    );

    // Step 4: Prepare room data (using info_ prefix)
    const data: Record<string, string> = {
      [this.natsService.formatRoomKey('id')]: tableId.toString(),
      [this.natsService.formatRoomKey('room_id')]: roomId,
      [this.natsService.formatRoomKey('room_sid')]: roomSid,
      [this.natsService.formatRoomKey('empty_timeout')]: timeout.toString(),
      [this.natsService.formatRoomKey('max_participants')]: maxPart.toString(),
      [this.natsService.formatRoomKey('status')]: ROOM_STATUS_CREATED,
      [this.natsService.formatRoomKey('created_at')]: Math.floor(
        Date.now() / 1000,
      ).toString(),
      [this.natsService.formatRoomKey('metadata')]: mt,
    };

    // Step 5: Store each key-value pair
    for (const [key, value] of Object.entries(data)) {
      await kv.put(key, new TextEncoder().encode(value));
    }

    // Step 6: Add room to watcher
    this.natsService.getCacheService().addRoomWatcher(kv, bucket, roomId);

    this.logger.log(
      `Room added to consolidated NATS KV successfully: ${roomId}`,
    );
    return mt;
  }

  /**
   * UpdateRoomStatus changes room status
   */
  async updateRoomStatus(roomId: string, status: string): Promise<void> {
    this.logger.log(`Updating room status: ${roomId} -> ${status}`);

    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);

    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);

      await kv.put(
        this.natsService.formatRoomKey('status'),
        new TextEncoder().encode(status),
      );

      this.logger.log(`Room status updated successfully: ${roomId}`);
    } catch (error) {
      throw new Error(`Failed to update room status: ${error.message}`);
    }
  }

  /**
   * UpdateRoomMetadata updates room metadata
   */
  async updateRoomMetadata(
    roomId: string,
    metadata: RoomMetadata | string,
  ): Promise<string> {
    let mt: RoomMetadata;

    if (typeof metadata === 'string') {
      mt = this.natsService.unmarshalRoomMetadata(metadata);
    } else {
      mt = metadata;
    }

    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);

    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);

      const ml = this.natsService.marshalRoomMetadata(mt);
      await kv.put(
        this.natsService.formatRoomKey('metadata'),
        new TextEncoder().encode(ml),
      );

      return ml;
    } catch (error) {
      throw new Error(`Failed to update metadata: ${error.message}`);
    }
  }

  /**
   * BroadcastRoomMetadata broadcasts the room metadata update event.
   */
  async broadcastRoomMetadata(
    roomId: string,
    metadata?: string,
    userId?: string,
  ): Promise<void> {
    if (!metadata) {
      const rInfo = await this.getRoomInfo(roomId);
      if (!rInfo) {
        throw new Error('did not found the room');
      }
      metadata = rInfo.metadata;
    }

    await this.natsSystemEventsService.broadcastSystemEventToRoom(
      NatsMsgServerToClientEvents.ROOM_METADATA_UPDATE,
      roomId,
      metadata,
      userId,
    );
  }

  /**
   * UpdateAndBroadcastRoomMetadata updates and broadcasts room metadata.
   */
  async updateAndBroadcastRoomMetadata(
    roomId: string,
    meta: RoomMetadata | string,
  ): Promise<void> {
    if (!meta) {
      throw new Error('metadata cannot be nil');
    }

    const metadataStr = await this.updateRoomMetadata(roomId, meta);
    await this.broadcastRoomMetadata(roomId, metadataStr);
  }

  /**
   * DeleteRoom removes room consolidated bucket
   */
  async deleteRoom(roomId: string): Promise<void> {
    this.logger.log(
      `Deleting room consolidated bucket from NATS KV: ${roomId}`,
    );

    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);

    try {
      const jsm = this.natsService.getJetStreamManager();
      const streamName = `KV_${bucket}`;
      await jsm.streams.delete(streamName);

      this.logger.log(`Room bucket deleted from NATS KV: ${roomId}`);
    } catch (error) {
      if (error.message && error.message.includes('stream not found')) {
        this.logger.debug(`Room KV bucket already deleted: ${roomId}`);
        return;
      }
      throw error;
    }
  }

  /**
   * OnAfterSessionEndCleanup performs cleanup after session ends (NATS parts)
   */
  async onAfterSessionEndCleanup(roomId: string): Promise<void> {
    this.logger.log(`Performing session end cleanup for room: ${roomId}`);

    try {
      // 1. Delete breakout rooms (Handled by BreakoutService via Redis)

      // 2. Delete all user consumers
      try {
        await this.natsUserService.deleteAllRoomUsersWithConsumer(roomId);
      } catch {}

      // 3. Purge global room stream subjects
      try {
        await this.natsStreamService.deleteRoomNatsStream(roomId);
      } catch {}

      // 4. Delete the consolidated room bucket
      await this.deleteRoom(roomId);

      // 5. Final cleanup in cache
      await this.natsService.getCacheService().deleteRoomInfo(roomId);
    } catch (error) {
      this.logger.error(
        `Error during session end cleanup for room ${roomId}: ${error.message}`,
      );
    }

    this.logger.log(`Session end cleanup completed for room: ${roomId}`);
  }

  /**
   * AddRoomFile adds or updates a file's metadata in the room's consolidated bucket.
   * The format will be `file_<fileId>`.
   */
  async addRoomFile(roomId: string, meta: any): Promise<void> {
    this.logger.log(
      `Adding room file metadata for: ${roomId}, fileId: ${meta.fileId}`,
    );

    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);
    const numReplicas = this.appConfig.nats.numReplicas;

    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket, {
        history: 1,
        ttl: DEFAULT_TTL,
        replicas: numReplicas,
      });

      const metaStr = this.natsService.marshalToProtoJson(
        meta,
        RoomUploadedFileMetadataSchema,
      );
      const metaBytes = new TextEncoder().encode(metaStr);
      const key = this.natsService.formatFileKey(meta.fileId);
      await kv.put(key, metaBytes);

      this.logger.log(
        `Room file metadata added successfully to consolidated bucket: ${roomId}, fileId: ${meta.fileId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error adding room file metadata for ${roomId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * DeleteRoomFile removes a file's metadata from the room's consolidated bucket.
   */
  async deleteRoomFile(roomId: string, fileId: string): Promise<void> {
    this.logger.log(
      `Deleting room file metadata for: ${roomId}, fileId: ${fileId}`,
    );

    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);

    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);
      const key = this.natsService.formatFileKey(fileId);
      await kv.purge(key);

      this.logger.log(
        `Room file metadata deleted: ${roomId}, fileId: ${fileId}`,
      );
    } catch (error) {
      if (
        error.message &&
        (error.message.includes('bucket not found') ||
          error.message.includes('stream not found'))
      ) {
        return;
      }
      this.logger.error(
        `Error deleting room file metadata for ${roomId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * GetRoomFile retrieves a specific file's metadata from consolidated bucket.
   */
  async getRoomFile(roomId: string, fileId: string): Promise<any | null> {
    // Try cache first
    const cached = this.natsService
      .getCacheService()
      .getCachedRoomFile(roomId, fileId);
    if (cached) {
      return cached;
    }

    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);

    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);
      const key = this.natsService.formatFileKey(fileId);
      const entry = await kv.get(key);

      if (!entry || !entry.value) {
        return null;
      }

      return JSON.parse(new TextDecoder().decode(entry.value));
    } catch (error) {
      return null;
    }
  }

  /**
   * GetAllRoomFiles retrieves all file metadata for a given room.
   */
  async getAllRoomFiles(roomId: string): Promise<Record<string, any>> {
    // Try cache first
    const cached = this.natsService
      .getCacheService()
      .getAllCachedRoomFiles(roomId);
    if (cached) {
      return cached;
    }

    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);
    const result: Record<string, any> = {};

    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);
      const keys = await kv.keys();
      const prefix = NatsService.FILE_KEY_PREFIX;

      for await (const k of keys) {
        if (k.startsWith(prefix)) {
          const entry = await kv.get(k);
          if (entry && entry.value) {
            try {
              const fileId = k.substring(prefix.length);
              result[fileId] = JSON.parse(
                new TextDecoder().decode(entry.value),
              );
            } catch (e) {}
          }
        }
      }

      return result;
    } catch (error) {
      return result;
    }
  }

  /**
   * DeleteAllRoomFiles purges all files from the consolidated bucket.
   */
  async deleteAllRoomFiles(roomId: string): Promise<void> {
    this.logger.log(`Deleting all room files for: ${roomId}`);
    const bucket = this.natsService.formatConsolidatedRoomBucket(roomId);

    try {
      const js = this.natsService.getJetStream();
      const kv = await js.views.kv(bucket);
      const keys = await kv.keys();
      const prefix = NatsService.FILE_KEY_PREFIX;

      for await (const k of keys) {
        if (k.startsWith(prefix)) {
          await kv.purge(k).catch(() => {});
        }
      }
    } catch (error) {}
  }

  // ============================================================================
  // Helper methods for KV access
  // ============================================================================

  // ============================================================================
  // Helper methods for KV access
  // ============================================================================

  /**
   * Get string value from KV
   */
  private async getStringValue(kv: any, key: string): Promise<string> {
    try {
      const entry = await kv.get(key);
      return entry?.value ? new TextDecoder().decode(entry.value) : '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Get uint64 value from KV (returns as string in protobuf)
   */
  private async getUint64Value(kv: any, key: string): Promise<string> {
    try {
      const entry = await kv.get(key);
      return entry?.value ? new TextDecoder().decode(entry.value) : '0';
    } catch (error) {
      return '0';
    }
  }
}

