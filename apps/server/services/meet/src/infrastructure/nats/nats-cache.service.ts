/**
 * NATS Cache Service
 *
 * In-memory cache for NATS KV data with real-time watchers.
 * (wajlc-room-{roomId}).
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type {
  NatsKvRoomInfo,
  RoomUploadedFileMetadata,
} from '@workspace/protocol';
import {
  NatsKvRoomInfoSchema,
  RoomUploadedFileMetadataSchema,
} from '@workspace/protocol';
import { create } from '@bufbuild/protobuf';
import { NatsService } from '@server/meet/infrastructure/nats/nats.service';

/**
 * Recorder Info (Standalone structure, not a proto message)
 */
export interface RecorderInfo {
  recorderId: string;
  maxLimit: bigint;
  currentProgress: bigint;
  lastPing: bigint;
}

/**
 * Cached room entry with watcher control
 */
interface CachedRoomEntry {
  roomInfo: NatsKvRoomInfo;
  stopSignal: AbortController; // For stopping watcher
}

/**
 * Cached room user status
 */
interface CachedRoomUserStatusEntry {
  status: string;
  revision: number;
}

/**
 * Cached user info
 */
interface CachedUserInfoEntry {
  userInfo: any; // NatsKvUserInfo
  status: string;
  lastPingAt: number;
  isBlacklisted: boolean;
}

/**
 * NatsCacheService - Singleton in-memory cache for NATS data
 */
@Injectable()
export class NatsCacheService implements OnModuleDestroy {
  private readonly logger = new Logger('NatsCacheService');

  // Global abort controller for all watchers
  private readonly globalAbortController = new AbortController();

  // Room info cache
  private readonly roomsInfoStore = new Map<string, CachedRoomEntry>();

  // User status cache
  private readonly roomUsersStatusStore = new Map<
    string,
    Map<string, CachedRoomUserStatusEntry>
  >();

  // User info cache
  private readonly roomUsersInfoStore = new Map<
    string,
    Map<string, CachedUserInfoEntry>
  >();

  // Room files cache
  private readonly roomFilesStore = new Map<
    string,
    Map<string, RoomUploadedFileMetadata>
  >();

  // Recorder cache
  private readonly recordersStore = new Map<string, RecorderInfo>();

  constructor() {
    this.logger.log('NATS Cache Service initialized');
  }

  onModuleDestroy() {
    this.shutdown();
  }

  /**
   * Shutdown gracefully stops all watchers
   */
  shutdown(): void {
    this.logger.log('Shutting down NATS Cache Service...');
    this.globalAbortController.abort();
    this.roomsInfoStore.clear();
    this.roomUsersStatusStore.clear();
    this.roomUsersInfoStore.clear();
    this.roomFilesStore.clear();
    this.recordersStore.clear();
    this.logger.log('NATS Cache Service shutdown complete.');
  }

  // ============================================================================
  // Room Cache Methods
  // ============================================================================

  /**
   * AddRoomWatcher starts a unified watcher for the consolidated room bucket.
   */
  addRoomWatcher(kv: any, bucket: string, roomId: string): void {
    // Check if already watching
    if (this.roomsInfoStore.has(roomId)) {
      this.logger.debug(`Already watching room: ${roomId}`);
      return;
    }

    // Create stop signal for this watcher
    const stopSignal = new AbortController();

    // Initialize cache entries
    this.roomsInfoStore.set(roomId, {
      roomInfo: create(NatsKvRoomInfoSchema, {}),
      stopSignal,
    });

    if (!this.roomUsersStatusStore.has(roomId)) {
      this.roomUsersStatusStore.set(
        roomId,
        new Map<string, CachedRoomUserStatusEntry>(),
      );
    }

    if (!this.roomUsersInfoStore.has(roomId)) {
      this.roomUsersInfoStore.set(
        roomId,
        new Map<string, CachedUserInfoEntry>(),
      );
    }

    this.logger.log(
      `NATS unified KV watcher for room started: ${roomId}, bucket: ${bucket}`,
    );

    // Start NATS KV watcher
    kv.watch({
      includeHistory: true,
    })
      .then((watcher) => {
        this.startWatcherLoop(watcher, roomId, stopSignal);
      })
      .catch((err) => {
        this.logger.error(
          `Failed to start watcher for room ${roomId}: ${err.message}`,
        );
        this.cleanRoomCache(roomId);
      });
  }

  /**
   * Start watcher loop
   */
  private async startWatcherLoop(
    watcher: any,
    roomId: string,
    stopSignal: AbortController,
  ): Promise<void> {
    try {
      for await (const entry of watcher) {
        if (
          stopSignal.signal.aborted ||
          this.globalAbortController.signal.aborted
        ) {
          break;
        }
        if (entry) {
          this.dispatchCacheUpdate(entry, roomId);
        }
      }
    } catch (error) {
      // Ignore error if it's due to abort
      if (
        !stopSignal.signal.aborted &&
        !this.globalAbortController.signal.aborted
      ) {
        this.logger.error(`Watcher error for room ${roomId}: ${error}`);
      }
    } finally {
      this.logger.log(`NATS unified KV watcher for room stopped: ${roomId}`);
      try {
        watcher.stop();
      } catch (e) {}
      this.cleanRoomCache(roomId);
    }
  }

  /**
   * Dispatch cache update based on key prefix
   */
  private dispatchCacheUpdate(entry: any, roomId: string): void {
    const key = entry.key;
    const val = entry.value ? new TextDecoder().decode(entry.value) : '';

    // Handle Delete/Purge
    if (entry.operation === 'DEL' || entry.operation === 'PURGE') {
      this.handleDelete(key, roomId);
      return;
    }

    // Route based on prefix
    if (key.startsWith('info_')) {
      this.updateRoomInfoCache(key.substring(5), val, roomId);
    } else if (key.startsWith('user_')) {
      this.updateUserInfoAndStatusCache(key, val, entry.revision, roomId);
    } else if (key.startsWith('file_')) {
      const fileId = key.substring(5);
      this.updateRoomFilesCache(entry, roomId, fileId);
    }
  }

  /**
   * Update room files cache
   */
  private updateRoomFilesCache(
    entry: any,
    roomId: string,
    fileId: string,
  ): void {
    const val = entry.value ? new TextDecoder().decode(entry.value) : '';
    if (!this.roomFilesStore.has(roomId)) {
      this.roomFilesStore.set(
        roomId,
        new Map<string, RoomUploadedFileMetadata>(),
      );
    }

    try {
      const metadata = JSON.parse(val); // Files are usually JSON-encoded RoomUploadedFileMetadata
      const store = this.roomFilesStore.get(roomId);
      if (store) {
        store.set(fileId, create(RoomUploadedFileMetadataSchema, metadata));
      }
    } catch (error) {
      this.logger.warn(
        `Failed to parse file metadata for ${fileId} in room ${roomId}`,
      );
    }
  }

  /**
   * GetCachedRoomFile retrieves a specific file metadata from cache
   */
  getCachedRoomFile(
    roomId: string,
    fileId: string,
  ): RoomUploadedFileMetadata | null {
    const roomStore = this.roomFilesStore.get(roomId);
    if (roomStore) {
      const file = roomStore.get(fileId);
      if (file) {
        return create(RoomUploadedFileMetadataSchema, file); // Deep copy
      }
    }
    return null;
  }

  /**
   * GetAllCachedRoomFiles retrieves all file metadata for a room from cache
   */
  getAllCachedRoomFiles(
    roomId: string,
  ): Record<string, RoomUploadedFileMetadata> | null {
    const roomStore = this.roomFilesStore.get(roomId);
    if (roomStore && roomStore.size > 0) {
      const result: Record<string, RoomUploadedFileMetadata> = {};
      for (const [fileId, meta] of roomStore) {
        result[fileId] = create(RoomUploadedFileMetadataSchema, meta); // Deep copy
      }
      return result;
    }
    return null;
  }

  /**
   * WatchRecorderKV starts a watcher for the global recorder info bucket.
   */
  watchRecorderKV(kv: any): void {
    kv.watch({
      includeHistory: true,
    })
      .then((watcher) => {
        this.startRecorderWatcherLoop(watcher);
      })
      .catch((err) => {
        this.logger.error(`Failed to start recorder watcher: ${err.message}`);
      });
  }

  private async startRecorderWatcherLoop(watcher: any): Promise<void> {
    try {
      for await (const entry of watcher) {
        if (this.globalAbortController.signal.aborted) break;
        if (entry) {
          this.updateRecorderCache(entry);
        }
      }
    } catch (error) {
      this.logger.error(`Recorder watcher error: ${error}`);
    }
  }

  /**
   * Update recorder cache
   */
  private updateRecorderCache(entry: any): void {
    const key = entry.key;
    const parts = key.split('-');
    if (parts.length < 2) return;

    // Key expected format: recorder_{recorderId}-{field}
    // Example: recorder_uuid-1
    const prefixAndId = parts[0];
    if (!prefixAndId.startsWith('recorder_')) {
      return;
    }

    const recorderId = prefixAndId.substring(9); // remove 'recorder_'
    const field = parts[1];

    if (entry.operation === 'DEL' || entry.operation === 'PURGE') {
      this.recordersStore.delete(recorderId);
      return;
    }

    let recorder = this.recordersStore.get(recorderId);
    if (!recorder) {
      recorder = {
        recorderId,
        maxLimit: 0n,
        currentProgress: 0n,
        lastPing: 0n,
      };
      this.recordersStore.set(recorderId, recorder);
    }

    const val = entry.value ? new TextDecoder().decode(entry.value) : '';

    // RECORDER_INFO_MAX_LIMIT = 1
    // RECORDER_INFO_CURRENT_PROGRESS = 2
    // RECORDER_INFO_LAST_PING = 3
    switch (field) {
      case '1': // RECORDER_INFO_MAX_LIMIT
        recorder.maxLimit = BigInt(val);
        break;
      case '2': // RECORDER_INFO_CURRENT_PROGRESS
        recorder.currentProgress = BigInt(val);
        break;
      case '3': // RECORDER_INFO_LAST_PING
        recorder.lastPing = BigInt(val);
        break;
    }
  }

  /**
   * GetAllCachedActiveRecorders retrieves all active recorders from the cache.
   */
  getAllCachedActiveRecorders(pingTimeoutMs: number): RecorderInfo[] {
    const recorders: RecorderInfo[] = [];
    const now = Date.now();
    const cutoff = BigInt(now - pingTimeoutMs);

    // Filter active recorders
    for (const r of this.recordersStore.values()) {
      if (r.lastPing > cutoff) {
        // Return copy
        recorders.push({ ...r });
      }
    }
    return recorders;
  }

  /**
   * GetCachedRecorderInfo retrieves a specific recorder's info from the cache.
   */
  getCachedRecorderInfo(recorderId: string): RecorderInfo | null {
    const recorder = this.recordersStore.get(recorderId);
    if (recorder) {
      return { ...recorder };
    }
    return null;
  }

  /**
   * Handle key deletion
   */
  private handleDelete(key: string, roomId: string): void {
    if (key.startsWith(NatsService.USER_KEY_PREFIX)) {
      const parts = NatsService.parseUserKey(key);
      if (parts) {
        const { userId } = parts;
        const statusStore = this.roomUsersStatusStore.get(roomId);
        if (statusStore) statusStore.delete(userId);

        const infoStore = this.roomUsersInfoStore.get(roomId);
        if (infoStore) infoStore.delete(userId);
      }
    }
  }

  /**
   * Update room info part of the cache
   */
  private updateRoomInfoCache(
    field: string,
    val: string,
    roomId: string,
  ): void {
    const cachedEntry = this.roomsInfoStore.get(roomId);
    if (!cachedEntry || !cachedEntry.roomInfo) return;

    const roomInfo = cachedEntry.roomInfo;

    switch (field) {
      case 'id':
        roomInfo.dbTableId = this.convertTextToUint64(val);
        break;
      case 'room_id':
        roomInfo.roomId = val;
        break;
      case 'room_sid':
        roomInfo.roomSid = val;
        break;
      case 'status':
        roomInfo.status = val;
        if (val === 'ended') {
          this.cleanRoomCache(roomId);
          return;
        }
        break;
      case 'empty_timeout':
        roomInfo.emptyTimeout = this.convertTextToUint64(val);
        break;
      case 'max_participants':
        roomInfo.maxParticipants = this.convertTextToUint64(val);
        break;
      case 'created_at':
        roomInfo.createdAt = this.convertTextToUint64(val);
        break;
      case 'metadata':
        roomInfo.metadata = val;
        break;
    }
  }

  /**
   * Update user info and status part of the cache
   */
  private updateUserInfoAndStatusCache(
    key: string,
    val: string,
    revision: number,
    roomId: string,
  ): void {
    const parts = NatsService.parseUserKey(key);
    if (!parts) return;

    const { userId, field } = parts;

    // 1. Update Status Cache if it's the status field
    if (field === 'status') {
      let statusStore = this.roomUsersStatusStore.get(roomId);
      if (!statusStore) {
        statusStore = new Map();
        this.roomUsersStatusStore.set(roomId, statusStore);
      }
      statusStore.set(userId, { status: val, revision });
    }

    // 2. Update Info Cache
    let infoStore = this.roomUsersInfoStore.get(roomId);
    if (!infoStore) {
      infoStore = new Map();
      this.roomUsersInfoStore.set(roomId, infoStore);
    }

    let userEntry = infoStore.get(userId);
    if (!userEntry) {
      userEntry = {
        userInfo: {},
        status: '',
        lastPingAt: 0,
        isBlacklisted: false,
      };
      infoStore.set(userId, userEntry);
    }

    const userInfo = userEntry.userInfo;

    switch (field) {
      case 'id':
        userInfo.userId = val;
        break;
      case 'sid':
        userInfo.userSid = val;
        break;
      case 'name':
        userInfo.name = val;
        break;
      case 'room_id':
        userInfo.roomId = val;
        break;
      case 'status':
        if (userEntry) userEntry.status = val;
        break;
      case 'metadata':
        userInfo.metadata = val;
        break;
      case 'is_admin':
        userInfo.isAdmin = val === 'true';
        break;
      case 'is_presenter':
        userInfo.isPresenter = val === 'true';
        break;
      case 'joined_at':
        userInfo.joinedAt = this.convertTextToUint64(val);
        break;
      case 'reconnected_at':
        userInfo.reconnectedAt = this.convertTextToUint64(val);
        break;
      case 'disconnected_at':
        userInfo.disconnectedAt = this.convertTextToUint64(val);
        break;
      case 'last_ping_at':
        if (userEntry)
          userEntry.lastPingAt = parseInt(this.convertTextToUint64(val), 10);
        break;
      case 'is_blacklisted':
        if (userEntry) userEntry.isBlacklisted = val === 'true';
        break;
    }
  }

  /**
   * GetCachedRoomInfo retrieves cached room info
   */
  /**
   * GetCachedRoomInfo retrieves cached room info
   */
  getCachedRoomInfo(roomId: string): NatsKvRoomInfo | null {
    const cachedEntry = this.roomsInfoStore.get(roomId);
    if (!cachedEntry || !cachedEntry.roomInfo) {
      return null;
    }

    // Don't deliver cache if room ended or invalid dbTableId (0)
    if (
      cachedEntry.roomInfo.status === 'ended' ||
      cachedEntry.roomInfo.dbTableId === '0'
    ) {
      return null;
    }

    // Return deep copy
    return create(NatsKvRoomInfoSchema, {
      ...cachedEntry.roomInfo,
    });
  }

  /**
   * GetCachedRoomMetadata retrieves cached room metadata string
   */
  getCachedRoomMetadata(roomId: string): { metadata: string; found: boolean } {
    const cachedEntry = this.roomsInfoStore.get(roomId);
    if (!cachedEntry || !cachedEntry.roomInfo) {
      return { metadata: '', found: false };
    }

    if (
      cachedEntry.roomInfo.status === 'ended' ||
      cachedEntry.roomInfo.dbTableId === '0'
    ) {
      return { metadata: '', found: false };
    }

    return { metadata: cachedEntry.roomInfo.metadata, found: true };
  }

  /**
   * deleteRoomInfo manually removes room from cache and stops watcher
   */
  async deleteRoomInfo(roomId: string): Promise<void> {
    this.cleanRoomCache(roomId);
  }

  /**
   * GetCachedRoomUserStatus retrieves a single user's cached status
   */
  getCachedRoomUserStatus(
    roomId: string,
    userId: string,
  ): CachedRoomUserStatusEntry | null {
    const roomStore = this.roomUsersStatusStore.get(roomId);
    if (roomStore) {
      const entry = roomStore.get(userId);
      if (entry) {
        return { ...entry };
      }
    }
    return null;
  }

  /**
   * GetUsersIdFromRoomStatusBucket retrieves all userIds from room status bucket
   */
  getUsersIdFromRoomStatusBucket(
    roomId: string,
    filterStatus: string = '',
  ): string[] {
    const usersIds: string[] = [];
    const roomStore = this.roomUsersStatusStore.get(roomId);

    if (roomStore) {
      for (const [userId, entry] of roomStore) {
        if (filterStatus && entry.status === filterStatus) {
          usersIds.push(userId);
        } else if (!filterStatus) {
          usersIds.push(userId);
        }
      }
    }
    return usersIds;
  }

  /**
   * GetUserInfo retrieves cached user info
   */
  getUserInfo(roomId: string, userId: string): any | null {
    const roomStore = this.roomUsersInfoStore.get(roomId);
    if (roomStore) {
      const entry = roomStore.get(userId);
      if (entry && entry.userInfo) {
        return { ...entry.userInfo };
      }
    }
    return null;
  }

  /**
   * GetUserLastPingAt retrieves user's last ping timestamp
   */
  getUserLastPingAt(roomId: string, userId: string): number {
    const roomStore = this.roomUsersInfoStore.get(roomId);
    if (roomStore) {
      const entry = roomStore.get(userId);
      if (entry) {
        return entry.lastPingAt;
      }
    }
    return 0;
  }

  /**
   * IsUserBlacklistedFromCache checks if user is blacklisted in cache
   * Returns [isBlacklisted, found]
   */
  isUserBlacklistedFromCache(
    roomId: string,
    userId: string,
  ): { isBlacklisted: boolean; found: boolean } {
    const roomStore = this.roomUsersInfoStore.get(roomId);
    if (roomStore) {
      const entry = roomStore.get(userId);
      // We consider it "found" if the entry exists, even if isBlacklisted defaults to false
      if (entry) {
        return { isBlacklisted: entry.isBlacklisted, found: true };
      }
    }
    return { isBlacklisted: false, found: false };
  }

  /**
   * GetCachedUserMetadata retrieves only the user's metadata string from the cache.
   */
  getCachedUserMetadata(
    roomId: string,
    userId: string,
  ): { metadata: string; found: boolean } {
    const roomStore = this.roomUsersInfoStore.get(roomId);
    if (roomStore) {
      const entry = roomStore.get(userId);
      if (entry && entry.userInfo && entry.userInfo.metadata) {
        return { metadata: entry.userInfo.metadata, found: true };
      }
    }
    return { metadata: '', found: false };
  }

  /**
   * Clean room cache
   */
  private cleanRoomCache(roomId: string): void {
    const entry = this.roomsInfoStore.get(roomId);
    if (entry) {
      entry.stopSignal.abort();
    }
    this.roomsInfoStore.delete(roomId);
    this.roomUsersStatusStore.delete(roomId);
    this.roomUsersInfoStore.delete(roomId);
    this.roomFilesStore.delete(roomId);
    this.logger.debug(`Room cache cleaned: ${roomId}`);
  }

  /**
   * Convert text to uint64 (as string in protobuf)
   */
  private convertTextToUint64(text: string): string {
    try {
      BigInt(text);
      return text;
    } catch {
      return '0';
    }
  }

  /**
   * @deprecated Use addRoomWatcher for consolidated bucket
   */
  addRoomUserStatusWatcher(kv: any, bucket: string, roomId: string): void {
    this.addRoomWatcher(kv, bucket, roomId);
  }

  /**
   * @deprecated Use addRoomWatcher for consolidated bucket
   */
  addUserInfoWatcher(
    kv: any,
    bucket: string,
    roomId: string,
    userId: string,
  ): void {
    this.addRoomWatcher(kv, bucket, roomId);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      roomsCount: this.roomsInfoStore.size,
      usersStatusCount: this.roomUsersStatusStore.size,
      usersInfoCount: this.roomUsersInfoStore.size,
    };
  }

  /**
   * IsRoomWatched checks if the room is currently being watched by this service.
   */
  isRoomWatched(roomId: string): boolean {
    return this.roomsInfoStore.has(roomId);
  }
}
