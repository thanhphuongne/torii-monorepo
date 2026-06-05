/**
 * Webhook NATS Handler (Meet Service)
 *
 * Handles NATS event patterns for webhook operations
 */

import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { WebhookService } from '@server/meet/infrastructure/webhook/webhook.service';

/**
 * WebhookHandler processes LiveKit webhook events received via NATS
 */
@Controller()
export class WebhookHandler {
  private readonly logger = new Logger(WebhookHandler.name);

  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Handle webhook events (fire-and-forget from Gateway)
   *
   * @pattern webhook.handle
   */
  @EventPattern({ cmd: 'webhook.handle' })
  async handleWebhookEvent(@Payload() event: any): Promise<void> {
    this.logger.log(`Received webhook event: ${event.event}`);

    try {
      // Route to appropriate handler based on event type
      switch (event.event) {
        case 'room_started':
          await this.webhookService.roomStarted(event);
          break;
        case 'room_finished':
          await this.webhookService.roomFinished(event);
          break;
        case 'participant_joined':
          await this.webhookService.participantJoined(event);
          break;
        case 'participant_left':
          await this.webhookService.participantLeft(event);
          break;
        case 'track_published':
          await this.webhookService.trackPublished(event);
          break;
        case 'track_unpublished':
          await this.webhookService.trackUnpublished(event);
          break;
        default:
          this.logger.warn(`Unknown webhook event type: ${event.event}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process webhook event ${event.event}: ${error.message}`,
      );
      // Don't throw - this is fire-and-forget
    }
  }
}

