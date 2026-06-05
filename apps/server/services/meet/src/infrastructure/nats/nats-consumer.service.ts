/**
 * NATS Consumer Service
 *
 * Creates JetStream consumers for different subject types and returns permissions
 */

import { Injectable, Logger } from '@nestjs/common';
import { NatsStreamService } from '@server/meet/infrastructure/nats/nats-stream.service';
import { NatsService } from '@server/meet/infrastructure/nats/nats.service';
import { AppConfigService } from '@server/shared';

@Injectable()
export class NatsConsumerService {
  private readonly logger = new Logger(NatsConsumerService.name);

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly streamService: NatsStreamService,
    private readonly natsService: NatsService,
  ) {}

  /**
   * CreateUserConsumer creates a single consumer per user for public and private system messages.
   */
  async createUserConsumer(roomId: string, userId: string): Promise<string[]> {
    const streamName = this.natsService.getRoomStreamName();
    const durableName = `${roomId}_${userId}`;

    const sysPublic = this.appConfig.nats.subjects.systemPublic;
    const sysPrivate = this.appConfig.nats.subjects.systemPrivate;

    try {
      // Create or update consumer
      await this.streamService.createConsumer(streamName, {
        durable_name: durableName,
        deliver_policy: 'new', // DeliverNew
        filter_subjects: [
          `${sysPublic}.${roomId}.>`,
          `${sysPrivate}.${roomId}.${userId}.>`,
        ],
      });

      // Return permission strings that will be added to user's NATS permissions
      return [
        `$JS.API.CONSUMER.INFO.${streamName}.${durableName}`,
        `$JS.API.CONSUMER.MSG.NEXT.${streamName}.${durableName}`,
        `$JS.ACK.${streamName}.${durableName}.>`,
      ];
    } catch (error) {
      this.logger.error(
        `Error creating user consumer for ${userId} in ${roomId}:`,
        error,
      );
      return [
        `$JS.API.CONSUMER.INFO.${streamName}.${durableName}`,
        `$JS.API.CONSUMER.MSG.NEXT.${streamName}.${durableName}`,
        `$JS.ACK.${streamName}.${durableName}.>`,
      ];
    }
  }

  /**
   * Delete consumer for a user
   */
  async deleteConsumer(roomId: string, userId: string): Promise<void> {
    const streamName = this.natsService.getRoomStreamName();
    const durableName = `${roomId}_${userId}`;

    try {
      await this.streamService.deleteConsumer(streamName, durableName);
      this.logger.log(
        `Deleted consumer ${durableName} from stream ${streamName}`,
      );
    } catch (error) {
      // Ignore errors during deletion
    }
  }
}
