/**
 * NATS Stream Service
 *
 * Handles NATS JetStream stream creation and deletion
 */

import { Injectable, Logger } from '@nestjs/common';
import { NatsService } from '@server/meet/infrastructure/nats/nats.service';
import { AppConfigService } from '@server/shared';

/**
 * NatsStreamService handles JetStream stream operations
 */
@Injectable()
export class NatsStreamService {
  private readonly logger = new Logger(NatsStreamService.name);

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly natsService: NatsService,
  ) {}

  /**
   * CreateRoomNatsStreams ensures subjects are ready for a room.
   * We purge subjects for this room to ensure a clean start if needed.
   */
  async createRoomNatsStreams(roomId: string): Promise<void> {
    this.logger.log(`Ensuring NATS subjects are clean for room: ${roomId}`);

    try {
      const jsm = this.natsService.getJetStreamManager();
      const streamName = this.natsService.getRoomStreamName();

      const sysPublic = this.appConfig.nats.subjects.systemPublic;
      const sysPrivate = this.appConfig.nats.subjects.systemPrivate;

      await jsm.streams
        .purge(streamName, {
          filter: `${sysPublic}.${roomId}.>`,
        })
        .catch(() => {});

      await jsm.streams
        .purge(streamName, {
          filter: `${sysPrivate}.${roomId}.>`,
        })
        .catch(() => {});

      this.logger.log(`NATS room subjects purged for: ${roomId}`);
    } catch (error) {
      this.logger.error(
        `Error during NATS room setup for ${roomId}: ${error.message}`,
      );
    }
  }

  /**
   * DeleteRoomNatsStream purges subjects for a room from the global stream.
   */
  async deleteRoomNatsStream(roomId: string): Promise<void> {
    this.logger.log(`Deleting/Purging NATS room subjects: ${roomId}`);

    try {
      const jsm = this.natsService.getJetStreamManager();
      const streamName = this.natsService.getRoomStreamName();

      const sysPublic = this.appConfig.nats.subjects.systemPublic;
      const sysPrivate = this.appConfig.nats.subjects.systemPrivate;

      await jsm.streams.purge(streamName, {
        filter: `${sysPublic}.${roomId}.>`,
      });

      await jsm.streams.purge(streamName, {
        filter: `${sysPrivate}.${roomId}.>`,
      });

      this.logger.log(`NATS room subjects deleted for: ${roomId}`);
    } catch (error) {
      this.logger.debug(
        `Error purging subjects for room ${roomId}: ${error.message}`,
      );
    }
  }

  /**
   * Create a JetStream consumer for a stream
   * Used by NATS auth callout to set up user permissions
   */
  async createConsumer(streamName: string, config: any): Promise<void> {
    try {
      const jsm = this.natsService.getJetStreamManager();

      // Check if consumer already exists
      const existingConsumer = await jsm.consumers
        .info(streamName, config.durable_name)
        .catch(() => null);

      if (existingConsumer) {
        // Update existing consumer
        this.logger.debug(
          `Updating consumer ${config.durable_name} in stream ${streamName}`,
        );
        // Note: NATS.js doesn't have direct update, we delete and recreate
        await jsm.consumers
          .delete(streamName, config.durable_name)
          .catch(() => {});
      }

      // Create consumer
      this.logger.debug(
        `Creating consumer ${config.durable_name} in stream ${streamName}`,
      );
      await jsm.consumers.add(streamName, config);
    } catch (error) {
      // Don't throw - just log warning, consumer will be created on first use
      this.logger.warn(
        `Error creating consumer ${config.durable_name}: ${error.message}`,
      );
    }
  }

  /**
   * Delete a JetStream consumer
   * Used when user disconnects
   */
  async deleteConsumer(
    streamName: string,
    consumerName: string,
  ): Promise<void> {
    try {
      const jsm = this.natsService.getJetStreamManager();
      await jsm.consumers.delete(streamName, consumerName);
      this.logger.debug(
        `Deleted consumer ${consumerName} from stream ${streamName}`,
      );
    } catch (error) {
      // Ignore if consumer doesn't exist
      this.logger.debug(
        `Consumer ${consumerName} not found in stream ${streamName}`,
      );
    }
  }
}
