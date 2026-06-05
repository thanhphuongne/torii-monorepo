import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService, AppConfigService } from '@server/shared';
import { WebhookNotifier } from '@server/shared';
import type { CommonNotifyEvent } from '@workspace/protocol';
import { NatsService } from '@server/meet/infrastructure/nats/nats.service';
import {
  RedisWebhookService,
  WEBHOOK_CLEANUP_SUBJECT,
  WebhookData,
} from '@server/meet/infrastructure/redis/redis-webhook.service';

/**
 * WebhookNotifierService manages webhook notifications for room events
 *
 * Features:
 * - Per-room webhook queues (local to server instance)
 * - Clustered cleanup via NATS subscription
 * - Support for default and per-meeting webhooks
 * - Graceful shutdown with queue draining
 */
@Injectable()
export class WebhookNotifierService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('WebhookNotifier');

  // Configuration
  private readonly isEnabled: boolean;
  private readonly enabledForPerMeeting: boolean;
  private readonly defaultUrl: string;

  // Per-room notifiers (local to this server instance)
  private readonly notifiers = new Map<string, WebhookNotifier>();

  // Global abort controller for cleanup
  private readonly abortController = new AbortController();

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly natsService: NatsService,
    private readonly redisWebhookService: RedisWebhookService,
  ) {
    // Load configuration
    const { webhook } = this.appConfig;
    this.isEnabled = webhook.enabled;
    this.enabledForPerMeeting = webhook.perMeeting;
    this.defaultUrl = webhook.url || '';

    this.logger.log(
      `Webhook notifier initialized: enabled = ${this.isEnabled}, perMeeting = ${this.enabledForPerMeeting} `,
    );
  }

  /**
   * Initialize module - subscribe to cleanup broadcast
   */
  async onModuleInit() {
    if (!this.isEnabled) {
      this.logger.log('Webhook is disabled, skipping initialization');
      return;
    }

    // Subscribe to cleanup broadcast channel for clustered environments
    this.subscribeToCleanup();
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    this.logger.log('Shutting down webhook notifier...');
    this.abortController.abort();

    // Stop all notifiers
    for (const [roomId, notifier] of this.notifiers) {
      this.logger.log(`Stopping notifier for room: ${roomId} `);
      notifier.kill();
    }

    this.notifiers.clear();
    this.logger.log('Webhook notifier shutdown complete');
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * RegisterWebhook registers webhook URLs for a room
   */
  async registerWebhook(roomId: string, sid: string): Promise<void> {
    const log = this.logger;
    log.log(`Request to register webhook: room = ${roomId}, sid = ${sid} `);

    if (!this.isEnabled) {
      log.debug('Webhook is disabled, skipping registration');
      return;
    }

    if (!roomId) {
      log.warn('room_id is empty, skipping registration');
      return;
    }

    // Collect webhook URLs
    const urls: string[] = [];

    // Add default URL if configured
    if (this.defaultUrl) {
      urls.push(this.defaultUrl);
      log.debug(`Added default webhook url: ${this.defaultUrl} `);
    }

    // Add per-meeting URL if enabled
    if (this.enabledForPerMeeting) {
      const roomInfo = await this.getRoomInfoBySid(sid);
      if (roomInfo?.webhookUrl) {
        urls.push(roomInfo.webhookUrl);
        log.debug(`Added per - meeting webhook url: ${roomInfo.webhookUrl} `);
      }
    }

    if (urls.length < 1) {
      log.log('No webhook urls found to register');
      return;
    }

    log.log(`Found webhook urls to register: ${urls.join(', ')} `);

    const data: WebhookData = {
      urls,
      perform_deleting: false,
    };

    try {
      await this.saveData(roomId, data);
      log.log('Successfully registered webhook');
    } catch (error) {
      log.error(`Failed to save webhook data: ${error.message} `);
    }
  }

  /**
   * DeleteWebhook deletes webhook registration for a room
   */
  async deleteWebhook(roomId: string): Promise<void> {
    // Wait before cleanup to ensure all events are processed
    const maxWaitMs = this.appConfig.timeouts.waitAfterRoomEnded;
    await new Promise((resolve) => setTimeout(resolve, maxWaitMs));

    const data = await this.getData(roomId);
    if (!data) {
      // No webhook URL for this meeting
      return;
    }

    if (!data.perform_deleting) {
      // May be new session started for the same room
      return;
    }

    // Broadcast cleanup message to all servers in cluster
    try {
      const nc = this.natsService.getNatsConnection();
      if (nc) {
        // Publish to Redis/NATS cleanup subject
        await nc.publish(WEBHOOK_CLEANUP_SUBJECT, Buffer.from(roomId));
        this.logger.log(`Published webhook cleanup for room: ${roomId} `);
      } else {
        this.logger.warn(
          'NATS connection not available, skipping cleanup broadcast',
        );
      }
    } catch (error) {
      this.logger.error(`Failed to publish webhook cleanup: ${error.message} `);
    }

    // Delete webhook data from Redis
    try {
      await this.redisWebhookService.deleteWebhookData(roomId);
      this.logger.log(`Deleted webhook data for room: ${roomId} `);
    } catch (error) {
      this.logger.error(`Failed to delete webhook data: ${error.message} `);
    }
  }

  /**
   * SendWebhookEvent sends a webhook event to the room's queue
   */
  async sendWebhookEvent(event: CommonNotifyEvent): Promise<void> {
    if (!this.isEnabled || !event.room?.roomId) {
      return;
    }

    const roomId = event.room.roomId;
    const data = await this.getData(roomId);

    if (!data) {
      return;
    }

    // Handle room lifecycle events
    if (event.event === 'room_started' && data.perform_deleting) {
      // Reset deleting status if room restarted
      data.perform_deleting = false;
      try {
        await this.saveData(roomId, data);
      } catch (error) {
        this.logger.error(`Failed to save webhook data: ${error.message} `);
      }
    } else if (event.event === 'room_finished' && !data.perform_deleting) {
      // Mark for deletion when room finished
      data.perform_deleting = true;
      try {
        await this.saveData(roomId, data);
      } catch (error) {
        this.logger.error(`Failed to save webhook data: ${error.message} `);
      }
    }

    // Get or create dedicated notifier for this room
    const notifier = this.getOrCreateNotifier(roomId);

    // Add event to queue
    const { apiKey, apiSecret } = this.appConfig.security.wajlc;

    notifier.addInNotifyQueue(event, apiKey, apiSecret, data.urls);
    this.logger.debug(
      `Added event to webhook queue: room = ${roomId}, event = ${event.event} `,
    );
  }

  /**
   * ForceToPutInQueue sends a webhook event synchronously without queue
   *
   * Used for one-shot events outside normal room lifecycle
   */
  async forceToPutInQueue(event: CommonNotifyEvent): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    if (!event.room?.sid || !event.room?.roomId) {
      this.logger.error(`Empty room info for event: ${event.event} `);
      return;
    }

    // Collect webhook URLs
    const urls: string[] = [];

    if (this.defaultUrl) {
      urls.push(this.defaultUrl);
    }

    if (this.enabledForPerMeeting) {
      const roomInfo = await this.getRoomInfoBySid(event.room.sid);
      if (roomInfo?.webhookUrl) {
        urls.push(roomInfo.webhookUrl);
      }
    }

    if (urls.length < 1) {
      return;
    }

    // Create temporary notifier for this one-shot event
    const { apiKey, apiSecret } = this.appConfig.security.wajlc;
    const queueSize = this.appConfig.webhook.defaultQueueSize;

    const notifier = new WebhookNotifier(queueSize, this.logger);
    notifier.addInNotifyQueue(event, apiKey, apiSecret, urls);
    await notifier.stopGracefully();

    this.logger.log(`Force - sent webhook event: ${event.event} `);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Subscribe to cleanup broadcast channel
   */
  private subscribeToCleanup(): void {
    const nc = this.natsService.getNatsConnection();

    if (!nc) {
      this.logger.warn(
        'NATS connection not ready yet, will skip webhook cleanup subscription',
      );
      return;
    }

    // Subscribe to cleanup subject
    nc.subscribe(WEBHOOK_CLEANUP_SUBJECT, {
      callback: (err, msg) => {
        if (err) {
          this.logger.error(
            `Error in webhook cleanup subscription: ${err.message} `,
          );
          return;
        }
        const roomId = new TextDecoder().decode(msg.data);
        this.logger.log(`Received webhook cleanup signal: ${roomId} `);
        this.cleanupNotifier(roomId);
      },
    });

    this.logger.log(
      `Subscribed to webhook cleanup channel: ${WEBHOOK_CLEANUP_SUBJECT} `,
    );
  }

  /**
   * Get or create notifier for a room
   */
  private getOrCreateNotifier(roomId: string): WebhookNotifier {
    if (this.notifiers.has(roomId)) {
      return this.notifiers.get(roomId)!;
    }

    // Create new notifier for this room
    const queueSize = this.appConfig.webhook.defaultQueueSize;

    const notifier = new WebhookNotifier(queueSize, this.logger);

    this.notifiers.set(roomId, notifier);
    this.logger.log(`Created new webhook queue for room: ${roomId} `);

    return notifier;
  }

  /**
   * Cleanup notifier for a room
   */
  private cleanupNotifier(roomId: string): void {
    const notifier = this.notifiers.get(roomId);
    if (notifier) {
      notifier.kill();
      this.notifiers.delete(roomId);
      this.logger.log(`Cleaned up webhook queue for room: ${roomId} `);
    }
  }

  /**
   * Save webhook data to Redis
   */
  private async saveData(roomId: string, data: WebhookData): Promise<void> {
    const marshal = JSON.stringify(data);
    // [MIGRATED] Use Redis instead of NATS
    await this.redisWebhookService.addWebhookData(roomId, Buffer.from(marshal));
    this.logger.debug(`Saved webhook data for room: ${roomId} `);
  }

  /**
   * Get webhook data from Redis
   */
  private async getData(roomId: string): Promise<WebhookData | null> {
    // [MIGRATED] Use Redis instead of NATS
    const data = await this.redisWebhookService.getWebhookData(roomId);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data.toString()) as WebhookData;
    } catch (error) {
      this.logger.error(
        `Failed to parse webhook data for room ${roomId}: ${error.message} `,
      );
      return null;
    }
  }

  /**
   * Get room info by SID from database
   * Helper method for fetching webhook URL
   */
  private async getRoomInfoBySid(
    sid: string,
  ): Promise<{ webhookUrl: string } | null> {
    try {
      const roomInfo = await this.prisma.roomInfo.findUnique({
        where: { sid },
        select: { webhookUrl: true },
      });
      return roomInfo;
    } catch (error) {
      this.logger.error(`Failed to get room info by SID: ${error.message} `);
      return null;
    }
  }
}
