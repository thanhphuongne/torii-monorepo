/**
 * NATS Service - Base Service
 *
 * Main NATS service with metadata marshaling utilities and connection management.
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { create, toJsonString, fromJsonString } from '@bufbuild/protobuf';
import {
  RoomMetadata,
  RoomMetadataSchema,
  UserMetadata,
  UserMetadataSchema,
} from '@workspace/protocol';
import { NatsCacheService } from '@server/meet/infrastructure/nats/nats-cache.service';
import { AppConfigService } from '@server/shared';
import {
  connect,
  NatsConnection,
  JetStreamClient,
  JetStreamManager,
  nkeyAuthenticator,
} from 'nats';

// Constants
const NATS_PREFIX = 'wajlc-';
const CONSOLIDATED_ROOM_BUCKET_PREFIX = `${NATS_PREFIX}room-`;
const ROOM_INFO_KEY_PREFIX = 'info_';
const USER_KEY_PREFIX = 'user_';
const USER_KEY_FIELD_PREFIX = '-FIELD_';
const FILE_KEY_PREFIX = 'file_';
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

@Injectable()
export class NatsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('NatsService');

  private nc: NatsConnection;
  private js: JetStreamClient;
  private jsm: JetStreamManager;

  // Export constants for other services
  static readonly NATS_PREFIX = NATS_PREFIX;
  static readonly CONSOLIDATED_ROOM_BUCKET_PREFIX =
    CONSOLIDATED_ROOM_BUCKET_PREFIX;
  static readonly USER_KEY_PREFIX = USER_KEY_PREFIX;
  static readonly USER_KEY_FIELD_PREFIX = USER_KEY_FIELD_PREFIX;
  static readonly ROOM_INFO_KEY_PREFIX = ROOM_INFO_KEY_PREFIX;
  static readonly FILE_KEY_PREFIX = FILE_KEY_PREFIX;

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly cacheService: NatsCacheService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing NATS Service...');
    await this.connectToNats();
    // Ensure global room stream exists
    await this.createRoomNatsStream();
    // Ensure recorder info bucket exists and watch it
    await this.createRecorderKVAndWatch();
  }

  async onModuleDestroy() {
    if (this.nc) {
      await this.nc.drain();
      await this.nc.close();
    }
  }

  private async connectToNats(): Promise<void> {
    try {
      const { url, nkeySeed } = this.appConfig.nats;

      const options: any = {
        servers: [url],
        name: 'nestjs-meet-service',
      };

      if (nkeySeed) {
        options.authenticator = nkeyAuthenticator(
          new TextEncoder().encode(nkeySeed),
        );
        this.logger.log('NATS NKEY authentication enabled');
      }

      this.nc = await connect(options);
      this.js = this.nc.jetstream();
      this.jsm = await this.nc.jetstreamManager();

      this.logger.log(`Connected to NATS: ${url}`);
    } catch (error) {
      this.logger.error(`Failed to connect to NATS: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create global room stream
   */
  private async createRoomNatsStream() {
    const streamName = this.getRoomStreamName();
    const { numReplicas, subjects } = this.appConfig.nats;
    const { systemPublic, systemPrivate } = subjects;

    try {
      await this.jsm.streams
        .add({
          name: streamName,
          subjects: [`${systemPublic}.>`, `${systemPrivate}.>`],
          num_replicas: numReplicas,
        })
        .catch(async (err) => {
          if (err.message?.includes('already in use')) {
            await this.jsm.streams.update(streamName, {
              subjects: [`${systemPublic}.>`, `${systemPrivate}.>`],
            });
          } else {
            throw err;
          }
        });
    } catch (error) {
      this.logger.error(
        `Error ensuring room stream ${streamName}: ${error.message}`,
      );
    }
  }

  /**
   * Create recorder KV bucket and start watching.
   */
  private async createRecorderKVAndWatch() {
    const { recorder, numReplicas } = this.appConfig.nats;
    const bucket = recorder.infoKv;

    try {
      // Using jsm.kv if available or falling back to views.kv
      const jsm = this.jsm as any;
      if (jsm.kv) {
        await jsm.kv.create(bucket, { replicas: numReplicas }).catch(() => {});
      } else if (jsm.views && jsm.views.kv) {
        await jsm.views.kv
          .create(bucket, { replicas: numReplicas })
          .catch(() => {});
      }

      const kv = await this.js.views.kv(bucket);
      this.cacheService.watchRecorderKV(kv);
      this.logger.log(`Successfully watching recorder KV bucket: ${bucket}`);
    } catch (error) {
      this.logger.error(
        `Error ensuring recorder KV bucket ${bucket}: ${error.message}`,
      );
    }
  }

  // ============================================================================
  // Formatting Helpers
  // ============================================================================

  formatConsolidatedRoomBucket(roomId: string): string {
    return CONSOLIDATED_ROOM_BUCKET_PREFIX + roomId;
  }

  formatRoomKey(field: string): string {
    return ROOM_INFO_KEY_PREFIX + field;
  }

  formatUserKey(userId: string, field: string): string {
    return USER_KEY_PREFIX + userId + USER_KEY_FIELD_PREFIX + field;
  }

  formatFileKey(fileId: string): string {
    return FILE_KEY_PREFIX + fileId;
  }

  // ============================================================================
  // KV Helpers
  // ============================================================================

  /**
   * ParseUserKey parses a user-specific NATS KV key into its userId and field components.
   */
  static parseUserKey(key: string): { userId: string; field: string } | null {
    if (!key.startsWith(USER_KEY_PREFIX)) {
      return null;
    }
    const trimmed = key.substring(USER_KEY_PREFIX.length);
    const parts = trimmed.split(USER_KEY_FIELD_PREFIX);

    if (parts.length === 2) {
      return { userId: parts[0], field: parts[1] };
    }
    return null;
  }

  /**
   * getStringValue retrieves a string value from KV
   */
  async getStringValue(kv: any, key: string): Promise<string> {
    try {
      const val = await kv.get(key);
      return val ? new TextDecoder().decode(val.value) : '';
    } catch (error) {
      return '';
    }
  }

  /**
   * getBoolValue retrieves a boolean value from KV
   */
  async getBoolValue(kv: any, key: string): Promise<boolean> {
    const val = await this.getStringValue(kv, key);
    return val === 'true';
  }

  /**
   * getUint64Value retrieves a uint64 value from KV (as string for JS)
   */
  async getUint64Value(kv: any, key: string): Promise<string> {
    const val = await this.getStringValue(kv, key);
    if (!val) return '0';
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? '0' : parsed.toString();
  }

  // ============================================================================
  // Marshaling Helpers
  // ============================================================================

  marshalToProtoJson<T>(message: T, schema: any): string {
    return toJsonString(schema, message as any, {
      alwaysEmitImplicit: true,
      useProtoFieldName: true,
    });
  }

  marshalRoomMetadata(metadata: RoomMetadata): string {
    const metaWithId = create(RoomMetadataSchema, {
      ...metadata,
      metadataId: uuidv4(),
    });
    return this.marshalToProtoJson(metaWithId, RoomMetadataSchema);
  }

  unmarshalRoomMetadata(metadataJson: string): RoomMetadata {
    if (!metadataJson) return create(RoomMetadataSchema, {});
    return fromJsonString(RoomMetadataSchema, metadataJson, {
      ignoreUnknownFields: true,
    });
  }

  marshalUserMetadata(metadata: UserMetadata): string {
    const metaWithId = create(UserMetadataSchema, {
      ...metadata,
      metadataId: uuidv4(),
    });
    return this.marshalToProtoJson(metaWithId, UserMetadataSchema);
  }

  unmarshalUserMetadata(metadataJson: string): UserMetadata {
    if (!metadataJson) return create(UserMetadataSchema, {});
    return fromJsonString(UserMetadataSchema, metadataJson, {
      ignoreUnknownFields: true,
    });
  }

  // ============================================================================
  // Recorder Methods
  // ============================================================================

  /**
   * GetAllActiveRecorders retrieves all active recorders directly from the local cache.
   */
  getAllActiveRecorders(): any[] {
    // Defaulting to 8000ms from YAML config if not provided
    const pingTimeout = this.appConfig.nats.pingTimeout;
    return this.cacheService.getAllCachedActiveRecorders(pingTimeout);
  }

  /**
   * GetRecorderInfo retrieves a specific recorder's info directly from the local cache.
   */
  getRecorderInfo(recorderId: string): any | null {
    return this.cacheService.getCachedRecorderInfo(recorderId);
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getNatsConnection(): NatsConnection {
    return this.nc;
  }

  getJetStream(): JetStreamClient {
    return this.js;
  }

  getJetStreamManager(): JetStreamManager {
    return this.jsm;
  }

  getCacheService(): NatsCacheService {
    return this.cacheService;
  }

  getRoomStreamName(): string {
    return this.appConfig.nats.streamName;
  }
}
