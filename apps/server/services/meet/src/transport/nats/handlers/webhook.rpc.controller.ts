/**
 * Webhook Controller (Room-Service)
 *
 * Handles webhook events forwarded from gateway via NATS
 * Dispatches events to appropriate handlers
 */

import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { WebhookService } from '@server/meet/infrastructure/webhook/webhook.service';

/**
 * WebhookController handles NATS messages for webhook events
 */
@Controller()
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  /**
   * HandleWebhookEvent receives webhook events from gateway via NATS
   *
   * @pattern webhook.handle
   */
  @MessagePattern({ cmd: 'webhook.handle' })
  async handleWebhookEvent(@Payload() event: any): Promise<void> {
    if (!event || !event.event) {
      this.logger.warn('Received invalid webhook event');
      return;
    }

    this.logger.log(`Processing webhook event: ${event.event}`);

    // Dispatch to appropriate handler based on event type
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
      case 'room_created':
        // Internal event from room-service, not a LiveKit event
        // Ignore - already processed by room creation logic
        break;
      default:
        this.logger.warn(`Unknown webhook event type: ${event.event}`);
    }
  }
}

